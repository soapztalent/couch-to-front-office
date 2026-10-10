/** Keep the playfield bitmap near 1440p even when the window and device pixel ratio are larger. */
const PIXEL_BUDGET = 2560 * 1440;

export function playfieldScale(cssW: number, cssH: number, deviceDpr: number): number {
  if (cssW < 2 || cssH < 2) return 1;
  const dpr = Number.isFinite(deviceDpr) && deviceDpr > 0 ? deviceDpr : 1;
  const fit = Math.sqrt(PIXEL_BUDGET / (cssW * cssH));
  return Math.max(0.5, Math.min(dpr, fit, 1.5));
}

export type Surface = {
  ctx: CanvasRenderingContext2D;
  size: () => { cssW: number; cssH: number; dpr: number };
  destroy: () => void;
};

/**
 * Owns the playfield bitmap. Size is read from ResizeObserver, never from the frame loop,
 * so a frame does not force layout.
 */
export function attachSurface(canvas: HTMLCanvasElement): Surface {
  const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
  if (!ctx) throw new Error("2d context unavailable");
  let cssW = 0;
  let cssH = 0;
  let dpr = 1;

  const apply = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w < 2 || h < 2) return;
    const scale = playfieldScale(w, h, window.devicePixelRatio || 1);
    const bw = Math.max(1, Math.round(w * scale));
    const bh = Math.max(1, Math.round(h * scale));
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
    }
    cssW = w;
    cssH = h;
    dpr = bw / w;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const observer = new ResizeObserver(apply);
  observer.observe(canvas);
  apply();

  return {
    ctx,
    size: () => ({ cssW, cssH, dpr }),
    destroy: () => observer.disconnect(),
  };
}

/** Writes DOM text only when the string changes, so the HUD does not invalidate layout every frame. */
export function textSlot(el: HTMLElement | null): (value: string) => void {
  let prev = "";
  return (value: string) => {
    if (!el || value === prev) return;
    prev = value;
    el.textContent = value;
  };
}
