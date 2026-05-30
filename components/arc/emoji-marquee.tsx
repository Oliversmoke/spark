"use client";

import { useMemo } from "react";

const DEFAULT_EMOJIS = [
  "🎯", "💪", "📚", "🏋️", "🔥", "⭐", "🧠", "✅", "🚀", "💻",
  "📈", "🌱", "🏃", "🎓", "🧘", "💡", "🏆", "📖", "⚡", "🎨",
  "🛠️", "📝", "🌟", "💎", "🎸", "🏊", "🥗", "☕", "🎬", "🧩",
];

function MarqueeRow({
  items,
  speedSeconds = 38,
  direction = "left",
  sizePx = 44,
}: {
  items: string[];
  speedSeconds?: number;
  direction?: "left" | "right";
  sizePx?: number;
}) {
  const loop = useMemo(() => [...items, ...items], [items]);

  return (
    <div className="relative overflow-hidden mask-[linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
      <div
        className="flex w-max items-center gap-3"
        style={{
          animation: `arc-marquee ${speedSeconds}s linear infinite`,
          animationDirection: direction === "left" ? "normal" : "reverse",
          willChange: "transform",
        }}
      >
        {loop.map((emoji, idx) => (
          <div
            key={`${emoji}-${idx}`}
            className="grid shrink-0 place-items-center overflow-hidden rounded-full border border-border-low bg-card text-[1.35rem]"
            style={{ width: sizePx, height: sizePx }}
            aria-hidden
          >
            {emoji}
          </div>
        ))}
      </div>
    </div>
  );
}

export function EmojiMarquee({
  emojis = DEFAULT_EMOJIS,
  rows = 4,
  sizePx = 52,
  className,
}: {
  emojis?: string[];
  rows?: number;
  sizePx?: number;
  className?: string;
}) {
  const rowItems = useMemo(() => {
    const r = Math.max(1, Math.min(12, rows));
    const src = emojis.length ? emojis : DEFAULT_EMOJIS;
    const minPerRow = 18;
    const buckets: string[][] = Array.from({ length: r }, () => []);
    for (let row = 0; row < r; row += 1) {
      let idx = row;
      while (buckets[row].length < minPerRow && src.length > 0) {
        buckets[row].push(src[idx % src.length]);
        idx += r;
      }
    }
    return buckets;
  }, [emojis, rows]);

  return (
    <div className={["grid gap-3", className ?? ""].join(" ")}>
      {rowItems.map((row, i) => (
        <MarqueeRow
          key={i}
          items={row}
          sizePx={sizePx}
          speedSeconds={44 + i * 4}
          direction={i % 2 === 0 ? "left" : "right"}
        />
      ))}
    </div>
  );
}
