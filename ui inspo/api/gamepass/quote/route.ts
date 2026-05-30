import { NextResponse } from "next/server";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

import { getSessionUserActive } from "@/lib/auth/session";
import { getGamePassConfig, type SolanaCluster } from "@/lib/gamepass/config";
import { calcUnitsForSol } from "@/lib/gamepass/ledger";

export const runtime = "nodejs";

function quoteForNetUnits(netUnitsTarget: number) {
  const cfg = getGamePassConfig();
  const unitsNet = Math.floor(netUnitsTarget);
  const feeBps = cfg.platformFeeBps;

  // Inverse of:
  // unitsGross = floor(sol * unitsPerSol)
  // fee = floor(unitsGross * feeBps / 10000)
  // unitsNet = unitsGross - fee
  //
  // We pick the smallest unitsGross such that (unitsGross - floor(unitsGross*feeBps/10000)) >= unitsNetTarget.
  // Then choose lamports that guarantee unitsGross will be achieved (ceil).
  const unitsNetTarget = Math.max(0, unitsNet);
  if (unitsNetTarget <= 0) return null;

  // Start with a lower bound (ignoring floors) and increment until it satisfies the true net calc.
  const denom = Math.max(1, 10000 - feeBps);
  let unitsGross = Math.ceil((unitsNetTarget * 10000) / denom);
  // Ensure monotonic satisfaction even with floor effects.
  for (let i = 0; i < 8; i += 1) {
    const platformFeeUnits = Math.floor((unitsGross * feeBps) / 10000);
    const net = Math.max(0, unitsGross - platformFeeUnits);
    if (net >= unitsNetTarget) break;
    unitsGross += 1;
  }

  const unitsPerSol = cfg.gamePassUnitsPerSol;
  if (unitsPerSol <= 0) return null;

  const solExact = unitsGross / unitsPerSol;
  const lamportsExpected = BigInt(Math.ceil(solExact * LAMPORTS_PER_SOL));
  const solExpected = Number(lamportsExpected) / LAMPORTS_PER_SOL;

  // Recompute based on solExpected the server will store if we pass it through buy-intent.
  const computed = calcUnitsForSol(solExpected);
  return {
    unitsNetTarget,
    solExpected,
    lamportsExpected: lamportsExpected.toString(),
    ...computed,
  };
}

export async function GET(req: Request) {
  const session = await getSessionUserActive();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const cluster = searchParams.get("cluster") as SolanaCluster | null;
  const unitsNet = Number(searchParams.get("unitsNet") ?? "0");

  if (cluster !== "devnet" && cluster !== "mainnet-beta") {
    return NextResponse.json({ error: "cluster required" }, { status: 400 });
  }
  if (!Number.isFinite(unitsNet) || unitsNet <= 0) {
    return NextResponse.json({ error: "unitsNet must be a positive number" }, { status: 400 });
  }

  const quote = quoteForNetUnits(unitsNet);
  if (!quote) return NextResponse.json({ error: "quote_unavailable" }, { status: 400 });

  return NextResponse.json({
    ok: true,
    quote: {
      cluster,
      unitsNetTarget: quote.unitsNetTarget,
      unitsGross: quote.unitsGross,
      platformFeeUnits: quote.platformFeeUnits,
      unitsNet: quote.unitsNet,
      solExpected: String(quote.solExpected),
      lamportsExpected: quote.lamportsExpected,
    },
  });
}

