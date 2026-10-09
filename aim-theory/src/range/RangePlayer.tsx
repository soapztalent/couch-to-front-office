import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { createAimDevice, type AimDevice } from "../input";
import type { Settings } from "../persist/storage";
import { drawCrosshair } from "../sim/draw";
import { forward, projectPoint } from "../sim/geom";
import { Sfx } from "../sim/sfx";
import { line } from "../voice/lines";
import { Speaker } from "../voice/speaker";
import { RangeSession, type RangeMode } from "./range";

const COPY: Record<RangeMode, { title: string; line: string }> = {
  snap: { title: "Snap", line: "range-snap" },
  follow: { title: "Follow", line: "range-follow" },
  chain: { title: "Chain", line: "range-chain" },
  rush: { title: "Rush", line: "range-rush" },
  line: { title: "Line", line: "range-line" },
};

export function RangePlayer(props: {
  mode: RangeMode;
  settings: Settings;
  best?: number;
  onExit: () => void;
  onRecord: (score: number, complete: boolean) => { best: number; isNew: boolean };
}) {
  const meta = COPY[props.mode];
  const [phase, setPhase] = useState<"intro" | "arm" | "live" | "pause" | "done">("intro");
  const [spoken, setSpoken] = useState(line(meta.line).text);
  const [speaking, setSpeaking] = useState(false);
  const [result, setResult] = useState<{ score: number; hits: number; misses: number; note: string; isNew: boolean; best: number } | null>(null);
  const speakerRef = useRef<Speaker | null>(null);
  if (!speakerRef.current) speakerRef.current = new Speaker(setSpeaking);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  useEffect(() => () => speakerRef.current?.cancel(), []);

  async function begin() {
    const speaker = speakerRef.current;
    if (!speaker) return;
    speaker.volume = props.settings.volume;
    const script = line(meta.line);
    setSpoken(script.text);
    setPhase("arm");
    await speaker.speak(script);
  }

  return (
    <div data-screen="range" data-mode={props.mode} data-phase={phase}>
      {phase === "intro" || phase === "done" ? (
        <div className="stage">
          <div className="stage-head">
            <button className="text-btn" onClick={props.onExit}>
              Back
            </button>
            <span className="kicker">Range · mouse</span>
            <span />
          </div>
          <section className="paper">
            {phase === "intro" ? (
              <>
                <div className="kicker">{props.best != null ? `Best ${props.best}` : "20 seconds"}</div>
                <h1>{meta.title}</h1>
                <p className="caption">{spoken}</p>
                <button className="solid-btn" onClick={() => void begin()}>
                  Begin
                </button>
              </>
            ) : result ? (
              <>
                <div className="kicker">{meta.title}</div>
                <h1 data-score={result.score}>{result.score}</h1>
                {result.isNew ? <p className="pb">New personal best</p> : <p>Best {result.best}</p>}
                <p>
                  Hits {result.hits} · Misses {result.misses}
                </p>
                <div className="who">
                  <i className={speaking ? "dot on" : "dot"} /> Coach
                </div>
                <p>{result.note}</p>
                <div className="row">
                  <button className="solid-btn" onClick={props.onExit}>
                    Course
                  </button>
                </div>
              </>
            ) : null}
          </section>
        </div>
      ) : (
        <RangeCanvas
          mode={props.mode}
          settings={props.settings}
          phase={phase}
          phaseRef={phaseRef}
          setPhase={setPhase}
          onDone={(score, hits, misses, smooth) => {
            const saved = props.onRecord(score, true);
            const note =
              props.mode === "line" && smooth > 1.4
                ? line("range-smooth-fix").text
                : misses > hits
                  ? line("range-fix").text
                  : line("range-good").text;
            setResult({ score, hits, misses, note, isNew: saved.isNew, best: saved.best });
            setSpoken(note);
            setPhase("done");
            const id = misses > hits ? "range-fix" : props.mode === "line" && smooth > 1.4 ? "range-smooth-fix" : "range-good";
            void speakerRef.current?.speak(line(id));
          }}
          onExit={props.onExit}
        />
      )}
    </div>
  );
}

