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

/** Fixed cameras for the front and back stills. The figure faces +Z. */
export function FigureShot({ view }: { view: "front" | "back" | "drill" }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const world = attachWorld(canvas);
    const figure = { x: 1.15, y: 0, z: 3.1, scale: 1, yaw: 0, tone: 1 };
    const cam: Camera =
      view === "back"
        ? { x: 1.15, y: 1.2, z: -1.7, yaw: 0, pitch: -0.06 }
        : view === "drill"
          ? { x: -0.55, y: 1.58, z: 0.15, yaw: 0.48, pitch: -0.05 }
          : { x: 1.15, y: 1.2, z: 7.9, yaw: Math.PI, pitch: -0.06 };
    let raf = 0;
    const tick = () => {
      world.drawBay(cam, [figure], CROSS, view === "drill" ? 74 : 54);
      raf = requestAnimationFrame(tick);
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
