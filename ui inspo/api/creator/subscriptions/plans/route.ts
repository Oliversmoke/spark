import { NextResponse } from "next/server";

import { getSessionUserActive } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import type { SubscriptionCadence, SubscriptionTarget } from "@/lib/models/SubscriptionPlan";
import { SubscriptionPlanModel } from "@/lib/models/SubscriptionPlan";

export const runtime = "nodejs";

const CADENCE = new Set<SubscriptionCadence>(["daily", "monthly", "annually"]);

function parseTargets(raw: unknown): SubscriptionTarget[] | null {
  if (!Array.isArray(raw)) return null;
  const out: SubscriptionTarget[] = [];
  for (const t of raw) {
    const kind = (t as { kind?: unknown })?.kind;
    const slug = (t as { slug?: unknown })?.slug;
    if ((kind !== "game" && kind !== "content") || typeof slug !== "string") continue;
    const s = slug.trim().toLowerCase();
    if (!s) continue;
    out.push({ kind, slug: s });
  }
  const seen = new Set<string>();
  const uniq: SubscriptionTarget[] = [];
  for (const t of out) {
    const k = `${t.kind}:${t.slug}`;
    if (seen.has(k)) continue;
    seen.add(k);
    uniq.push(t);
  }
  return uniq.slice(0, 250);
}

function serializePlan(p: any) {
  return {
    id: String(p._id),
    title: p.title,
    description: p.description ?? "",
    cadence: p.cadence,
    priceUnits: p.priceUnits,
    targets: Array.isArray(p.targets) ? p.targets : [],
    isActive: Boolean(p.isActive),
    updatedAt: (p.updatedAt as Date).toISOString(),
    createdAt: (p.createdAt as Date).toISOString(),
  };
}

export async function GET() {
  const session = await getSessionUserActive();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  await connectDb();
  const rows = await SubscriptionPlanModel.find({ ownerUserId: session.userId })
    .sort({ updatedAt: -1 })
    .limit(100)
    .lean();
  return NextResponse.json({ items: rows.map(serializePlan) });
}

export async function POST(req: Request) {
  const session = await getSessionUserActive();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim().slice(0, 120) : "";
  const description =
    typeof body?.description === "string" ? body.description.trim().slice(0, 2000) : "";
  const cadence = body?.cadence as SubscriptionCadence | undefined;
  const priceUnits =
    typeof body?.priceUnits === "number" && Number.isFinite(body.priceUnits)
      ? Math.floor(body.priceUnits)
      : NaN;
  const targets = parseTargets(body?.targets);

  if (!title) return NextResponse.json({ error: "invalid_title" }, { status: 400 });
  if (!cadence || !CADENCE.has(cadence))
    return NextResponse.json({ error: "invalid_cadence" }, { status: 400 });
  if (!Number.isFinite(priceUnits) || priceUnits <= 0)
    return NextResponse.json({ error: "invalid_priceUnits" }, { status: 400 });
  if (!targets || targets.length === 0)
    return NextResponse.json({ error: "targets_required" }, { status: 400 });

  await connectDb();
  const doc = await SubscriptionPlanModel.create({
    ownerUserId: session.userId,
    ownerWalletAddress: session.walletAddress,
    title,
    description,
    cadence,
    priceUnits,
    targets,
    isActive: true,
  });

  return NextResponse.json({ plan: serializePlan(doc) });
}

