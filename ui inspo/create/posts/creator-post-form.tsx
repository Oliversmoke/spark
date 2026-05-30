"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FiUpload } from "react-icons/fi";

import { useThemeNetwork } from "@/app/components/theme-network-provider";

type Format = "blog" | "video" | "gallery" | "slides";

export function CreatorPostForm({ postId }: { postId?: string }) {
  const router = useRouter();
  const { cluster } = useThemeNetwork();
  const editMode = Boolean(postId);

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [slug, setSlug] = useState("");
  const [tags, setTags] = useState("creator, solana");
  const [coverImageSrc, setCoverImageSrc] = useState("/memojis_safe/Ellipse_133.png");
  const [format, setFormat] = useState<Format>("blog");
  const [body, setBody] = useState("");
  const [highlights, setHighlights] = useState("Point one\nPoint two");
  const [mediaUrls, setMediaUrls] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [galleryLayout, setGalleryLayout] = useState<"grid" | "slides">("grid");
  const [access, setAccess] = useState<"free" | "gamepass">("free");
  const [purchaseMode, setPurchaseMode] = useState<"unlock_once" | "per_view">("unlock_once");
  const [priceUnits, setPriceUnits] = useState("10");
  const [collectionLabel, setCollectionLabel] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [devnet, setDevnet] = useState(true);
  const [mainnet, setMainnet] = useState(true);

  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    if (!postId) return;
    setLoading(true);
    fetch(`/api/creator/posts/${postId}`, { credentials: "include" })
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j?.error ?? "Load failed");
        const p = j.post;
        setTitle(p.title ?? "");
        setSummary(p.summary ?? "");
        setSlug(p.slug ?? "");
        setTags(Array.isArray(p.tags) ? p.tags.join(", ") : "");
        setCoverImageSrc(p.coverImageSrc ?? "/memojis_safe/Ellipse_133.png");
        setFormat((p.format as Format) ?? "blog");
        setBody(p.body ?? "");
        setHighlights(Array.isArray(p.highlights) ? p.highlights.join("\n") : "");
        setMediaUrls(Array.isArray(p.mediaUrls) ? p.mediaUrls.join("\n") : "");
        setVideoUrl(p.videoUrl ?? "");
        setGalleryLayout(p.galleryLayout === "slides" ? "slides" : "grid");
        setAccess(p.access === "gamepass" ? "gamepass" : "free");
        if (p.purchaseMode === "per_view") setPurchaseMode("per_view");
        else setPurchaseMode("unlock_once");
        setPriceUnits(String(p.priceUnits ?? 0));
        setCollectionLabel(p.collectionLabel ?? "");
        setStatus(p.status === "published" ? "published" : "draft");
        const cl = p.availableClusters as string[] | undefined;
        if (cl) {
          setDevnet(cl.includes("devnet"));
          setMainnet(cl.includes("mainnet-beta"));
        }
      })
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [postId]);

  async function submit() {
    setBusy(true);
    setErr(null);
    setOk(null);
    try {
      const availableClusters: Array<"devnet" | "mainnet-beta"> = [];
      if (devnet) availableClusters.push("devnet");
      if (mainnet) availableClusters.push("mainnet-beta");
      if (availableClusters.length === 0) throw new Error("Select at least one cluster");

      const tagList = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const mediaLines = mediaUrls
        .split(/\n/)
        .map((s) => s.trim())
        .filter(Boolean);

      const highlightLines = highlights
        .split(/\n/)
        .map((s) => s.trim())
        .filter(Boolean);

      const payload: Record<string, unknown> = {
        title: title.trim(),
        summary: summary.trim(),
        slug: slug.trim().toLowerCase(),
        tags: tagList,
        coverEmoji: "✨",
        coverImageSrc,
        availableClusters,
        access,
        priceUnits: Number(priceUnits),
        body: body.trim(),
        highlights: highlightLines,
        format,
        mediaUrls: mediaLines,
        videoUrl: videoUrl.trim() || null,
        galleryLayout,
        collectionLabel: collectionLabel.trim() || null,
        status,
      };

      if (access === "gamepass") {
        payload.purchaseMode = purchaseMode;
      }

      const url = editMode ? `/api/creator/posts/${postId}` : "/api/creator/posts";
      const res = await fetch(url, {
        method: editMode ? "PATCH" : "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Save failed");

      const outSlug = json?.post?.slug ?? slug;
      setOk(editMode ? "Saved." : `Created. Slug: ${outSlug}`);
      if (!editMode) {
        router.push(`/explore/content/${encodeURIComponent(outSlug)}`);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function archive() {
    if (!postId || !confirm("Archive this post? It will disappear from Explore.")) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/creator/posts/${postId}`, { method: "DELETE", credentials: "include" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Delete failed");
      router.push("/create/posts");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted">Loading…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded border border-border-low bg-card p-5 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded border border-border-low bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">URL slug</span>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              disabled={editMode}
              className="w-full rounded border border-border-low bg-background px-3 py-2 text-sm disabled:opacity-60"
            />
          </label>
        </div>

        <label className="block space-y-1">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Summary</span>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={3}
            className="w-full rounded border border-border-low bg-background px-3 py-2 text-sm"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Tags (comma-separated)</span>
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="w-full rounded border border-border-low bg-background px-3 py-2 text-sm"
          />
        </label>

        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Cover image</span>
          <div className="flex flex-wrap items-center gap-3">
            <img
              src={coverImageSrc}
              alt=""
              className="h-16 w-24 rounded border border-border-low object-cover bg-bg2"
            />
            <label className="inline-flex cursor-pointer items-center gap-2 rounded border border-border-low bg-card px-3 py-2 text-sm font-semibold text-muted transition hover:bg-cream/60 hover:text-foreground">
              <FiUpload aria-hidden />
              Upload
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                disabled={busy}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  setBusy(true);
                  setErr(null);
                  try {
                    const fd = new FormData();
                    fd.set("file", file);
                    const res = await fetch("/api/uploads/game-asset", {
                      method: "POST",
                      credentials: "include",
                      body: fd,
                    });
                    const json = await res.json().catch(() => ({}));
                    if (!res.ok) throw new Error(json?.error ?? "Upload failed");
                    if (json.url) setCoverImageSrc(json.url as string);
                  } catch (ex) {
                    setErr(ex instanceof Error ? ex.message : String(ex));
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            </label>
            <button
              type="button"
              disabled={busy}
              onClick={() => setCoverImageSrc("/memojis_safe/Ellipse_133.png")}
              className="rounded border border-border-low bg-card px-3 py-2 text-sm font-semibold text-muted transition hover:bg-cream/60 hover:text-foreground disabled:opacity-50"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Format</span>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as Format)}
              className="w-full rounded border border-border-low bg-background px-3 py-2 text-sm"
            >
              <option value="blog">Blog / text</option>
              <option value="video">Video</option>
              <option value="gallery">Picture grid</option>
              <option value="slides">Picture slides (horizontal)</option>
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Publish status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as "draft" | "published")}
              className="w-full rounded border border-border-low bg-background px-3 py-2 text-sm"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </label>
        </div>

        <label className="block space-y-1">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Body</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            className="w-full rounded border border-border-low bg-background px-3 py-2 text-sm font-mono"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Highlights (one per line)</span>
          <textarea
            value={highlights}
            onChange={(e) => setHighlights(e.target.value)}
            rows={4}
            className="w-full rounded border border-border-low bg-background px-3 py-2 text-sm"
          />
        </label>

        {(format === "gallery" || format === "slides") && (
          <>
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                Image URLs (one per line, https or /uploads/game-assets/…)
              </span>
              <textarea
                value={mediaUrls}
                onChange={(e) => setMediaUrls(e.target.value)}
                rows={5}
                className="w-full rounded border border-border-low bg-background px-3 py-2 text-sm font-mono"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Gallery layout</span>
              <select
                value={galleryLayout}
                onChange={(e) => setGalleryLayout(e.target.value as "grid" | "slides")}
                className="w-full rounded border border-border-low bg-background px-3 py-2 text-sm"
              >
                <option value="grid">Grid</option>
                <option value="slides">Slides strip</option>
              </select>
            </label>
          </>
        )}

        {format === "video" && (
          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Video URL (YouTube or direct mp4)</span>
            <input
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="w-full rounded border border-border-low bg-background px-3 py-2 text-sm"
              placeholder="https://..."
            />
          </label>
        )}

        <label className="block space-y-1">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Collection label (optional)</span>
          <input
            value={collectionLabel}
            onChange={(e) => setCollectionLabel(e.target.value)}
            className="w-full rounded border border-border-low bg-background px-3 py-2 text-sm"
            placeholder="e.g. Season 1"
          />
        </label>

        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Clusters</span>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={devnet} onChange={(e) => setDevnet(e.target.checked)} />
              devnet
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={mainnet} onChange={(e) => setMainnet(e.target.checked)} />
              mainnet-beta
            </label>
          </div>
          <p className="text-xs text-muted">Unlocks and balances use your selected network ({cluster}).</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Access</span>
            <select
              value={access}
              onChange={(e) => setAccess(e.target.value as "free" | "gamepass")}
              className="w-full rounded border border-border-low bg-background px-3 py-2 text-sm"
            >
              <option value="free">Free</option>
              <option value="gamepass">GamePass paid</option>
            </select>
          </label>

          {access === "gamepass" ? (
            <>
              <label className="block space-y-1">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Payment style</span>
                <select
                  value={purchaseMode}
                  onChange={(e) => setPurchaseMode(e.target.value as "unlock_once" | "per_view")}
                  className="w-full rounded border border-border-low bg-background px-3 py-2 text-sm"
                >
                  <option value="unlock_once">One-time unlock</option>
                  <option value="per_view">Pay each view</option>
                </select>
              </label>
              <label className="block space-y-1 md:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Price (GP units)</span>
                <input
                  value={priceUnits}
                  onChange={(e) => setPriceUnits(e.target.value)}
                  inputMode="numeric"
                  className="w-full rounded border border-border-low bg-background px-3 py-2 text-sm"
                />
              </label>
            </>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="button"
            onClick={() => submit()}
            disabled={busy}
            className="rounded bg-foreground px-4 py-2 text-sm font-semibold text-background transition hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "Saving…" : editMode ? "Save changes" : "Create post"}
          </button>
          {editMode ? (
            <button
              type="button"
              onClick={() => archive()}
              disabled={busy}
              className="rounded border border-border-low bg-card px-4 py-2 text-sm font-semibold text-muted transition hover:bg-cream/60 hover:text-foreground disabled:opacity-60"
            >
              Archive
            </button>
          ) : null}
          <Link
            href="/create/posts"
            className="rounded border border-border-low bg-card px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-cream/60"
          >
            Cancel
          </Link>
        </div>

        {ok ? <p className="text-sm font-semibold text-foreground">{ok}</p> : null}
        {err ? (
          <div className="rounded border border-border-low bg-cream px-4 py-3 text-sm text-muted">{err}</div>
        ) : null}
      </div>
    </div>
  );
}
