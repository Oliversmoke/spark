import dynamic from "next/dynamic";
import Link from "next/link";

import { StandardPageSkeleton } from "../../components/skeleton-ui";

const PostsList = dynamic(
  () => import("./posts-list").then((m) => m.PostsList),
  { loading: () => <StandardPageSkeleton cards={2} /> }
);

export default function CreatorPostsIndexPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">Create</p>
        <h1 className="text-2xl font-semibold tracking-tight">Your posts</h1>
        <p className="text-muted max-w-2xl text-sm">Instant publish to Explore.</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/create/posts/new"
          className="inline-flex items-center justify-center rounded bg-foreground px-4 py-2 text-sm font-semibold text-background transition hover:opacity-90"
        >
          New post
        </Link>
        <Link
          href="/create/posts/earnings"
          className="inline-flex items-center justify-center rounded border border-border-low bg-card px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-cream/60"
        >
          Earnings
        </Link>
        <Link
          href="/create"
          className="inline-flex items-center justify-center rounded border border-border-low bg-card px-4 py-2 text-sm font-semibold text-muted transition hover:bg-cream/60 hover:text-foreground"
        >
          Moderation submissions
        </Link>
      </div>
      <PostsList />
    </div>
  );
}
