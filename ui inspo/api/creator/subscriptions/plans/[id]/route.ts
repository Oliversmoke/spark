import mongoose from "mongoose";
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

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSessionUserActive();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { id } = await ctx.params;
  if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: "invalid_id" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim().slice(0, 120) : undefined;
  const description =
    typeof body?.description === "string" ? body.description.trim().slice(0, 2000) : undefined;
  const cadence = body?.cadence as SubscriptionCadence | undefined;
  const priceUnits =
    typeof body?.priceUnits === "number" && Number.isFinite(body.priceUnits)
      ? Math.floor(body.priceUnits)
      : undefined;
  const targets = body?.targets !== undefined ? parseTargets(body.targets) : undefined;
  const isActive = body?.isActive === true ? true : body?.isActive === false ? false : undefined;

  if (cadence !== undefined && !CADENCE.has(cadence)) {
    return NextResponse.json({ error: "invalid_cadence" }, { status: 400 });
  }
  if (priceUnits !== undefined && priceUnits <= 0) {
    return NextResponse.json({ error: "invalid_priceUnits" }, { status: 400 });
  }
  if (targets !== undefined && (!targets || targets.length === 0)) {
    return NextResponse.json({ error: "targets_required" }, { status: 400 });
  }

  await connectDb();
  const doc = await SubscriptionPlanModel.findById(id);
  if (!doc) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (doc.ownerUserId !== session.userId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  if (title !== undefined && title) doc.title = title;
  if (description !== undefined) doc.description = description;
  if (cadence !== undefined) doc.cadence = cadence;
  if (priceUnits !== undefined) doc.priceUnits = priceUnits;
  if (targets !== undefined) doc.targets = targets;
  if (isActive !== undefined) doc.isActive = isActive;

  await doc.save();
  return NextResponse.json({ plan: serializePlan(doc) });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSessionUserActive();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { id } = await ctx.params;
  if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: "invalid_id" }, { status: 400 });

  await connectDb();
  const doc = await SubscriptionPlanModel.findById(id);
  if (!doc) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (doc.ownerUserId !== session.userId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  doc.isActive = false;
  await doc.save();
  return NextResponse.json({ ok: true });
}

