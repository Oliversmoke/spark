"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { useThemeNetwork } from "@/app/components/theme-network-provider";
import type { BuiltInGame } from "@/lib/games/config";
import {
  getBuiltinQuizClientMeta,
  isBuiltinQuizClientId,
} from "@/lib/games/builtinQuizClientMeta";

type LeaderRow = { id: string; walletAddress: string; bestScore: number; bestPoints: number };

function shortAddr(a: string) {
  if (a.length <= 10) return a;
  return `${a.slice(0, 4)}…${a.slice(-4)}`;
}

type QuizQuestion = { prompt: string; choices: string[] };

export function DevQuizClient({ game }: { game: BuiltInGame }) {
  const { cluster } = useThemeNetwork();
  const qr = useMemo(
    () => (isBuiltinQuizClientId(game.id) ? getBuiltinQuizClientMeta(game.id) : null),
    [game.id],
  );
  const qTotal = qr?.questionCount ?? 20;

  const [balance, setBalance] = useState<number | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const defaultStake = game.defaultStakeUnits ?? game.minStakeUnits;
  const [stakeUnits, setStakeUnits] = useState(defaultStake);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [quizQs, setQuizQs] = useState<QuizQuestion[] | null>(null);
  const [answers, setAnswers] = useState<number[]>(() => Array.from({ length: 20 }, () => -1));
  const [cursor, setCursor] = useState(0);
  const [deadlineMs, setDeadlineMs] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const submittingRef = useRef(false);

  const allowed = game.availableClusters.includes(cluster);

  async function refresh() {
    const [b, lb] = await Promise.all([
      fetch(`/api/gamepass/balance?cluster=${cluster}`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/games/leaderboard?cluster=${cluster}&gameId=${game.id}`).then((r) => (r.ok ? r.json() : null)),
    ]);
    if (b?.units != null) setBalance(Number(b.units));
    setLeaderboard(Array.isArray(lb?.items) ? (lb.items as LeaderRow[]) : []);
  }

  useEffect(() => {
    refresh().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cluster, game.id]);

  /** `null` = no active countdown (lobby). Never fake a full 5:00 when deadline is unset. */
  const remainingMs = useMemo(() => {
    if (deadlineMs == null) return null;
    return Math.max(0, deadlineMs - now);
  }, [deadlineMs, now]);

  useEffect(() => {
    if (!deadlineMs) return;
    const t = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(t);
  }, [deadlineMs]);

  async function submitAnswers(payload: number[]) {
    const sid = sessionId;
    if (!sid) return;
    if (submittingRef.current) return;
    submittingRef.current = true;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/games/session/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          cluster,
          sessionId: sid,
          quizAnswers: payload,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const parts = [json?.error, json?.reason].filter(Boolean);
        let err = parts.length ? parts.join(": ") : "Submit failed";
        if (json?.hint) err += `. ${json.hint}`;
        if (json?.debug) err += ` ${JSON.stringify(json.debug)}`;
        throw new Error(err);
      }
      setMsg(
        `Round complete — ${json.correctCount ?? "?"}/${qTotal} correct · +${json.rewardUnits ?? 0} GP`,
      );
      setDeadlineMs(null);
      setSessionId(null);
      setQuizQs(null);
      setCursor(0);
      setAnswers(Array.from({ length: qTotal }, () => -1));
      await refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
      /* Keep server-aligned deadline — do not replace with a short window (felt like “time dropped to seconds”). */
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
  }

  useEffect(() => {
    if (deadlineMs == null || remainingMs == null || !sessionId || !quizQs) return;
    if (remainingMs > 0) return;
    void submitAnswers([...answersRef.current]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingMs, deadlineMs, sessionId, quizQs]);

  async function startQuiz() {
    setBusy(true);
    setMsg(null);
    try {
      const stake = Math.min(game.maxStakeUnits, Math.max(game.minStakeUnits, Math.floor(stakeUnits)));
      const res = await fetch("/api/games/session/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cluster, gameId: game.id, stakeUnits: stake }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (json?.error === "dev_quiz_not_seeded" || json?.error === "builtin_quiz_not_seeded") {
          const hint =
            typeof json?.hint === "string"
              ? json.hint
              : "npm run seed:dev-quiz, seed:design-quiz, seed:cyber-quiz, or seed:analytics-quiz";
          throw new Error(
            `Quiz questions are not in the database yet (${json.have ?? "?"}/${json.need ?? "10000"} rows). Ask your admin to run: ${hint}`,
          );
        }
        throw new Error(typeof json?.error === "string" ? json.error : "Failed to start session");
      }

      const qs = (json?.quiz?.questions ?? json?.devQuiz?.questions) as QuizQuestion[] | undefined;
      if (!Array.isArray(qs) || qs.length !== qTotal) {
        throw new Error("Quiz payload missing");
      }

      if (!qr) throw new Error("Quiz configuration missing");

      setStakeUnits(stake);
      setSessionId(json.session.id as string);
      setQuizQs(qs);
      setAnswers(Array.from({ length: qr.questionCount }, () => -1));
      setCursor(0);
      const startedAt = new Date(json.session.startedAt as string).getTime();
      setDeadlineMs(startedAt + qr.timeLimitMs);
      setNow(Date.now());
      await refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function choose(choiceIdx: number) {
    if (!quizQs || busy) return;
    const nextAnswers = [...answersRef.current];
    nextAnswers[cursor] = choiceIdx;
    setAnswers(nextAnswers);
    if (cursor >= qTotal - 1) {
      void submitAnswers(nextAnswers);
      return;
    }
    setCursor((c) => c + 1);
  }

  const mm = remainingMs == null ? 0 : Math.floor(remainingMs / 60000);
  const ss = remainingMs == null ? 0 : Math.floor((remainingMs % 60000) / 1000);
  const timerLabel =
    remainingMs == null ? "—:—" : `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;

  const current = quizQs?.[cursor];

  if (!qr) {
    return (
      <div className="space-y-4 rounded border border-border-low bg-card p-6">
        <p className="text-sm text-muted">This route is not configured as a built-in quiz.</p>
        <Link href="/play" className="text-sm font-semibold text-foreground underline">
          Back to Play
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">Play</p>
        <h1 className="text-3xl font-semibold tracking-tight">{game.title}</h1>
        <p className="max-w-3xl text-base leading-relaxed text-muted">{game.summary}</p>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-cream px-3 py-1 text-xs font-semibold text-foreground/80">
            Stake · {game.minStakeUnits}–{game.maxStakeUnits.toLocaleString()} GP
          </span>
          <span className="rounded-full border border-border-low bg-card px-3 py-1 text-xs font-semibold text-muted">
            Cluster: {cluster}
          </span>
          <span className="rounded-full border border-border-low bg-card px-3 py-1 text-xs font-semibold text-muted">
            Balance: {balance == null ? "—" : `${balance.toLocaleString()} GP`}
          </span>
        </div>
      </header>

      {!allowed ? (
        <div className="rounded border border-border-low bg-cream px-4 py-4">
          <div className="text-sm font-semibold text-foreground">Not available on {cluster}</div>
          <div className="mt-1 text-sm text-muted">Switch clusters to play this game.</div>
        </div>
      ) : null}

      <div className="rounded border border-border-low bg-card p-4 shadow-[0_18px_70px_-55px_rgba(0,0,0,0.45)]">
        {!quizQs ? (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-2">
                <div className="text-sm font-semibold text-foreground">Choose your stake</div>
                <p className="text-sm text-muted">
                  Rewards scale with stake. A perfect run pays up to{" "}
                  <span className="font-semibold text-foreground">1.4×</span> your GP in rewards (linear per correct
                  answer).
                </p>
              </div>
              <div className="flex w-full flex-col gap-2 sm:max-w-xs">
                <label className="text-xs font-semibold text-muted" htmlFor="quiz-stake">
                  GP stake ({game.minStakeUnits}–{game.maxStakeUnits.toLocaleString()})
                </label>
                <input
                  id="quiz-stake"
                  type="number"
                  min={game.minStakeUnits}
                  max={game.maxStakeUnits}
                  value={stakeUnits}
                  onChange={(e) => setStakeUnits(Number(e.target.value))}
                  className="h-11 w-full rounded border border-border-low bg-bg1 px-3 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-cream/70"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => startQuiz()}
              disabled={!allowed || busy}
              className="w-full rounded bg-foreground px-4 py-3 text-sm font-semibold text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {busy ? "Starting…" : `Stake ${Math.min(game.maxStakeUnits, Math.max(game.minStakeUnits, Math.floor(stakeUnits))).toLocaleString()} GP & start quiz`}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm font-semibold">
                Question{" "}
                <span className="text-foreground">
                  {cursor + 1}/{qTotal}
                </span>
              </div>
              <div
                className={[
                  "rounded-full border px-3 py-1 text-xs font-semibold tabular-nums",
                  remainingMs != null && remainingMs < 30_000 && remainingMs > 0
                    ? "border-primary/40 bg-cream text-foreground"
                    : "border-border-low bg-card text-muted",
                ].join(" ")}
              >
                ⏱ {timerLabel}
              </div>
            </div>

            <div className="h-1.5 w-full overflow-hidden rounded-full bg-border-low">
              <div
                className="h-full rounded-full bg-foreground/85 transition-[width] duration-300 ease-out"
                style={{ width: `${((cursor + 1) / qTotal) * 100}%` }}
              />
            </div>

            <div className="rounded border border-border-low bg-bg1/80 p-4">
              <div className="text-base font-semibold leading-snug">{current?.prompt}</div>
              <div className="mt-4 grid gap-2">
                {current?.choices.map((c, i) => (
                  <button
                    key={`${cursor}-${i}`}
                    type="button"
                    disabled={busy}
                    onClick={() => choose(i)}
                    className="rounded border border-border-low bg-card px-4 py-3 text-left text-sm font-semibold text-foreground transition hover:border-primary/40 hover:bg-cream/40 disabled:opacity-60"
                  >
                    <span className="mr-2 inline-flex size-6 items-center justify-center rounded bg-cream text-xs font-semibold text-foreground/80">
                      {String.fromCharCode(65 + i)}
                    </span>
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                disabled={busy || cursor <= 0}
                onClick={() => setCursor((c) => Math.max(0, c - 1))}
                className="rounded border border-border-low bg-card px-4 py-2 text-xs font-semibold text-muted transition hover:bg-cream/60 hover:text-foreground disabled:opacity-40"
              >
                Back
              </button>
              <Link href="/play" className="text-xs font-semibold text-muted hover:text-foreground hover:underline">
                Leave (lose stake)
              </Link>
            </div>
          </div>
        )}

        {msg ? (
          <div className="mt-4 space-y-2 rounded border border-border-low bg-cream px-4 py-3 text-sm">
            <div>{msg}</div>
            {sessionId && quizQs ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void submitAnswers([...answersRef.current])}
                className="rounded border border-border-low bg-card px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-cream/80 disabled:opacity-50"
              >
                Retry submit
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="rounded border border-border-low bg-card p-5">
        <p className="text-base font-semibold">Leaderboard</p>
        {leaderboard.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No scores yet.</p>
        ) : (
          <div className="mt-4 divide-y divide-border-low">
            {leaderboard.map((r, idx) => (
              <div key={r.id} className="flex items-center justify-between gap-4 py-3">
                <div className="text-sm font-semibold">
                  #{idx + 1} <span className="text-muted">{shortAddr(r.walletAddress)}</span>
                </div>
                <div className="rounded bg-cream px-3 py-1 text-xs font-semibold text-foreground/80">{r.bestScore}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
