import { randomInt } from "crypto";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { getSessionUserActive } from "@/lib/auth/session";
import { userClusterKey, withUserClusterLock } from "@/lib/concurrency/userClusterLock";
import { connectDb } from "@/lib/db";
import { getBuiltInGame } from "@/lib/games/config";
import { getBuiltinQuizRuntime, isBuiltinQuizId } from "@/lib/games/quizRegistry";
import { getGamePassBalance } from "@/lib/gamepass/ledger";
import { GamePassLedgerModel } from "@/lib/models/GamePassLedger";
import { GameSessionModel } from "@/lib/models/GameSession";
import { getClientIp, rateLimitCheck, rateLimitHeaders } from "@/lib/rateLimit";

export const runtime = "nodejs";

function builtinQuizSeedHint(gameId: string): string {
  switch (gameId) {
    case "dev-sprint-quiz":
      return "Run `npm run seed:dev-quiz` against this database.";
    case "design-sprint-quiz":
      return "Run `npm run seed:design-quiz` against this database.";
    case "cyber-sprint-quiz":
      return "Run `npm run seed:cyber-quiz` against this database.";
    case "analytics-sprint-quiz":
      return "Run `npm run seed:analytics-quiz` against this database.";
    default:
      return "Run the matching `npm run seed:*-quiz` script against this database.";
  }
}

function pickUniqueQuizNums(poolSize: number, count: number): number[] {
  const picked = new Set<number>();
  while (picked.size < count) {
    picked.add(randomInt(0, poolSize));
  }
  return [...picked];
}

export async function POST(req: Request) {
  const session = await getSessionUserActive();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const cluster = body?.cluster;
  const gameId = body?.gameId;

  if (cluster !== "devnet" && cluster !== "mainnet-beta") {
    return NextResponse.json({ error: "cluster required" }, { status: 400 });
  }
  if (typeof gameId !== "string") {
    return NextResponse.json({ error: "gameId required" }, { status: 400 });
  }

  const game = getBuiltInGame(gameId);
  if (!game) return NextResponse.json({ error: "game_not_found" }, { status: 404 });
  if (!game.availableClusters.includes(cluster)) {
    return NextResponse.json({ error: "game_not_available_on_cluster" }, { status: 400 });
  }

  const ip = getClientIp(req);
  const rlIp = rateLimitCheck(`games:session:start:ip:${ip}`, 180, 60 * 60 * 1000);
  if (!rlIp.ok) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: rateLimitHeaders(rlIp.retryAfterSec) },
    );
  }
  const rlUser = rateLimitCheck(`games:session:start:user:${session.userId}:${cluster}`, 120, 60 * 60 * 1000);
  if (!rlUser.ok) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: rateLimitHeaders(rlUser.retryAfterSec) },
    );
  }

  const defaultStake = game.defaultStakeUnits ?? game.minStakeUnits;
  const stakeRaw = body?.stakeUnits;
  let stakeUnits =
    typeof stakeRaw === "number" && Number.isFinite(stakeRaw)
      ? Math.floor(stakeRaw)
      : defaultStake;
  stakeUnits = Math.min(game.maxStakeUnits, Math.max(game.minStakeUnits, stakeUnits));

  return withUserClusterLock(userClusterKey(session.userId, cluster), async () => {
    await connectDb();
    const balance = await getGamePassBalance({ userId: session.userId, cluster });
    if (balance < stakeUnits) {
      return NextResponse.json(
        { error: "insufficient_gamepass", balance, stakeUnits, minStakeUnits: game.minStakeUnits },
        { status: 400 },
      );
    }

    let quizQuestionIds: string[] | undefined;
    let builtinQuizPayload: { questions: { prompt: string; choices: string[] }[] } | undefined;

    if (isBuiltinQuizId(game.id)) {
      const qr = getBuiltinQuizRuntime(game.id);
      const poolCount = await qr.QuestionModel.countDocuments();
      if (poolCount < qr.poolSize) {
        return NextResponse.json(
          {
            error: "builtin_quiz_not_seeded",
            gameId: game.id,
            have: poolCount,
            need: qr.poolSize,
            hint: builtinQuizSeedHint(game.id),
          },
          { status: 503 },
        );
      }

      const nums = pickUniqueQuizNums(qr.poolSize, qr.questionCount);
      type BuiltinQuizDocLean = {
        _id: mongoose.Types.ObjectId;
        num: number;
        prompt: string;
        choices: string[];
      };
      const docs = (await qr.QuestionModel.find({ num: { $in: nums } })
        .select({ _id: 1, num: 1, prompt: 1, choices: 1 })
        .lean()) as BuiltinQuizDocLean[];

      const byNum = new Map(docs.map((d) => [d.num, d]));
      const ordered = nums
        .map((n) => byNum.get(n))
        .filter((row): row is (typeof docs)[number] => row != null);

      if (ordered.length !== qr.questionCount) {
        return NextResponse.json(
          {
            error: "builtin_quiz_not_seeded",
            gameId: game.id,
            detail: "could_not_resolve_question_batch",
          },
          { status: 503 },
        );
      }

      quizQuestionIds = ordered.map((d) => {
        const id = d._id as unknown;
        if (id instanceof mongoose.Types.ObjectId) return id.toHexString();
        if (typeof id === "string" && /^[a-fA-F0-9]{24}$/.test(id.trim())) return id.trim();
        return String(id);
      });
      builtinQuizPayload = {
        questions: ordered.map((d) => ({
          prompt: d.prompt,
          choices: [...d.choices] as string[],
        })),
      };
    }

    await GamePassLedgerModel.create({
      userId: session.userId,
      walletAddress: session.walletAddress,
      cluster,
      kind: "debit_spend",
      units: -stakeUnits,
      reason: `Game entry: ${game.title} (${stakeUnits} GP)`,
    });

    const hasQuizIds =
      quizQuestionIds &&
      isBuiltinQuizId(game.id) &&
      quizQuestionIds.length === getBuiltinQuizRuntime(game.id).questionCount;

    const s = await GameSessionModel.create({
      userId: session.userId,
      walletAddress: session.walletAddress,
      cluster,
      gameId: game.id,
      entryFeeUnits: stakeUnits,
      status: "started",
      ...(hasQuizIds ? { quizQuestionIds } : {}),
    });

    if (hasQuizIds && quizQuestionIds) {
      await GameSessionModel.collection.updateOne(
        { _id: s._id },
        { $set: { quizQuestionIds } },
      );
    }

    const payload: {
      ok: true;
      session: {
        id: string;
        gameId: string;
        cluster: typeof cluster;
        stakeUnits: number;
        startedAt: string;
      };
      quiz?: { questions: { prompt: string; choices: string[] }[] };
      /** @deprecated Use `quiz`; kept for older clients. */
      devQuiz?: { questions: { prompt: string; choices: string[] }[] };
    } = {
      ok: true,
      session: {
        id: s._id.toString(),
        gameId: s.gameId,
        cluster,
        stakeUnits: s.entryFeeUnits,
        startedAt: s.startedAt.toISOString(),
      },
    };

    if (isBuiltinQuizId(game.id) && builtinQuizPayload) {
      payload.quiz = builtinQuizPayload;
      payload.devQuiz = builtinQuizPayload;
    }

    return NextResponse.json(payload);
  });
}
