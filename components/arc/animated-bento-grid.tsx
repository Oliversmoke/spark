"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { cn } from "@/lib/utils";

export type BentoTile = {
  id: string;
  label: string;
  images: string[];
};

const EXTRA_BENTO_TILES: BentoTile[] = [
  {
    id: "progress",
    label: "Progress",
    images: [
      "https://picsum.photos/seed/callback-progress-a/600/600",
      "https://picsum.photos/seed/callback-progress-b/600/600",
    ],
  },
  {
    id: "templates",
    label: "Templates",
    images: [
      "https://picsum.photos/seed/callback-templates-a/600/600",
      "https://picsum.photos/seed/callback-templates-b/600/600",
    ],
  },
  {
    id: "chat",
    label: "Chat",
    images: [
      "https://picsum.photos/seed/callback-chat-a/600/600",
      "https://picsum.photos/seed/callback-chat-b/600/600",
    ],
  },
];

/** Nine tiles — 3 columns × 3 rows. */
export const DEFAULT_BENTO_TILES: BentoTile[] = [
  {
    id: "coach",
    label: "AI coach",
    images: [
      "https://picsum.photos/seed/callback-coach-a/600/600",
      "https://picsum.photos/seed/callback-coach-b/600/600",
    ],
  },
  {
    id: "tasks",
    label: "Daily tasks",
    images: [
      "https://picsum.photos/seed/callback-tasks-a/600/600",
      "https://picsum.photos/seed/callback-tasks-b/600/600",
    ],
  },
  {
    id: "streak",
    label: "Streaks & XP",
    images: [
      "https://picsum.photos/seed/callback-streak-a/600/600",
      "https://picsum.photos/seed/callback-streak-b/600/600",
    ],
  },
  {
    id: "learn",
    label: "Skill building",
    images: [
      "https://picsum.photos/seed/callback-learn-a/600/600",
      "https://picsum.photos/seed/callback-learn-b/600/600",
    ],
  },
  {
    id: "gym",
    label: "Fitness paths",
    images: [
      "https://picsum.photos/seed/callback-gym-a/600/600",
      "https://picsum.photos/seed/callback-gym-b/600/600",
    ],
  },
  {
    id: "recover",
    label: "Recovery mode",
    images: [
      "https://picsum.photos/seed/callback-recover-a/600/600",
      "https://picsum.photos/seed/callback-recover-b/600/600",
    ],
  },
  ...EXTRA_BENTO_TILES,
];

const CROSSFADE_MS = 1800;
const BASE_INTERVAL_MS = 8500;
const INTERVAL_STAGGER_MS = 1200;
const SNAP_MS = 340;
const FLIP_MS = 360;
const FLIP_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

type DragGhost = {
  tileId: string;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  x: number;
  y: number;
  snapping?: boolean;
  snapLeft?: number;
  snapTop?: number;
  snapWidth?: number;
  snapHeight?: number;
};

function measureTileRects(grid: HTMLElement) {
  const map = new Map<string, DOMRect>();
  grid.querySelectorAll<HTMLElement>("[data-tile-id]").forEach((el) => {
    const id = el.dataset.tileId;
    if (id) map.set(id, el.getBoundingClientRect());
  });
  return map;
}

function runFlipAnimation(
  grid: HTMLElement,
  beforeRects: Map<string, DOMRect>
) {
  const prefersReduced = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  grid.querySelectorAll<HTMLElement>("[data-tile-id]").forEach((cell) => {
    const id = cell.dataset.tileId;
    if (!id) return;

    const first = beforeRects.get(id);
    if (!first) return;

    const last = cell.getBoundingClientRect();
    const dx = first.left - last.left;
    const dy = first.top - last.top;

    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;

    cell.style.transition = "none";
    cell.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
    cell.style.zIndex = "5";

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (prefersReduced) {
          cell.style.transform = "";
          cell.style.zIndex = "";
          return;
        }

        cell.style.transition = `transform ${FLIP_MS}ms ${FLIP_EASE}`;
        cell.style.transform = "";

        const onDone = () => {
          cell.style.transition = "";
          cell.style.zIndex = "";
          cell.removeEventListener("transitionend", onDone);
        };
        cell.addEventListener("transitionend", onDone);
      });
    });
  });
}

function mergeOrder(prev: string[], tileIds: string[]) {
  const next = prev.filter((id) => tileIds.includes(id));
  for (const id of tileIds) {
    if (!next.includes(id)) next.push(id);
  }
  return next.length === tileIds.length ? next : tileIds;
}

