"use client";

import Image from "next/image";
import React, { useMemo } from "react";

type MemojiMarqueeProps = {
  images: string[];
  speedSeconds?: number;
  direction?: "left" | "right";
  sizePx?: number;
  className?: string;
};

export function MemojiMarqueeRow({
  images,
  speedSeconds = 38,
  direction = "left",
  sizePx = 44,
  className,
}: MemojiMarqueeProps) {
  const items = useMemo(() => {
    // Duplicate list for seamless loop.
    const base = images.length ? images : [];
    return [...base, ...base];
  }, [images]);

  return (
    <div
      className={[
        "relative overflow-hidden",
        // slight fade on edges
        "mask-[linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]",
        className ?? "",
      ].join(" ")}
    >
      <div
        className="flex w-max items-center gap-3"
        style={{
          animation: `arc-marquee ${speedSeconds}s linear infinite`,
          animationDirection: direction === "left" ? "normal" : "reverse",
          willChange: "transform",
        }}
      >
        {items.map((src, idx) => (
          <div
            key={`${src}-${idx}`}
            className="relative shrink-0 overflow-hidden rounded-full border border-border-low bg-card"
            style={{ width: sizePx, height: sizePx }}
          >
            <Image src={src} alt="" fill className="object-cover" sizes={`${sizePx}px`} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function MemojiMarquee({
  images,
  rows = 4,
  sizePx = 52,
  className,
}: {
  images: string[];
  rows?: number;
  sizePx?: number;
  className?: string;
}) {
  const rowImages = useMemo(() => {
    const r = Math.max(1, Math.min(12, rows));
    const src = images.length ? images : [];
    const minPerRow = 18; // ensure each row is wider than most viewports

    const buckets: string[][] = Array.from({ length: r }, () => []);
    for (let row = 0; row < r; row += 1) {
      // deterministic stagger so rows aren't identical
      let idx = row;
      while (buckets[row].length < minPerRow && src.length > 0) {
        buckets[row].push(src[idx % src.length]);
        idx += r;
      }
    }
    return buckets;
  }, [images, rows]);

  return (
    <div className={["grid gap-3", className ?? ""].join(" ")}>
      {rowImages.map((row, i) => (
        <MemojiMarqueeRow
          key={i}
          images={row}
          sizePx={sizePx}
          speedSeconds={44 + i * 4}
          direction={i % 2 === 0 ? "left" : "right"}
        />
      ))}
    </div>
  );
}

