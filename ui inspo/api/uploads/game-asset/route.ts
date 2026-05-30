import { randomBytes } from "crypto";
import { NextResponse } from "next/server";

import { getSessionUserActive } from "@/lib/auth/session";
import {
  MAX_SUBMISSION_IMAGE_BYTES,
  MAX_SUBMISSION_VIDEO_BYTES,
} from "@/lib/uploads/constants";
import { detectMediaType } from "@/lib/uploads/magic";
import { writeUploadRelPath } from "@/lib/uploads/writePublic";
import { getClientIp, rateLimitCheck, rateLimitHeaders } from "@/lib/rateLimit";

export const runtime = "nodejs";

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/webm": "webm",
};

export async function POST(req: Request) {
  const session = await getSessionUserActive();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const ip = getClientIp(req);
  const rl = rateLimitCheck(`upload:game-asset:ip:${ip}`, 40, 60 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: rateLimitHeaders(rl.retryAfterSec) }
    );
  }
  const rlu = rateLimitCheck(`upload:game-asset:user:${session.userId}`, 30, 60 * 60 * 1000);
  if (!rlu.ok) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: rateLimitHeaders(rlu.retryAfterSec) }
    );
  }

  const fd = await req.formData();
  const file = fd.get("file");
  if (!file || typeof file === "string" || !("arrayBuffer" in file)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }

  const ab = await file.arrayBuffer();
  const buf = Buffer.from(ab);

  const kind = detectMediaType(buf);
  if (!kind || !EXT[kind]) {
    return NextResponse.json({ error: "unsupported_media_type" }, { status: 400 });
  }

  const max =
    kind.startsWith("image/") ? MAX_SUBMISSION_IMAGE_BYTES : MAX_SUBMISSION_VIDEO_BYTES;
  if (buf.length > max) {
    return NextResponse.json({ error: "file_too_large", maxBytes: max }, { status: 400 });
  }

  const name = `${session.userId}-${randomBytes(8).toString("hex")}.${EXT[kind]}`;
  const url = await writeUploadRelPath("uploads/game-assets", name, buf);

  return NextResponse.json({
    ok: true,
    url,
    mime: kind,
    bytes: buf.length,
  });
}
