import { useEffect, useRef } from "react";
import { attachWorld } from "../sim/glview";
import type { Camera } from "../sim/geom";
import type { Crosshair } from "../persist/storage";

const CROSS: Crosshair = {
  color: "#f4f7fb",
  length: 6,
  gap: 4,
  thickness: 2,
  outline: true,
  outlineColor: "#05070a",
  dot: false,
  dotSize: 1,
};

/** Fixed cameras for the front, back, and face stills. The figure faces +Z. */
export function FigureShot({ view }: { view: "front" | "back" | "face" | "drill" }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const world = attachWorld(canvas);
    const figure = { x: 1.15, y: 0, z: 3.1, scale: 1, yaw: 0, tone: 1 };
    const cam: Camera =
      view === "back"
        ? { x: 1.15, y: 1.05, z: -1.55, yaw: 0, pitch: -0.02 }
        : view === "face"
          ? { x: 1.2, y: 1.62, z: 4.05, yaw: Math.PI, pitch: -0.04 }
          : view === "drill"
            ? { x: 1.15, y: 1.6, z: 0.55, yaw: 0, pitch: -0.04 }
            : { x: 1.15, y: 1.05, z: 7.55, yaw: Math.PI, pitch: -0.02 };
    const fov = view === "face" ? 32 : view === "drill" ? 74 : 42;
    let raf = 0;
    let shown = 0;
    const tick = () => {
      const loaded = canvas.dataset.ready === "1";
      world.drawBay(cam, [figure], CROSS, fov, view !== "drill");
      if (loaded) shown += 1;
      if (view === "drill" || shown < 2) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      world.destroy();
    };
  }, [view]);

  return (
    <div className="range-root" data-shot={view}>
      <canvas ref={ref} />
    </div>
  );
}