function BentoCellFace({
  tile,
  intervalMs,
  compact,
  paused,
}: {
  tile: BentoTile;
  intervalMs: number;
  compact: boolean;
  paused?: boolean;
}) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (paused || tile.images.length < 2) return;
    const t = window.setInterval(() => {
      setActive((v) => (v + 1) % tile.images.length);
    }, intervalMs);
    return () => window.clearInterval(t);
  }, [tile.images.length, intervalMs, paused]);

  return (
    <>
      {tile.images.map((src, i) => (
        <Image
          key={src}
          src={src}
          alt=""
          fill
          draggable={false}
          sizes={compact ? "34vw" : "20vw"}
          className={cn(
            "pointer-events-none object-cover object-center transition-opacity ease-in-out select-none",
            i === active ? "opacity-100" : "opacity-0"
          )}
          style={{ transitionDuration: `${CROSSFADE_MS}ms` }}
          priority={tile.id === "coach" && i === 0}
        />
      ))}

      <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-transparent" />

      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0",
          compact ? "px-2 py-1.5" : "px-2.5 py-2"
        )}
      >
        <p
          className={cn(
            "truncate font-semibold uppercase tracking-widest text-white/90",
            compact ? "text-[9px] leading-none" : "text-[10px] leading-none md:text-[11px]"
          )}
        >
          {tile.label}
        </p>
      </div>
    </>
  );
}

function BentoCell({
  tile,
  slotIndex,
  intervalMs,
  compact,
  draggable,
  isDragging,
  isDropTarget,
  onPointerDown,
}: {
  tile: BentoTile;
  slotIndex: number;
  intervalMs: number;
  compact: boolean;
  draggable: boolean;
  isDragging: boolean;
  isDropTarget: boolean;
  onPointerDown: (e: ReactPointerEvent<HTMLDivElement>, tileId: string) => void;
}) {
  return (
    <div
      data-slot-index={slotIndex}
      data-tile-id={tile.id}
      onPointerDown={draggable ? (e) => onPointerDown(e, tile.id) : undefined}
      className={cn(
        "group relative h-full min-h-0 w-full min-w-0 overflow-hidden rounded border bg-card touch-none transition-[box-shadow,opacity,border-color] duration-150",
        draggable ? "cursor-grab active:cursor-grabbing" : "",
        isDragging
          ? "scale-[0.92] border-dashed border-foreground/25 bg-cream/20 opacity-40"
          : "border-border-low shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
        isDropTarget &&
          !isDragging &&
          "scale-[1.02] border-foreground/50 ring-2 ring-foreground/20"
      )}
    >
      <BentoCellFace tile={tile} intervalMs={intervalMs} compact={compact} paused={isDragging} />
    </div>
  );
}

