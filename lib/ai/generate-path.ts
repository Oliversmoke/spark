import { GOAL_TEMPLATES } from "@/lib/templates";
import { assignPathIds } from "@/lib/path-utils";
import { PathSchema, type Path } from "@/types";
import { z } from "zod";

import { GEMINI_MODEL } from "@/lib/ai/config";

const PATH_SYSTEM = `You are ComeBack.ai, an expert habit and skill coach. Turn the user's goal into a structured path.
Rules:
- 2-5 phases, each with 1-3 checkpoints
- Each checkpoint: 3-7 tasks, frequency daily|weekly|custom
- Include at least one task ≤15 min per checkpoint (isMinimumViable: true)
- Realistic timelines
Output ONLY valid JSON: { "title", "durationWeeks", "phases": [{ "name", "checkpoints": [{ "title", "criteria", "dueInDays", "tasks": [{ "title", "frequency", "durationMin", "isMinimumViable"? }] }] }] }`;

export type GeneratePathResult =
  | { ok: true; path: Path; source: "ai" | "template" }
  | { ok: false; error: string; retryable: boolean };

type RawPath = {
  title?: string;
  durationWeeks?: number;
  phases?: Array<{
    name: string;
    checkpoints?: Array<{
      title: string;
      criteria: string;
      dueInDays?: number;
      tasks?: Array<{
        title: string;
        frequency?: "daily" | "weekly" | "custom";
        durationMin?: number;
        isMinimumViable?: boolean;
      }>;
    }>;
  }>;
};

async function getGeminiClient() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  return new GoogleGenerativeAI(key);
}

function normalizeRawPath(raw: RawPath): Path {
  const withIds = assignPathIds({
    title: raw.title || "My Goal",
    durationWeeks: raw.durationWeeks || 12,
    phases: (raw.phases || []).map((p) => ({
      id: "",
      name: p.name,
      checkpoints: (p.checkpoints || []).map((cp) => ({
        id: "",
        title: cp.title,
        criteria: cp.criteria,
        dueInDays: cp.dueInDays || 14,
        completed: false,
        tasks: (cp.tasks || []).map((t) => ({
          id: "",
          title: t.title,
          frequency: t.frequency || "daily",
          durationMin: t.durationMin || 30,
          isMinimumViable: t.isMinimumViable,
        })),
      })),
    })),
  });

  return PathSchema.parse(withIds);
}

function templatePathFromMessage(message: string): Path {
  const lower = message.toLowerCase();
  if (
    lower.includes("gym") ||
    lower.includes("bulk") ||
    lower.includes("fitness") ||
    lower.includes("workout")
  ) {
    return structuredClone(GOAL_TEMPLATES.find((t) => t.id === "gym-bulk")!.path);
  }
  if (
    lower.includes("read") ||
    lower.includes("book") ||
    lower.includes("habit")
  ) {
    return structuredClone(GOAL_TEMPLATES.find((t) => t.id === "reading-habit")!.path);
  }
  if (
    lower.includes("language") ||
    lower.includes("spanish") ||
    lower.includes("french")
  ) {
    return structuredClone(GOAL_TEMPLATES.find((t) => t.id === "language-learning")!.path);
  }
  if (
    lower.includes("react") ||
    lower.includes("software") ||
    lower.includes("engineer") ||
    lower.includes("code") ||
    lower.includes("program")
  ) {
    return structuredClone(GOAL_TEMPLATES.find((t) => t.id === "software-engineering")!.path);
  }
  return structuredClone(GOAL_TEMPLATES.find((t) => t.id === "software-engineering")!.path);
}

function validationErrorMessage(err: z.ZodError) {
  const first = err.errors[0];
  if (first) {
    return `The generated plan was incomplete (${first.path.join(".")}). Try again with more detail about your goal and timeline.`;
  }
  return "The generated plan was invalid. Try again with more detail about your goal and timeline.";
}

async function generatePathWithGemini(userMessage: string): Promise<GeneratePathResult> {
  const client = await getGeminiClient();
  if (!client) {
    return {
      ok: false,
      error: "AI planning is not configured. Use a template or add GEMINI_API_KEY.",
      retryable: false,
    };
  }

  try {
    const model = client.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: { responseMimeType: "application/json" },
    });
    const result = await model.generateContent([
      { text: PATH_SYSTEM },
      { text: `User goal: ${userMessage}` },
    ]);
    const text = result.response.text();
    const raw = JSON.parse(text) as RawPath;
    const path = normalizeRawPath(raw);
    return { ok: true, path, source: "ai" };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { ok: false, error: validationErrorMessage(err), retryable: true };
    }
    if (err instanceof SyntaxError) {
      return {
        ok: false,
        error: "The AI returned an unreadable plan. Please try again.",
        retryable: true,
      };
    }
    console.error("[generate-path] Gemini error:", err);
    return {
      ok: false,
      error: "Could not generate your plan right now. Please try again.",
      retryable: true,
    };
  }
}

export async function generatePathFromGoal(userMessage: string): Promise<GeneratePathResult> {
  const trimmed = userMessage.trim();
  if (trimmed.length < 8) {
    return {
      ok: false,
      error: "Describe your goal in a bit more detail (at least a sentence).",
      retryable: true,
    };
  }

  const hasApiKey = Boolean(process.env.GEMINI_API_KEY);
  if (hasApiKey) {
    const aiResult = await generatePathWithGemini(trimmed);
    if (aiResult.ok) return aiResult;

    try {
      const path = normalizeRawPath(templatePathFromMessage(trimmed));
      return { ok: true, path, source: "template" };
    } catch {
      return aiResult;
    }
  }

  if (process.env.NODE_ENV === "development") {
    try {
      const path = normalizeRawPath(templatePathFromMessage(trimmed));
      return { ok: true, path, source: "template" };
    } catch (err) {
      if (err instanceof z.ZodError) {
        return { ok: false, error: validationErrorMessage(err), retryable: true };
      }
      return {
        ok: false,
        error: "Could not build a path from templates. Try again.",
        retryable: true,
      };
    }
  }

  return {
    ok: false,
    error: "AI planning is not configured. Use a template or add GEMINI_API_KEY.",
    retryable: false,
  };
}

export function pathSummary(path: Path) {
  const checkpointCount = path.phases.reduce((n, p) => n + p.checkpoints.length, 0);
  const taskCount = path.phases.reduce(
    (n, p) => n + p.checkpoints.reduce((m, cp) => m + cp.tasks.length, 0),
    0
  );
  return { checkpointCount, taskCount, phaseCount: path.phases.length };
}
