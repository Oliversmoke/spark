import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDb } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  let dbOk = false;

  try {
    await connectDb();
    dbOk = mongoose.connection.readyState === 1;
  } catch {
    dbOk = false;
  }

  const minimal = process.env.NODE_ENV === "production";
  return NextResponse.json(
    minimal
      ? { ok: dbOk, service: "9tharch" }
      : {
          ok: true,
          service: "9tharch",
          time: new Date().toISOString(),
          env: process.env.NODE_ENV ?? "development",
          db: {
            ok: dbOk,
            readyState: mongoose.connection.readyState,
          },
        },
    { status: dbOk ? 200 : 503 }
  );
}
