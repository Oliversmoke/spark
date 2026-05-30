import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { getSessionUserActive } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import { finalizeBuiltInGameSessionSubmit } from "@/lib/games/finalizeGameSessionSubmit";
import {
  DEV_QUIZ_POOL_SIZE,
  DEV_QUIZ_QUESTION_COUNT,
  gradeDevQuiz,
} from "@/lib/games/dev-quiz/pool";
import {
  calcDevQuizRewardUnits,
  calcQuizLeaderboardScore,
  calcScaledSkillRewardUnits,
  getBuiltInGame,
  type BuiltInGameId,
} from "@/lib/games/config";
import { getBuiltinQuizRuntime, isBuiltinQuizId } from "@/lib/games/quizRegistry";
import { getClientIp, rateLimitCheck, rateLimitHeaders } from "@/lib/rateLimit";
import { GameSessionModel } from "@/lib/models/GameSession";

export const runtime = "nodejs";

function isHexObjectIdString(id: string) {
  return /^[a-fA-F0-9]{24}$/.test(id);
}

/** BSON arrays often contain ObjectId instances — normalize without fragile String(ObjectId) edge cases. */
function bsonValueToHexObjectId(x: unknown): string | null {
  if (typeof x === "string") {
    const t = x.trim();
    return isHexObjectIdString(t) ? t : null;
  }
  if (x instanceof mongoose.Types.ObjectId) return x.toHexString();
  if (x != null && typeof x === "object") {
    const oid = (x as { $oid?: unknown }).$oid;
    if (typeof oid === "string" && isHexObjectIdString(oid.trim())) return oid.trim();
    const toHex = (x as { toHexString?: () => string }).toHexString;
    if (typeof toHex === "function") {
      try {
        const h = toHex.call(x);
        return typeof h === "string" && isHexObjectIdString(h) ? h : null;
      } catch {
        /* ignore */
      }
    }
  }
  return null;
}

function normalizeMongoQuizIds(raw: unknown, questionCount: number): string[] | null {
  if (!Array.isArray(raw) || raw.length !== questionCount) return null;
  const ids: string[] = [];
  for (const x of raw) {
    const h = bsonValueToHexObjectId(x);
    if (!h) return null;
    ids.push(h);
  }
  return ids;
}

function isLegacyQuizPick(raw: unknown): raw is number[] {
  if (!Array.isArray(raw) || raw.length !== DEV_QUIZ_QUESTION_COUNT) return false;
  return raw.every(
    (n) => typeof n === "number" && Number.isInteger(n) && n >= 0 && n < DEV_QUIZ_POOL_SIZE,
  );
}

function gradeDevQuizFromDb(
  questionIdsOrdered: string[],
  answers: readonly number[],
  docs: { _id: mongoose.Types.ObjectId; correctIndex: number }[],
): number {
  const byId = new Map(docs.map((d) => [String(d._id), d]));
  let correct = 0;
  for (let i = 0; i < questionIdsOrdered.length; i++) {
    const doc = byId.get(questionIdsOrdered[i]!);
    const a = answers[i];
    if (!doc || typeof a !== "number" || !Number.isInteger(a) || a < 0 || a > 3) continue;
    if (a === doc.correctIndex) correct += 1;
  }
  return correct;
}

