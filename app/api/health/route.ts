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

  return NextResponse.json(
    {
      ok: dbOk,
      service: "comeback-ai",
      db: dbOk ? "ok" : "error",
      time: new Date().toISOString(),
    },
    { status: dbOk ? 200 : 503 }
  );
}