function RangeCanvas(props: {
  mode: RangeMode;
  settings: Settings;
  phase: "arm" | "live" | "pause";
  phaseRef: MutableRefObject<"intro" | "arm" | "live" | "pause" | "done">;
  setPhase: (p: "arm" | "live" | "pause" | "done") => void;
  onDone: (score: number, hits: number, misses: number, smooth: number) => void;
  onExit: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const deviceRef = useRef<AimDevice | null>(null);
  const scoreRef = useRef<HTMLSpanElement>(null);
  const timeRef = useRef<HTMLSpanElement>(null);
  const accRef = useRef<HTMLSpanElement>(null);
  const doneRef = useRef(false);
  const [lockError, setLockError] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const device = createAimDevice({
      dpi: props.settings.dpi,
      sens: props.settings.sens,
      yaw: props.settings.yaw,
    });
    deviceRef.current = device;
    const sfx = new Sfx();
    sfx.volume = props.settings.sfx;
    const session = new RangeSession(props.mode, 20, (Math.random() * 1e9) | 0);
    let last = performance.now();
    let raf = 0;
    let stopped = false;
    const onLock = () => {
      if (doneRef.current) return;
      if (device.locked && (props.phaseRef.current === "arm" || props.phaseRef.current === "pause")) props.setPhase("live");
      else if (!device.locked && props.phaseRef.current === "live") props.setPhase("pause");
    };
    document.addEventListener("pointerlockchange", onLock);
    const tick = (now: number) => {
      if (stopped) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const frame = device.consume();
      const playing = props.phaseRef.current === "live";
      const hits = session.hits;
      const misses = session.misses;
      if (playing) session.update(dt, frame.yaw, frame.pitch, frame.firePressed, frame.fireHeld);
      if (session.hits > hits) sfx.hit();
      if (session.misses > misses) sfx.miss();
      const snap = session.snapshot();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = canvas.clientWidth || window.innerWidth;
      const h = canvas.clientHeight || window.innerHeight;
      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
      }
      const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = "#12110e";
        ctx.fillRect(0, 0, w, h);
        const view = { w, h, fov: props.settings.fov };
        const cam = { x: 0, y: 0, z: 0, yaw: (session.yaw * Math.PI) / 180, pitch: (session.pitch * Math.PI) / 180 };
        for (const target of snap.targets) {
          const dir = forward((target.yaw * Math.PI) / 180, (target.pitch * Math.PI) / 180);
          const p = projectPoint(cam, { x: dir.x * 8, y: dir.y * 8, z: dir.z * 8 }, view);
          if (!p.visible) continue;
          const edge = projectPoint(
            cam,
            {
              x: dir.x * 8 + 0.12,
              y: dir.y * 8,
              z: dir.z * 8,
            },
            view,
          );
          const r = Math.max(8, Math.hypot(edge.x - p.x, edge.y - p.y) * (target.radius / 1.2));
          ctx.beginPath();
          ctx.fillStyle = props.mode === "chain" && !target.live ? "#5c574c" : "#f4efe4";
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.fillStyle = "#1a1814";
          ctx.arc(p.x, p.y, Math.max(2, r * 0.18), 0, Math.PI * 2);
          ctx.fill();
        }
        drawCrosshair(ctx, w, h, props.settings.crosshair);
      }
      if (scoreRef.current) scoreRef.current.textContent = String(snap.score);
      if (timeRef.current) timeRef.current.textContent = snap.secondsLeft.toFixed(1);
      const acc = snap.hits + snap.misses === 0 ? "—" : `${Math.round((snap.hits / (snap.hits + snap.misses)) * 100)}%`;
      if (accRef.current) accRef.current.textContent = acc;
      if (session.finished && !doneRef.current) {
        doneRef.current = true;
        device.release();
        props.onDone(snap.score, snap.hits, snap.misses, session.smoothness());
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      document.removeEventListener("pointerlockchange", onLock);
      device.destroy();
    };
  }, [props.mode]);

  return (
    <div className="range-root">
      <canvas ref={canvasRef} />
      <div className="hud">
        <div className="hud-top">
          <span ref={timeRef} />
          <strong ref={scoreRef} />
          <span ref={accRef} />
        </div>
      </div>
      {props.phase !== "live" ? (
        <div className="arm">
          <h2>{props.phase === "pause" ? "Paused" : COPY[props.mode].title}</h2>
          <p>{props.phase === "pause" ? "Click to get back in." : "Click to arm. Esc releases the mouse. Misses cost score."}</p>
          {lockError ? <p className="warn">Pointer lock did not start. Click again.</p> : null}
          <button
            className="solid-btn"
            onClick={() => {
              const canvas = canvasRef.current;
              const lockedDevice = deviceRef.current;
              if (!canvas || !lockedDevice) return;
              void lockedDevice.requestLock(canvas).then((result) => setLockError(!result.ok));
            }}
          >
            Click to arm
          </button>
        </div>
      ) : null}
      <button className="ghost-btn corner" onClick={props.onExit}>
        Leave
      </button>
    </div>
  );
}