export function AnimatedBentoGrid({
  tiles = DEFAULT_BENTO_TILES,
  className,
  variant = "default",
  draggable = true,
}: {
  tiles?: BentoTile[];
  className?: string;
  variant?: "default" | "panel";
  draggable?: boolean;
}) {
  const isPanel = variant === "panel";
  const compact = !isPanel;
  const gridRef = useRef<HTMLDivElement>(null);
  const tileIds = tiles.map((t) => t.id);
  const orderRef = useRef<string[]>(tileIds);
  const ghostRef = useRef<DragGhost | null>(null);
  const draggingRef = useRef(false);
  const pendingFlipRef = useRef<Map<string, DOMRect> | null>(null);
  const snapTimerRef = useRef<number | null>(null);

  const [order, setOrder] = useState<string[]>(() => tileIds);
  const [ghost, setGhost] = useState<DragGhost | null>(null);
  const [hoverSlot, setHoverSlot] = useState<number | null>(null);

  useEffect(() => {
    setOrder((prev) => mergeOrder(prev, tileIds));
  }, [tileIds.join(",")]);

  useEffect(() => {
    orderRef.current = order;
  }, [order]);

  useLayoutEffect(() => {
    const grid = gridRef.current;
    const beforeRects = pendingFlipRef.current;
    if (!grid || !beforeRects) return;

    pendingFlipRef.current = null;
    runFlipAnimation(grid, beforeRects);
  }, [order]);

  useEffect(() => {
    return () => {
      if (snapTimerRef.current) window.clearTimeout(snapTimerRef.current);
    };
  }, []);

  const tileMap = useCallback(
    () => new Map(tiles.map((t) => [t.id, t])),
    [tiles]
  );

  const orderedTiles = order
    .map((id) => tileMap().get(id))
    .filter((t): t is BentoTile => Boolean(t));

  const findSlotAtPoint = useCallback((clientX: number, clientY: number) => {
    const grid = gridRef.current;
    if (!grid) return null;

    const slots = grid.querySelectorAll<HTMLElement>("[data-slot-index]");
    for (const slotEl of slots) {
      const rect = slotEl.getBoundingClientRect();
      if (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      ) {
        return Number(slotEl.dataset.slotIndex);
      }
    }
    return null;
  }, []);

  const endDrag = useCallback(
    (clientX: number, clientY: number) => {
      if (!draggingRef.current) return;

      const activeGhost = ghostRef.current;
      const fromIndex = activeGhost
        ? orderRef.current.indexOf(activeGhost.tileId)
        : -1;
      const toIndex = findSlotAtPoint(clientX, clientY);
      const grid = gridRef.current;

      draggingRef.current = false;
      setHoverSlot(null);

      if (
        !activeGhost ||
        !grid ||
        fromIndex === -1 ||
        toIndex === null ||
        toIndex === fromIndex
      ) {
        ghostRef.current = null;
        setGhost(null);
        return;
      }

      const slotEl = grid.querySelector<HTMLElement>(
        `[data-slot-index="${toIndex}"]`
      );
      if (!slotEl) {
        ghostRef.current = null;
        setGhost(null);
        return;
      }

      const targetRect = slotEl.getBoundingClientRect();
      const snappingGhost: DragGhost = {
        ...activeGhost,
        snapping: true,
        snapLeft: targetRect.left,
        snapTop: targetRect.top,
        snapWidth: targetRect.width,
        snapHeight: targetRect.height,
      };

      ghostRef.current = snappingGhost;
      setGhost(snappingGhost);

      if (snapTimerRef.current) window.clearTimeout(snapTimerRef.current);

      snapTimerRef.current = window.setTimeout(() => {
        snapTimerRef.current = null;
        ghostRef.current = null;
        setGhost(null);

        pendingFlipRef.current = measureTileRects(grid);
        setOrder((prev) => {
          const next = [...prev];
          [next[fromIndex], next[toIndex]] = [next[toIndex], next[fromIndex]];
          return next;
        });
      }, SNAP_MS);
    },
    [findSlotAtPoint]
  );

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>, tileId: string) => {
      if (!draggable || e.button !== 0 || draggingRef.current) return;

      e.preventDefault();
      e.stopPropagation();

      const rect = e.currentTarget.getBoundingClientRect();
      const nextGhost: DragGhost = {
        tileId,
        width: rect.width,
        height: rect.height,
        offsetX: e.clientX - rect.left,
        offsetY: e.clientY - rect.top,
        x: e.clientX,
        y: e.clientY,
      };

      draggingRef.current = true;
      ghostRef.current = nextGhost;
      setGhost(nextGhost);
      setHoverSlot(orderRef.current.indexOf(tileId));

      const onMove = (ev: PointerEvent) => {
        if (!draggingRef.current || !ghostRef.current) return;
        ev.preventDefault();
        const updated = {
          ...ghostRef.current,
          x: ev.clientX,
          y: ev.clientY,
        };
        ghostRef.current = updated;
        setGhost(updated);
        setHoverSlot(findSlotAtPoint(ev.clientX, ev.clientY));
      };

      const onUp = (ev: PointerEvent) => {
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
        document.removeEventListener("pointercancel", onUp);
        endDrag(ev.clientX, ev.clientY);
      };

      document.addEventListener("pointermove", onMove, { passive: false });
      document.addEventListener("pointerup", onUp);
      document.addEventListener("pointercancel", onUp);
    },
    [draggable, findSlotAtPoint, endDrag]
  );

  const ghostTile = ghost ? tileMap().get(ghost.tileId) : null;

  return (
    <div
      className={cn(
        "relative w-full min-h-0",
        isPanel
          ? "flex h-full flex-col rounded border border-border-low bg-card p-2 shadow-[0_30px_120px_-80px_rgba(0,0,0,0.55)] md:p-2.5"
          : "h-full",
        className
      )}
    >
      <div
        ref={gridRef}
        className={cn(
          "grid h-full min-h-0 w-full flex-1 grid-cols-3 grid-rows-3 gap-1.5 touch-none md:gap-2",
          draggable && "select-none"
        )}
      >
        {orderedTiles.map((tile, index) => (
          <BentoCell
            key={tile.id}
            tile={tile}
            slotIndex={index}
            intervalMs={BASE_INTERVAL_MS + index * INTERVAL_STAGGER_MS}
            compact={compact}
            draggable={draggable}
            isDragging={ghost?.tileId === tile.id}
            isDropTarget={hoverSlot === index && ghost?.tileId !== tile.id}
            onPointerDown={handlePointerDown}
          />
        ))}
      </div>

      {ghost && ghostTile ? (
        <div
          className="pointer-events-none fixed z-50 overflow-hidden rounded border border-border-low bg-card shadow-[0_24px_60px_-20px_rgba(0,0,0,0.55)]"
          style={{
            width: ghost.snapping ? ghost.snapWidth : ghost.width,
            height: ghost.snapping ? ghost.snapHeight : ghost.height,
            left: ghost.snapping
              ? ghost.snapLeft
              : ghost.x - ghost.offsetX,
            top: ghost.snapping ? ghost.snapTop : ghost.y - ghost.offsetY,
            transition: ghost.snapping
              ? `left ${SNAP_MS}ms ${FLIP_EASE}, top ${SNAP_MS}ms ${FLIP_EASE}, width ${SNAP_MS}ms ${FLIP_EASE}, height ${SNAP_MS}ms ${FLIP_EASE}, transform ${SNAP_MS}ms ${FLIP_EASE}`
              : "none",
            transform: ghost.snapping
              ? "scale(1) rotate(0deg)"
              : "scale(1.05) rotate(-1.5deg)",
          }}
        >
          <div className="relative h-full w-full">
            <BentoCellFace
              tile={ghostTile}
              intervalMs={BASE_INTERVAL_MS}
              compact={compact}
              paused
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