export async function POST(req: Request) {
  const session = await getSessionUserActive();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const cluster = body?.cluster;
  const sessionId = body?.sessionId;

  if (cluster !== "devnet" && cluster !== "mainnet-beta") {
    return NextResponse.json({ error: "cluster required" }, { status: 400 });
  }
  if (typeof sessionId !== "string") {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  const ip = getClientIp(req);
  const rlIp = rateLimitCheck(`games:session:submit:ip:${ip}`, 180, 60 * 60 * 1000);
  if (!rlIp.ok) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: rateLimitHeaders(rlIp.retryAfterSec) },
    );
  }
  const rlUser = rateLimitCheck(`games:session:submit:user:${session.userId}:${cluster}`, 100, 60 * 60 * 1000);
  if (!rlUser.ok) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: rateLimitHeaders(rlUser.retryAfterSec) },
    );
  }

  await connectDb();
  const s = await GameSessionModel.findById(sessionId);
  if (!s) return NextResponse.json({ error: "session_not_found" }, { status: 404 });
  if (s.userId !== session.userId) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (s.cluster !== cluster) return NextResponse.json({ error: "cluster_mismatch" }, { status: 400 });
  if (s.status !== "started") return NextResponse.json({ error: "already_submitted" }, { status: 400 });

  const game = getBuiltInGame(s.gameId);
  if (!game) return NextResponse.json({ error: "game_not_found" }, { status: 404 });

  const isQuiz = isBuiltinQuizId(s.gameId);

  if (isQuiz) {
    const qr = getBuiltinQuizRuntime(s.gameId);
    const answers = body?.quizAnswers;
    if (!Array.isArray(answers) || answers.length !== qr.questionCount) {
      return NextResponse.json({ error: "quiz_answers_required" }, { status: 400 });
    }

    const rawQuizRow = await GameSessionModel.collection.findOne(
      { _id: s._id },
      { projection: { quizQuestionIds: 1, quizPick: 1 } },
    );

    let mongoIds = normalizeMongoQuizIds(rawQuizRow?.quizQuestionIds, qr.questionCount);
    let poolIndices: number[] | null = null;

    if (!mongoIds && s.gameId === "dev-sprint-quiz" && isLegacyQuizPick(rawQuizRow?.quizPick)) {
      poolIndices = rawQuizRow.quizPick;
    }

    if (!mongoIds && !poolIndices) {
      const qRaw = rawQuizRow?.quizQuestionIds;
      return NextResponse.json(
        {
          error: "quiz_session_invalid",
          reason: "missing_question_refs",
          hint: "Start a new quiz round after deploying the quiz-session schema fix.",
          debug:
            process.env.NODE_ENV !== "production"
              ? {
                  quizQuestionIdsKind: qRaw == null ? "nullish" : Array.isArray(qRaw) ? "array" : typeof qRaw,
                  quizQuestionIdsLength: Array.isArray(qRaw) ? qRaw.length : null,
                }
              : undefined,
        },
        { status: 400 },
      );
    }

    const elapsedMs = Date.now() - new Date(s.startedAt).getTime();
    if (elapsedMs > qr.timeLimitMs + 15_000) {
      return NextResponse.json({ error: "quiz_time_exceeded" }, { status: 400 });
    }

    let correctCount: number;
    if (mongoIds) {
      const oids = mongoIds.map((id) => new mongoose.Types.ObjectId(id));
      const docs = await qr.QuestionModel.find({ _id: { $in: oids } })
        .select({ _id: 1, correctIndex: 1 })
        .lean();
      correctCount = gradeDevQuizFromDb(mongoIds, answers as number[], docs);
    } else {
      correctCount = gradeDevQuiz(poolIndices!, answers as number[]);
    }

    const stake = s.entryFeeUnits;
    const rewardUnits = calcDevQuizRewardUnits({
      stakeUnits: stake,
      correctCount,
      game,
    });

    const leaderboardScore = calcQuizLeaderboardScore({
      correctCount,
      elapsedMs,
      timeLimitMs: qr.timeLimitMs,
    });

    const clampedScore = Math.min(Math.floor(leaderboardScore), game.maxClaimScore);
    const clampedPoints = Math.min(Math.floor(leaderboardScore), game.maxClaimPoints);

    const finalized = await finalizeBuiltInGameSessionSubmit({
      sessionObjectId: s._id,
      userId: session.userId,
      walletAddress: session.walletAddress,
      cluster,
      gameId: s.gameId,
      rewardUnitsRaw: rewardUnits,
      clampedScore,
      clampedPoints,
      ledgerReason: `Reward: ${game.title} (${correctCount}/${qr.questionCount} correct · stake ${stake} GP)`,
    });
    if (!finalized.ok) {
      return NextResponse.json({ error: "already_submitted" }, { status: 400 });
    }

    return NextResponse.json({ ok: true, rewardUnits: finalized.rewardUnits, correctCount });
  }

  const score = body?.score;
  const points = body?.points;

  if (typeof score !== "number" || !Number.isFinite(score) || score < 0) {
    return NextResponse.json({ error: "score must be a non-negative number" }, { status: 400 });
  }
  if (typeof points !== "number" || !Number.isFinite(points) || points < 0) {
    return NextResponse.json({ error: "points must be a non-negative number" }, { status: 400 });
  }

  const clampedScore = Math.min(Math.floor(score), game.maxClaimScore);
  const clampedPoints = Math.min(Math.floor(points), game.maxClaimPoints);

  const rewardUnits = calcScaledSkillRewardUnits({
    gameId: s.gameId as BuiltInGameId,
    score: clampedScore,
    stakeUnits: s.entryFeeUnits,
  });

  const finalizedSkill = await finalizeBuiltInGameSessionSubmit({
    sessionObjectId: s._id,
    userId: session.userId,
    walletAddress: session.walletAddress,
    cluster,
    gameId: s.gameId,
    rewardUnitsRaw: rewardUnits,
    clampedScore,
    clampedPoints,
    ledgerReason: `Reward: ${game.title} (score ${clampedScore} · stake ${s.entryFeeUnits} GP)`,
  });
  if (!finalizedSkill.ok) {
    return NextResponse.json({ error: "already_submitted" }, { status: 400 });
  }

  return NextResponse.json({ ok: true, rewardUnits: finalizedSkill.rewardUnits });
}
