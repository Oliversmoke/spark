"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type FeatureSlide = {
  title: string;
  subtitle: string;
};

export function FeatureSlider({
  slides,
  intervalMs = 4500,
  autoPlay = true,
  swipeable = false,
  variant = "card",
  dotSize = 10,
  className,
}: {
  slides: FeatureSlide[];
  intervalMs?: number;
  autoPlay?: boolean;
  swipeable?: boolean;
  variant?: "card" | "plain";
  dotSize?: number;
  className?: string;
}) {
  const safeSlides = useMemo(() => slides.filter(Boolean), [slides]);
  const [idx, setIdx] = useState(0);
  const startXRef = useRef<number | null>(null);
  const movedRef = useRef(false);
  const [dragX, setDragX] = useState(0);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [viewportW, setViewportW] = useState(0);

  useEffect(() => {
    if (!autoPlay || safeSlides.length <= 1) return;
    const t = window.setInterval(
      () => setIdx((i) => (i + 1) % safeSlides.length),
      intervalMs
    );
    return () => window.clearInterval(t);
  }, [autoPlay, intervalMs, safeSlides.length]);

  const active = safeSlides[idx] ?? safeSlides[0];

  function prev() {
    setIdx((i) => (i - 1 + safeSlides.length) % safeSlides.length);
  }
  function next() {
    setIdx((i) => (i + 1) % safeSlides.length);
  }

  useEffect(() => {
    if (!swipeable || variant !== "plain") return;
    const el = viewportRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setViewportW(el.clientWidth));
    ro.observe(el);
    setViewportW(el.clientWidth);
    return () => ro.disconnect();
  }, [swipeable, variant]);

  return (
    <div className={["space-y-3", className ?? ""].join(" ")}>
      {variant === "plain" && swipeable ? (
        <div
          ref={viewportRef}
          className="overflow-hidden px-1"
          style={{ touchAction: "pan-y" }}
          onPointerDown={(e) => {
            startXRef.current = e.clientX;
            movedRef.current = false;
            setDragX(0);
          }}
          onPointerMove={(e) => {
            if (startXRef.current == null) return;
            const dx = e.clientX - startXRef.current;
            if (Math.abs(dx) > 10) movedRef.current = true;
            setDragX(dx);
          }}
          onPointerUp={(e) => {
            if (startXRef.current == null) return;
            const dx = e.clientX - startXRef.current;
            startXRef.current = null;
            const threshold = viewportW ? viewportW * 0.18 : 64;
            const should = movedRef.current && Math.abs(dx) > threshold;
            setDragX(0);
            if (!should) return;
            if (dx > 0) prev();
            else next();
          }}
          onPointerCancel={() => {
            startXRef.current = null;
            setDragX(0);
          }}
        >
          <div
            className="flex"
            style={{
              transform: `translateX(${-(idx * (viewportW || 0)) + (startXRef.current ? dragX : 0)}px)`,
              transition: startXRef.current ? "none" : "transform 260ms ease-out",
              willChange: "transform",
            }}
          >
            {safeSlides.map((s, i) => (
              <div key={i} className="shrink-0" style={{ width: viewportW || "100%" }}>
                <div className="text-lg font-semibold tracking-tight">{s.title}</div>
                <div className="mt-1 whitespace-pre-line text-sm leading-relaxed text-muted">
                  {s.subtitle}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div
          className={
            variant === "card"
              ? "rounded-3xl border border-border-low bg-card px-5 py-4 shadow-[0_20px_80px_-55px_rgba(0,0,0,0.35)]"
              : "px-1"
          }
        >
          <div key={idx} className={variant === "card" ? "animate-[arc-fade_450ms_ease-out]" : ""}>
            <div className="text-lg font-semibold tracking-tight">{active?.title}</div>
            <div className="mt-1 whitespace-pre-line text-sm leading-relaxed text-muted">
              {active?.subtitle}
            </div>
          </div>
        </div>
      )}

      {safeSlides.length > 1 ? (
        <div className="flex items-center justify-center gap-2">
          {safeSlides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIdx(i)}
              aria-label={`Show slide ${i + 1}`}
              className={[
                "rounded-full transition",
                i === idx ? "bg-foreground" : "bg-border-low hover:bg-border",
              ].join(" ")}
              style={{ width: dotSize, height: dotSize }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
