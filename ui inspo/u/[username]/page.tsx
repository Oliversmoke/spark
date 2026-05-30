import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { connectDb } from "@/lib/db";
import { UserModel } from "@/lib/models/User";
import { displayInitials } from "@/lib/profile/initials";
import { normalizeUsername } from "@/lib/username/validate";

export default async function PublicUserProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const handle = normalizeUsername(username);
  if (!handle) notFound();

  await connectDb();
  const user = await UserModel.findOne({ username: handle }).lean();
  if (!user || user.status !== "active") notFound();

  const displayName = user.displayName ?? "";
  const bio = user.bio ?? "";
  const initials = displayInitials(displayName, user.primaryWalletAddress);

  if (user.profileVisibility !== "public") {
    return (
      <div className="mx-auto max-w-lg space-y-4 px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">@{handle}</h1>
        <p className="text-muted">This profile is private.</p>
        <Link href="/" className="inline-block text-sm font-semibold underline">
          Back home
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-10">
      <header className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
        {user.avatarUrl ? (
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border border-border-low bg-bg2">
            <Image src={user.avatarUrl} alt="" fill sizes="96px" className="object-cover" />
          </div>
        ) : (
          <div className="grid h-24 w-24 shrink-0 place-items-center rounded-full border border-border-low bg-cream text-2xl font-bold">
            {initials}
          </div>
        )}
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">Profile</p>
          <h1 className="text-2xl font-semibold tracking-tight">{displayName || `@${handle}`}</h1>
          <p className="text-sm text-muted">@{handle}</p>
        </div>
      </header>

      {bio ? (
        <section className="rounded border border-border-low bg-card p-5">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{bio}</p>
        </section>
      ) : (
        <p className="text-center text-sm text-muted">No bio yet.</p>
      )}

      <div className="text-center">
        <Link href="/explore" className="text-sm font-semibold underline">
          Explore 9thArc
        </Link>
      </div>
    </div>
  );
}
