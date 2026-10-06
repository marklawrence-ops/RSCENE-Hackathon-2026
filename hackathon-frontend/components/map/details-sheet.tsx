"use client";

import { useRef, useState, useSyncExternalStore } from "react";

type Snap = "peek" | "full";

// Share of the map's height the sheet covers at each stop (phones only).
const HEIGHT: Record<Snap, number> = { peek: 0.46, full: 0.92 };
// Released below this share of the map height → the sheet closes.
const CLOSE_BELOW = 0.22;

function subscribeWide(cb: () => void) {
  const mq = window.matchMedia("(min-width: 1024px)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
const isWide = () => window.matchMedia("(min-width: 1024px)").matches;

/**
 * Laptops: a translucent panel on the right.
 * Phones: a bottom sheet that opens half-way; drag the handle to any height, release to snap
 * to half or full, drag low to close. Tap the handle to toggle half/full.
 */
export function DetailsSheet({ children, onClose, label }: { children: React.ReactNode; onClose: () => void; label: string }) {
  const wide = useSyncExternalStore(subscribeWide, isWide, () => true);
  const [snap, setSnap] = useState<Snap>("peek");
  const [dragPx, setDragPx] = useState<number | null>(null);
  const sheet = useRef<HTMLElement>(null);
  const drag = useRef<{ startY: number; startH: number; parentH: number; moved: boolean } | null>(null);

  if (wide) {
    return (
      <aside
        aria-label={label}
        className="glass drawer-in absolute top-3 right-3 bottom-3 z-[1100] w-[400px] overflow-y-auto rounded-3xl p-4"
      >
        {children}
      </aside>
    );
  }

  const onPointerDown = (e: React.PointerEvent) => {
    const el = sheet.current;
    const parentH = el?.parentElement?.clientHeight ?? window.innerHeight;
    drag.current = { startY: e.clientY, startH: el?.getBoundingClientRect().height ?? parentH * HEIGHT.peek, parentH, moved: false };
    try {
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    } catch {
      // Some browsers refuse capture for synthetic or already-ended pointers; dragging still works.
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dy = e.clientY - d.startY;
    if (Math.abs(dy) > 4) d.moved = true;
    setDragPx(Math.min(d.parentH * HEIGHT.full, Math.max(0, d.startH - dy)));
  };

  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (!d.moved) {
      // A tap on the handle toggles half / full.
      setSnap((s) => (s === "peek" ? "full" : "peek"));
      setDragPx(null);
      return;
    }
    const share = (dragPx ?? d.startH) / d.parentH;
    setDragPx(null);
    if (share < CLOSE_BELOW) return onClose();
    setSnap(share > (HEIGHT.peek + HEIGHT.full) / 2 ? "full" : "peek");
  };

  return (
    <aside
      ref={sheet}
      aria-label={label}
      className={`glass drawer-in absolute inset-x-0 bottom-0 z-[1100] flex flex-col rounded-t-3xl ${dragPx === null ? "transition-[height] duration-300 ease-out" : ""}`}
      style={{ height: dragPx !== null ? `${dragPx}px` : `${HEIGHT[snap] * 100}%` }}
    >
      <div
        role="button"
        tabIndex={0}
        aria-label={snap === "peek" ? "Expand details" : "Collapse details"}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setSnap((s) => (s === "peek" ? "full" : "peek"));
        }}
        className="flex shrink-0 cursor-grab touch-none justify-center pt-2.5 pb-2 active:cursor-grabbing"
      >
        <span className="h-1.5 w-11 rounded-full bg-black/20" />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">{children}</div>
    </aside>
  );
}
