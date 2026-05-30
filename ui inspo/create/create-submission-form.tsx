"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useThemeNetwork } from "../components/theme-network-provider";

type Kind = "game" | "content";

export function CreateSubmissionForm() {
  const { cluster } = useThemeNetwork();
  const searchParams = useSearchParams();
  const editIdRaw = (searchParams.get("edit") ?? "").trim();
  const editId = editIdRaw ? editIdRaw : null;
  const [kind, setKind] = useState<Kind>("content");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [slug, setSlug] = useState("");
  const [tags, setTags] = useState("community, solana");
  const [access, setAccess] = useState<"free" | "gamepass">("free");
  const [priceUnits, setPriceUnits] = useState("0");
  const [devnet, setDevnet] = useState(true);
  const [mainnet, setMainnet] = useState(true);

  const [gameDescription, setGameDescription] = useState("");
  const [gameHowToPlay, setGameHowToPlay] = useState("Move with arrows\nTap to jump");
  const [gameWinCondition, setGameWinCondition] = useState("");

  const [contentBody, setContentBody] = useState("");
  const [contentAuthorName, setContentAuthorName] = useState("");
  const [contentHighlights, setContentHighlights] = useState("First highlight\nSecond highlight");

  const [developerPipeline, setDeveloperPipeline] = useState(false);
  const [playableUrl, setPlayableUrl] = useState("https://");
  const [gameCategory, setGameCategory] = useState("arcade");
  const [listingMonetization, setListingMonetization] = useState<"unlock_once" | "pay_per_play">(
    "unlock_once"
  );
  const [githubUrl, setGithubUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [socialTwitter, setSocialTwitter] = useState("");
  const [socialDiscord, setSocialDiscord] = useState("");
  const [otherSocials, setOtherSocials] = useState("");
  const [demoVideoUrl, setDemoVideoUrl] = useState("");
  const [gameInstructionsExtra, setGameInstructionsExtra] = useState("");
  const [mediaGallery, setMediaGallery] = useState<string[]>([]);
  const [coverImageSrc, setCoverImageSrc] = useState("/memojis_safe/Ellipse_133.png");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    const k = (searchParams.get("kind") ?? "").toLowerCase();
    if (k === "game" || k === "content") setKind(k);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    if (!editId) return;
    let cancelled = false;
    (async () => {
      setBusy(true);
      setErr(null);
      setOk(null);
      try {
        const res = await fetch(`/api/submissions/${encodeURIComponent(editId)}`, {
          method: "GET",
          credentials: "include",
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error ?? "Failed to load submission");
        const s = json?.submission as any;
        if (!s || cancelled) return;

        if (s.kind === "game" || s.kind === "content") setKind(s.kind);
        setTitle(typeof s.title === "string" ? s.title : "");
        setSummary(typeof s.summary === "string" ? s.summary : "");
        setSlug(typeof s.slug === "string" ? s.slug : "");
        setTags(Array.isArray(s.tags) ? s.tags.join(", ") : "");
        setAccess(s.access === "gamepass" ? "gamepass" : "free");
        setPriceUnits(typeof s.priceUnits === "number" ? String(s.priceUnits) : "0");
        setDevnet(Array.isArray(s.availableClusters) ? s.availableClusters.includes("devnet") : true);
        setMainnet(Array.isArray(s.availableClusters) ? s.availableClusters.includes("mainnet-beta") : true);
        if (typeof s.coverImageSrc === "string" && s.coverImageSrc) setCoverImageSrc(s.coverImageSrc);

        setDeveloperPipeline(Boolean(s.developerPipeline));
        setPlayableUrl(typeof s.playableUrl === "string" ? s.playableUrl : "https://");
        setGameCategory(typeof s.gameCategory === "string" ? s.gameCategory : "arcade");
        setListingMonetization(s.listingMonetization === "pay_per_play" ? "pay_per_play" : "unlock_once");
        setGithubUrl(typeof s.githubUrl === "string" ? s.githubUrl : "");
        setWebsiteUrl(typeof s.websiteUrl === "string" ? s.websiteUrl : "");
        setSocialTwitter(typeof s.socialTwitter === "string" ? s.socialTwitter : "");
        setSocialDiscord(typeof s.socialDiscord === "string" ? s.socialDiscord : "");
        setOtherSocials(typeof s.otherSocials === "string" ? s.otherSocials : "");
        setDemoVideoUrl(typeof s.demoVideoUrl === "string" ? s.demoVideoUrl : "");
        setGameInstructionsExtra(typeof s.gameInstructionsExtra === "string" ? s.gameInstructionsExtra : "");
        setMediaGallery(Array.isArray(s.mediaGallery) ? s.mediaGallery : []);

        setGameDescription(typeof s.gameDescription === "string" ? s.gameDescription : "");
        setGameWinCondition(typeof s.gameWinCondition === "string" ? s.gameWinCondition : "");
        setGameHowToPlay(Array.isArray(s.gameHowToPlay) ? s.gameHowToPlay.join("\n") : "");

        setContentBody(typeof s.contentBody === "string" ? s.contentBody : "");
        setContentAuthorName(typeof s.contentAuthorName === "string" ? s.contentAuthorName : "");
        setContentHighlights(Array.isArray(s.contentHighlights) ? s.contentHighlights.join("\n") : "");
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editId]);

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

      const body: Record<string, unknown> = {
        kind,
        title: title.trim(),
        summary: summary.trim(),
        slug: slug.trim().toLowerCase(),
        tags: tagList,
        coverEmoji: "✨",
        coverImageSrc,
        availableClusters,
        access,
        priceUnits: Number(priceUnits),
      };

      if (kind === "game") {
        body.gameDescription = gameDescription.trim();
        body.gameWinCondition = gameWinCondition.trim();
        body.gameHowToPlay = gameHowToPlay
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean);
        if (developerPipeline) {
          body.developerPipeline = true;
          body.playableUrl = playableUrl.trim();
          body.gameCategory = gameCategory.trim();
          body.listingMonetization = listingMonetization;
          body.githubUrl = githubUrl.trim() || undefined;
          body.websiteUrl = websiteUrl.trim() || undefined;
          body.socialTwitter = socialTwitter.trim() || undefined;
          body.socialDiscord = socialDiscord.trim() || undefined;
          body.otherSocials = otherSocials.trim() || undefined;
          body.demoVideoUrl = demoVideoUrl.trim() || undefined;
          body.gameInstructionsExtra = gameInstructionsExtra.trim() || undefined;
          body.mediaGallery = mediaGallery;
        }
      } else {
        body.contentBody = contentBody.trim();
        body.contentAuthorName = contentAuthorName.trim() || "Creator";
        body.contentHighlights = contentHighlights
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean);
      }

      const url = editId ? `/api/submissions/${encodeURIComponent(editId)}` : "/api/submissions";
      const res = await fetch(url, {
        method: editId ? "PATCH" : "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Submission failed");

      setOk(
        editId
          ? `Updated and resubmitted. Slug: ${json?.submission?.slug ?? slug}`
          : `Submitted for review. Slug: ${json?.submission?.slug ?? slug}`,
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 space-y-6 rounded border border-border-low bg-card p-5">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setKind("content")}
          disabled={!!editId}
          className={[
            "rounded-full px-3 py-1 text-xs font-semibold",
            kind === "content" ? "bg-foreground text-background" : "border border-border-low text-muted",
            editId ? "opacity-60" : "",
          ].join(" ")}
        >
          Content
        </button>
        <button
          type="button"
          onClick={() => setKind("game")}
          disabled={!!editId}
          className={[
            "rounded-full px-3 py-1 text-xs font-semibold",
            kind === "game" ? "bg-foreground text-background" : "border border-border-low text-muted",
            editId ? "opacity-60" : "",
          ].join(" ")}
        >
          Game
        </button>
        <span className="ml-auto text-xs text-muted">
          Theme cluster: <span className="font-semibold text-foreground">{cluster}</span> (listing filter only)
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
          Title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 block h-11 w-full rounded border border-border-low bg-bg1 px-3 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-cream/70"
          />
        </label>
        <label className="space-y-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
          URL slug (a-z, numbers, hyphens)
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="my-demo-post"
            className="mt-1 block h-11 w-full rounded border border-border-low bg-bg1 px-3 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-cream/70"
          />
        </label>
      </div>

      <label className="block space-y-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
        Summary
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded border border-border-low bg-bg1 px-3 py-2 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-cream/70"
        />
      </label>

      <div className="space-y-2">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Cover image</div>
        <div className="flex flex-wrap items-center gap-3">
          <img
            src={coverImageSrc}
            alt=""
            className="h-16 w-24 rounded border border-border-low object-cover bg-bg2"
          />
          <label className="inline-flex cursor-pointer rounded border border-border-low bg-bg1 px-3 py-2 text-xs font-semibold hover:bg-cream/60">
            Upload image
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
            className="rounded border border-border-low bg-bg1 px-3 py-2 text-xs font-semibold text-muted transition hover:bg-cream/60 hover:text-foreground disabled:opacity-50"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
          Tags (comma separated)
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="mt-1 block h-11 w-full rounded border border-border-low bg-bg1 px-3 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-cream/70"
          />
        </label>
        <div className="space-y-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
          Clusters
          <div className="mt-1 flex flex-wrap gap-3 text-sm font-semibold text-foreground">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={devnet} onChange={(e) => setDevnet(e.target.checked)} />
              devnet
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={mainnet} onChange={(e) => setMainnet(e.target.checked)} />
              mainnet-beta
            </label>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
        <div className="space-y-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
          Access
          <div className="mt-1 flex gap-2">
            <button
              type="button"
              onClick={() => setAccess("free")}
              className={[
                "rounded px-3 py-2 text-sm font-semibold",
                access === "free" ? "bg-cream text-foreground" : "border border-border-low text-muted",
              ].join(" ")}
            >
              Free
            </button>
            <button
              type="button"
              onClick={() => setAccess("gamepass")}
              className={[
                "rounded px-3 py-2 text-sm font-semibold",
                access === "gamepass" ? "bg-cream text-foreground" : "border border-border-low text-muted",
              ].join(" ")}
            >
              GamePass
            </button>
          </div>
        </div>
        {access === "gamepass" ? (
          <label className="space-y-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            Price (GP)
            <input
              value={priceUnits}
              onChange={(e) => setPriceUnits(e.target.value)}
              inputMode="numeric"
              className="mt-1 block h-11 w-full rounded border border-border-low bg-bg1 px-3 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-cream/70"
            />
          </label>
        ) : null}
      </div>

      {kind === "game" ? (
        <div className="space-y-4">
          <label className="block space-y-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            Description
            <textarea
              value={gameDescription}
              onChange={(e) => setGameDescription(e.target.value)}
              rows={4}
              className="mt-1 w-full rounded border border-border-low bg-bg1 px-3 py-2 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-cream/70"
            />
          </label>
          <label className="block space-y-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            How to play (one line per bullet)
            <textarea
              value={gameHowToPlay}
              onChange={(e) => setGameHowToPlay(e.target.value)}
              rows={4}
              className="mt-1 w-full rounded border border-border-low bg-bg1 px-3 py-2 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-cream/70"
            />
          </label>
          <label className="block space-y-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            Win condition
            <input
              value={gameWinCondition}
              onChange={(e) => setGameWinCondition(e.target.value)}
              className="mt-1 block h-11 w-full rounded border border-border-low bg-bg1 px-3 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-cream/70"
            />
          </label>

          <label className="flex cursor-pointer items-center gap-3 rounded border border-border-low bg-bg1 px-4 py-3 text-sm font-semibold">
            <input
              type="checkbox"
              checked={developerPipeline}
              onChange={(e) => setDeveloperPipeline(e.target.checked)}
              className="h-4 w-4"
            />
            <span>
              Full developer submission (playable link, category, monetization, media, automated checks +
              moderation queue)
            </span>
          </label>

          {developerPipeline ? (
            <div className="space-y-4 border-l-2 border-cream/50 pl-4">
              <label className="block space-y-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                Playable game URL (HTTPS)
                <input
                  value={playableUrl}
                  onChange={(e) => setPlayableUrl(e.target.value)}
                  placeholder="https://your-game.example/path"
                  className="mt-1 block h-11 w-full rounded border border-border-low bg-bg1 px-3 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-cream/70"
                />
              </label>
              <label className="block space-y-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                Category
                <input
                  value={gameCategory}
                  onChange={(e) => setGameCategory(e.target.value)}
                  className="mt-1 block h-11 w-full rounded border border-border-low bg-bg1 px-3 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-cream/70"
                />
              </label>
              <div className="space-y-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                Listing monetization
                <div className="mt-1 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setListingMonetization("unlock_once")}
                    className={[
                      "rounded px-3 py-2 text-sm font-semibold",
                      listingMonetization === "unlock_once"
                        ? "bg-cream text-foreground"
                        : "border border-border-low text-muted",
                    ].join(" ")}
                  >
                    One-time unlock (GamePass above)
                  </button>
                  <button
                    type="button"
                    onClick={() => setListingMonetization("pay_per_play")}
                    className={[
                      "rounded px-3 py-2 text-sm font-semibold",
                      listingMonetization === "pay_per_play"
                        ? "bg-cream text-foreground"
                        : "border border-border-low text-muted",
                    ].join(" ")}
                  >
                    Pay per play (GP each session)
                  </button>
                </div>
                <p className="text-[11px] font-normal text-muted">
                  Use GamePass price for either a one-time catalog unlock or a per-run fee, depending on your
                  choice.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  GitHub
                  <input
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/..."
                    className="mt-1 block h-11 w-full rounded border border-border-low bg-bg1 px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-cream/70"
                  />
                </label>
                <label className="block space-y-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  Website
                  <input
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://"
                    className="mt-1 block h-11 w-full rounded border border-border-low bg-bg1 px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-cream/70"
                  />
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  X / Twitter
                  <input
                    value={socialTwitter}
                    onChange={(e) => setSocialTwitter(e.target.value)}
                    className="mt-1 block h-11 w-full rounded border border-border-low bg-bg1 px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-cream/70"
                  />
                </label>
                <label className="block space-y-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  Discord invite / profile URL
                  <input
                    value={socialDiscord}
                    onChange={(e) => setSocialDiscord(e.target.value)}
                    className="mt-1 block h-11 w-full rounded border border-border-low bg-bg1 px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-cream/70"
                  />
                </label>
              </div>
              <label className="block space-y-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                Other social / links (short text)
                <input
                  value={otherSocials}
                  onChange={(e) => setOtherSocials(e.target.value)}
                  className="mt-1 block h-11 w-full rounded border border-border-low bg-bg1 px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-cream/70"
                />
              </label>
              <label className="block space-y-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                Demo video (HTTPS)
                <input
                  value={demoVideoUrl}
                  onChange={(e) => setDemoVideoUrl(e.target.value)}
                  placeholder="https://..."
                  className="mt-1 block h-11 w-full rounded border border-border-low bg-bg1 px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-cream/70"
                />
              </label>
              <label className="block space-y-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                Extra instructions for reviewers / players
                <textarea
                  value={gameInstructionsExtra}
                  onChange={(e) => setGameInstructionsExtra(e.target.value)}
                  rows={4}
                  className="mt-1 w-full rounded border border-border-low bg-bg1 px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-cream/70"
                />
              </label>
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  Screenshots & videos (upload)
                </div>
                <label className="inline-flex cursor-pointer rounded border border-border-low bg-bg1 px-3 py-2 text-xs font-semibold hover:bg-cream/60">
                  Add media file
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
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
                        if (json.url) setMediaGallery((m) => [...m, json.url as string]);
                      } catch (ex) {
                        setErr(ex instanceof Error ? ex.message : String(ex));
                      } finally {
                        setBusy(false);
                      }
                    }}
                  />
                </label>
                {mediaGallery.length ? (
                  <ul className="space-y-1 text-xs break-all text-muted">
                    {mediaGallery.map((u) => (
                      <li key={u} className="flex items-start justify-between gap-2">
                        <span>{u}</span>
                        <button
                          type="button"
                          className="shrink-0 text-foreground underline"
                          onClick={() => setMediaGallery((m) => m.filter((x) => x !== u))}
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted">No uploads yet. Files are MIME-checked (not a full malware scan).</p>
                )}
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="space-y-4">
          <label className="block space-y-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            Author display name
            <input
              value={contentAuthorName}
              onChange={(e) => setContentAuthorName(e.target.value)}
              className="mt-1 block h-11 w-full rounded border border-border-low bg-bg1 px-3 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-cream/70"
            />
          </label>
          <label className="block space-y-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            Body
            <textarea
              value={contentBody}
              onChange={(e) => setContentBody(e.target.value)}
              rows={6}
              className="mt-1 w-full rounded border border-border-low bg-bg1 px-3 py-2 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-cream/70"
            />
          </label>
          <label className="block space-y-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            Highlights (one per line)
            <textarea
              value={contentHighlights}
              onChange={(e) => setContentHighlights(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded border border-border-low bg-bg1 px-3 py-2 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-cream/70"
            />
          </label>
        </div>
      )}

      {err ? <div className="rounded border border-border-low bg-cream px-4 py-3 text-sm">{err}</div> : null}
      {ok ? <div className="rounded border border-border-low bg-cream px-4 py-3 text-sm">{ok}</div> : null}

      <button
        type="button"
        disabled={busy}
        onClick={() => submit()}
        className="inline-flex h-11 items-center justify-center rounded bg-foreground px-5 text-sm font-semibold text-background transition hover:opacity-90 disabled:opacity-50"
      >
        {busy ? "Submitting…" : "Submit for review"}
      </button>
    </div>
  );
}
