import { useEffect, useRef } from "react";
import { fetchBoard } from "../board/client";
import { createAimDevice } from "../input";
import type { Settings } from "../persist/storage";
import { attachWorld } from "../sim/glview";
import { textSlot } from "../sim/surface";
import { aimCall, bayYaw, BAY_EYE, worldCalls, type WorldCall } from "../world/bay";

function paintBoard(canvas: HTMLCanvasElement, title: string, rows: { name: string; score: number }[], note: string) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.fillStyle = "#10141c";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#d6ff46";
  ctx.lineWidth = 10;
  ctx.strokeRect(12, 12, w - 24, h - 24);
  ctx.fillStyle = "#d6ff46";
  ctx.font = "600 28px Outfit, sans-serif";
  ctx.fillText("BOARD", 40, 68);
  ctx.fillStyle = "#e8eef6";
  ctx.font = "600 40px Outfit, sans-serif";
  ctx.fillText(title.slice(0, 22), 40, 124);
  ctx.font = "24px 'JetBrains Mono', monospace";
  if (rows.length === 0) {
    ctx.fillStyle = "#8b97a8";
    ctx.fillText(note, 40, 188);
    return;
  }
  rows.slice(0, 5).forEach((row, index) => {
    const y = 186 + index * 26;
    ctx.fillStyle = "#8b97a8";
    ctx.fillText(String(index + 1).padStart(2, "0"), 40, y);
    ctx.fillStyle = "#e8eef6";
    ctx.fillText(row.name.slice(0, 16), 96, y);
    ctx.fillStyle = "#d6ff46";
    ctx.fillText(String(row.score), 390, y);
  });
}

export function Bay(props: {
  settings: Settings;
  done: string[];
  paused: boolean;
  onCall: (call: WorldCall) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const callRef = useRef<HTMLParagraphElement>(null);
  const settingsRef = useRef(props.settings);
  const doneRef = useRef(props.done);
  const pausedRef = useRef(props.paused);
  const onCallRef = useRef(props.onCall);
  settingsRef.current = props.settings;
  doneRef.current = props.done;
  pausedRef.current = props.paused;
  onCallRef.current = props.onCall;
  const look = useRef({ yaw: bayYaw(), pitch: -0.02 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const settings = settingsRef.current;
    const view = attachWorld(canvas);
    const device = createAimDevice({ dpi: settings.dpi, sens: settings.sens, yaw: settings.yaw });
    const putCall = textSlot(callRef.current);
    const board = document.createElement("canvas");
    board.width = 512;
    board.height = 320;
    let boardFor = "";
    let raf = 0;
    let stopped = false;
    let shown = "";

    const tick = () => {
      if (stopped) return;
      const live = settingsRef.current;
      const calls = worldCalls(doneRef.current);
      const frame = device.consume();
      if (!pausedRef.current && device.locked) {
        look.current.yaw += (frame.yaw * Math.PI) / 180;
        look.current.pitch = Math.max(-1.05, Math.min(1.05, look.current.pitch + (frame.pitch * Math.PI) / 180));
      }
      const cam = { x: BAY_EYE.x, y: BAY_EYE.y, z: BAY_EYE.z, yaw: look.current.yaw, pitch: look.current.pitch };
      const aimed = pausedRef.current ? null : aimCall(calls, cam);
      const label = aimed?.title ?? calls.find((call) => call.place === "front")?.title ?? "";
      if (label !== shown) {
        shown = label;
        putCall(label);
        if (callRef.current) callRef.current.dataset.call = aimed?.id ?? "";
      }
      const boardId = (aimed?.kind === "lesson" ? aimed.id : calls.find((call) => call.place === "front")?.id) ?? "";
      if (boardId && boardId !== boardFor) {
        boardFor = boardId;
        const title = calls.find((call) => call.id === boardId)?.title ?? boardId;
        paintBoard(board, title, [], "…");
        view.setBoard(board);
        void fetchBoard(boardId)
          .then((rows) => {
            if (stopped || boardFor !== boardId) return;
            paintBoard(board, title, rows, "No scores yet");
            view.setBoard(board);
          })
          .catch(() => {
            if (stopped || boardFor !== boardId) return;
            paintBoard(board, title, [], "The board did not load");
            view.setBoard(board);
          });
      }
      view.drawBay(
        cam,
        calls.map((call) => ({
          x: call.x,
          y: 0,
          z: call.z,
          scale: call.scale,
          yaw: Math.atan2(cam.x - call.x, cam.z - call.z),
          tone: call.place === "front" ? 1.15 : aimed?.id === call.id ? 1.2 : 0.78,
        })),
        live.crosshair,
        live.fov,
      );
      if (!pausedRef.current && frame.firePressed && aimed) onCallRef.current(aimed);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      device.destroy();
      view.destroy();
    };
  }, [props.settings.dpi, props.settings.sens, props.settings.yaw]);

  return (
    <div className="range-root" data-screen="world">
      <canvas
        ref={canvasRef}
        onClick={() => {
          const canvas = canvasRef.current;
          if (!canvas || props.paused || document.pointerLockElement === canvas) return;
          void canvas.requestPointerLock();
        }}
      />
      <p className="bay-call" ref={callRef} />
      <p className="bay-hold">Hold tab</p>
    </div>
  );
}
