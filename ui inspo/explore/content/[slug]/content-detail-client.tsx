"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { useThemeNetwork } from "@/app/components/theme-network-provider";
import type { ResolvedContent } from "@/lib/catalog/approved";
import { UnlockBox } from "../../unlock-box";

function effectiveMode(resolved: ResolvedContent): "none" | "unlock_once" | "per_view" {
  const { base, creator } = resolved;
  if (base.access === "free" || base.priceUnits <= 0) return "none";
  if (creator) return creator.purchaseMode;
  return "unlock_once";
}

function youtubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") {
      const id = u.pathname.replace(/^\//, "").split("/")[0];
      return id || null;
    }
    if (u.hostname.includes("youtube.com")) return u.searchParams.get("v");
  } catch {
    return null;
  }
  return null;
}

function MediaImg({ src, alt }: { src: string; alt: string }) {
  if (src.startsWith("/")) {
    return (
      <Image
        src={src}
        alt={alt}
        width={1400}
        height={900}
        className="h-auto max-h-[70vh] w-full rounded border border-border-low object-contain"
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className="h-auto max-h-[70vh] w-full rounded border border-border-low object-contain"
    />
  );
}

function ContentRenderer({ resolved }: { resolved: ResolvedContent }) {
  const { base, creator } = resolved;
  const format = creator?.format ?? "blog";
  const mediaUrls = creator?.mediaUrls ?? [];
  const videoUrl = creator?.videoUrl ?? null;
  const galleryLayout = creator?.galleryLayout ?? "grid";

  const bodyBlock =
    base.detail.body.trim().length > 0 ? (
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{base.detail.body}</p>
    ) : null;

  const highlightsBlock =
    base.detail.highlights.length > 0 ? (
      <div className="mt-6 border-t border-border-low pt-5">
        <h2 className="text-base font-semibold">Highlights</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted">
          {base.detail.highlights.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
      </div>
    ) : null;

  if (format === "video" && videoUrl) {
    const yid = youtubeId(videoUrl);
    return (
      <div className="space-y-6">
        {yid ? (
          <div className="relative aspect-video w-full overflow-hidden rounded border border-border-low bg-black">
            <iframe
              title="Video"
              src={`https://www.youtube.com/embed/${yid}`}
              className="absolute inset-0 h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <video controls className="w-full rounded border border-border-low" src={videoUrl}>
            <track kind="captions" />
          </video>
        )}
        {bodyBlock}
        {highlightsBlock}
      </div>
    );
  }

  if ((format === "gallery" || format === "slides") && mediaUrls.length > 0) {
    if (galleryLayout === "slides") {
      return (
        <div className="space-y-6">
          <div className="flex gap-4 overflow-x-auto pb-2">
            {mediaUrls.map((src) => (
              <div key={src} className="w-[min(90vw,520px)] shrink-0">
                <MediaImg src={src} alt="" />
              </div>
            ))}
          </div>
          {bodyBlock}
          {highlightsBlock}
        </div>
      );
    }
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {mediaUrls.map((src) => (
            <MediaImg key={src} src={src} alt="" />
          ))}
        </div>
        {bodyBlock}
        {highlightsBlock}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {bodyBlock}
      {highlightsBlock}
    </div>
  );
}

export function ContentAccessClient({ resolved }: { resolved: ResolvedContent }) {
  const mode = effectiveMode(resolved);
  const { cluster } = useThemeNetwork();
  const [unlocked, setUnlocked] = useState<boolean | null>(null);
  const [entitled, setEntitled] = useState<boolean | null>(null);
  const [paidView, setPaidView] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const refreshUnlock = useCallback(async () => {
    if (mode !== "unlock_once") {
      setUnlocked(true);
      return;
    }
    try {
      const u = await fetch(
        `/api/gamepass/unlocks?cluster=${cluster}&kind=content&slug=${encodeURIComponent(resolved.base.slug)}`
      ).then((r) => (r.ok ? r.json() : null));
      setUnlocked(Boolean(u?.unlocked));
    } catch {
      setUnlocked(false);
    }
  }, [cluster, mode, resolved.base.slug]);

  const refreshEntitled = useCallback(async () => {
    try {
      const e = await fetch(
        `/api/subscriptions/entitled?cluster=${cluster}&kind=content&slug=${encodeURIComponent(resolved.base.slug)}`
      ).then((r) => (r.ok ? r.json() : null));
      setEntitled(Boolean(e?.entitled));
    } catch {
      setEntitled(false);
    }
  }, [cluster, resolved.base.slug]);

  useEffect(() => {
    refreshUnlock().catch(() => {});
    refreshEntitled().catch(() => {});
  }, [refreshEntitled, refreshUnlock]);

  async function payPerView() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/creator/content/charge-view", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cluster, slug: resolved.base.slug }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof j?.error === "string" ? j.error : "Could not charge view");
      setPaidView(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (mode === "none") {
    return (
      <section className="rounded border border-border-low bg-card p-6">
        <ContentRenderer resolved={resolved} />
      </section>
    );
  }

  if (mode === "unlock_once") {
    const show = unlocked === true || entitled === true;
    return (
      <div className="space-y-6">
        {!show ? (
          <div className="rounded border border-border-low bg-card p-5">
            <p className="text-sm text-muted">
              This post costs GamePass to unlock once. You keep access after you unlock (or if you’re subscribed).
            </p>
            <div className="mt-4">
              <UnlockBox
                kind="content"
                slug={resolved.base.slug}
                title={resolved.base.title}
                priceUnits={resolved.base.priceUnits}
                onUnlocked={() => {
                  refreshUnlock().catch(() => {});
                  refreshEntitled().catch(() => {});
                }}
              />
            </div>
          </div>
        ) : null}

        {unlocked === null && entitled === null ? (
          <div className="rounded border border-border-low bg-card p-6 text-sm text-muted">Checking access…</div>
        ) : show ? (
          <section className="rounded border border-border-low bg-card p-6">
            <ContentRenderer resolved={resolved} />
          </section>
        ) : (
          <section className="rounded border border-dashed border-border-low bg-bg2/30 p-10 text-center text-sm text-muted">
            Full content is hidden until you unlock.
          </section>
        )}
      </div>
    );
  }

  if (entitled === true) {
    return (
      <section className="rounded border border-border-low bg-card p-6">
        <ContentRenderer resolved={resolved} />
      </section>
    );
  }

  if (!paidView) {
    return (
      <div className="space-y-4">
        <div className="rounded border border-border-low bg-card p-5">
          <p className="text-sm text-muted">
            This creator charges GamePass <span className="font-semibold text-foreground">every time</span> you open
            the full post.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => payPerView()}
              disabled={busy}
              className="inline-flex items-center justify-center rounded bg-foreground px-4 py-2 text-sm font-semibold text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? "Processing…" : `Pay ${resolved.base.priceUnits} GP to view`}
            </button>
            <Link
              href="/wallet"
              className="rounded border border-border-low bg-card px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-cream/60"
            >
              Wallet
            </Link>
          </div>
          {err ? (
            <div className="mt-4 rounded border border-border-low bg-cream px-4 py-3 text-sm text-muted">
              {err}
            </div>
          ) : null}
        </div>
        <section className="rounded border border-dashed border-border-low bg-bg2/30 p-10 text-center text-sm text-muted">
          Content preview is hidden until you pay for this view.
        </section>
      </div>
    );
  }

  return (
    <section className="rounded border border-border-low bg-card p-6">
      <ContentRenderer resolved={resolved} />
    </section>
  );
}
