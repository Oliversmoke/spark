import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getGameBySlugResolved } from "@/lib/catalog/approved";
import { UnlockBox } from "../../unlock-box";
import { ClusterGate } from "../../cluster-gate";

export default async function GameDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const game = await getGameBySlugResolved(slug);
  if (!game) return notFound();

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">Game</p>
        <div className="flex items-center gap-3">
          <div className="relative h-14 w-14 overflow-hidden rounded border border-border-low bg-bg2">
            <Image src={game.coverImageSrc} alt="" fill sizes="56px" className="object-cover" priority={false} />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">{game.title}</h1>
        </div>
        <p className="max-w-3xl text-base leading-relaxed text-muted">{game.detail.description}</p>

        <div className="flex flex-wrap gap-2 pt-2">
          <span className="rounded-full bg-cream px-3 py-1 text-xs font-semibold text-foreground/80">
            {game.access === "free" ? "Free" : "GamePass required"}
          </span>
          <span className="rounded-full border border-border-low bg-card px-3 py-1 text-xs font-semibold text-muted">
            {game.mode === "built-in" ? "Built-in" : "Community"}
          </span>
          {game.tags.map((t) => (
            <span
              key={t}
              className="rounded-full border border-border-low bg-card px-3 py-1 text-xs font-semibold text-muted"
            >
              {t}
            </span>
          ))}
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded border border-border-low bg-card p-6">
          <h2 className="text-base font-semibold">How to play</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted">
            {game.detail.howToPlay.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
        <div className="rounded border border-border-low bg-card p-6">
          <h2 className="text-base font-semibold">Win condition</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">{game.detail.winCondition}</p>
        </div>
      </section>

      <ClusterGate allowed={game.availableClusters} />

      {game.access === "gamepass" ? (
        <UnlockBox kind="game" slug={game.slug} title={game.title} priceUnits={game.priceUnits} />
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/play"
          className="inline-flex items-center justify-center rounded bg-foreground px-5 py-3 text-sm font-semibold text-background transition hover:opacity-90"
        >
          Play (coming soon)
        </Link>
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

