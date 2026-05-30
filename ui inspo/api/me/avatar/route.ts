import { randomBytes } from "crypto";
import { NextResponse } from "next/server";

import { getSessionUserActive } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import { UserModel } from "@/lib/models/User";
import { MAX_PROFILE_IMAGE_BYTES } from "@/lib/uploads/constants";
import { detectMediaType } from "@/lib/uploads/magic";
import { writeUploadRelPath } from "@/lib/uploads/writePublic";

export const runtime = "nodejs";

const IMAGE_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

export async function POST(req: Request) {
  const session = await getSessionUserActive();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const fd = await req.formData();
  const file = fd.get("file");
  if (!file || typeof file === "string" || !("arrayBuffer" in file)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }

  const ab = await file.arrayBuffer();
  const buf = Buffer.from(ab);
  if (buf.length > MAX_PROFILE_IMAGE_BYTES) {
    return NextResponse.json(
      { error: "file_too_large", maxBytes: MAX_PROFILE_IMAGE_BYTES },
      { status: 400 }
    );
  }

  const kind = detectMediaType(buf);
  if (!kind || !kind.startsWith("image/") || !IMAGE_EXT[kind]) {
    return NextResponse.json({ error: "invalid_image_type" }, { status: 400 });
  }

  const ext = IMAGE_EXT[kind];
  const name = `${session.userId}-${randomBytes(6).toString("hex")}.${ext}`;
  const url = await writeUploadRelPath("uploads/profiles", name, buf);

  await connectDb();
  await UserModel.findByIdAndUpdate(session.userId, { $set: { avatarUrl: url } });

  return NextResponse.json({ ok: true, avatarUrl: url });
}
