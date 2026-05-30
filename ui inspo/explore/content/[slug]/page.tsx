import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getResolvedContentBySlug } from "@/lib/catalog/approved";

import { ContentBodySkeleton } from "../../../components/skeleton-ui";
import { ClusterGate } from "../../cluster-gate";

const ContentAccessClient = dynamic(
  () => import("./content-detail-client").then((m) => m.ContentAccessClient),
  { loading: () => <ContentBodySkeleton /> }
);

export default async function ContentDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const resolved = await getResolvedContentBySlug(slug);
  if (!resolved) return notFound();

  const post = resolved.base;
  const collection = resolved.creator?.collectionLabel;

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">Content</p>
        <div className="flex items-center gap-3">
          <div className="relative h-14 w-14 overflow-hidden rounded border border-border-low bg-bg2">
            <Image src={post.coverImageSrc} alt="" fill sizes="56px" className="object-cover" priority={false} />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">{post.title}</h1>
        </div>
        {collection ? (
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Series · {collection}</p>
        ) : null}
        <p className="text-sm font-semibold text-muted">By {post.author}</p>
        <p className="max-w-3xl text-base leading-relaxed text-muted">{post.summary}</p>

        <div className="flex flex-wrap gap-2 pt-2">
          {post.tags.map((t) => (
            <span
              key={t}
              className="rounded-full border border-border-low bg-card px-3 py-1 text-xs font-semibold text-muted"
            >
              {t}
            </span>
          ))}
        </div>
      </header>

      <ClusterGate allowed={post.availableClusters} />

      <ContentAccessClient resolved={resolved} />

      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/explore"
          className="inline-flex items-center justify-center rounded border border-border-low bg-card px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-cream/60"
        >
          Back to Explore
        </Link>
      </div>
    </div>
  );
}
