import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { createAimDevice, type AimDevice } from "../input";
import type { Settings } from "../persist/storage";
import { drawWorld } from "../sim/draw";
import { attachSurface, textSlot } from "../sim/surface";
import { buildDebrief, type Debrief } from "../sim/debrief";
import { LaneSession, type RepResult } from "../sim/lane";
import { clipAt, samplePov, timeClip, type ClipHit, type PovId, type TimedClip } from "../sim/pov";
import { Sfx } from "../sim/sfx";
import { drawShow, type ShowId } from "../sim/shows";
import { line } from "../voice/lines";
import { Speaker } from "../voice/speaker";
import type { Lesson } from "./course";

type Phase = "intro" | "explain" | "show" | "pov" | "arm" | "drill" | "pause" | "debrief";

const STEP: Record<Phase, string> = {
  intro: "Explain",
  explain: "Explain",
  show: "Show",
  pov: "Watch",
  arm: "Drill",
  drill: "Drill",
  pause: "Drill",
  debrief: "Debrief",
};

export function LessonPlayer(props: {
  lesson: Lesson;
  settings: Settings;
  best?: number;
  onExit: () => void;
  onRecord: (score: number, complete: boolean) => { best: number; isNew: boolean };
}) {
  const cinematic = Boolean(props.lesson.pov?.length);
  const firstShot = props.lesson.pov?.[0];
  const firstLine = firstShot ? line(firstShot.lines[0]) : null;
  const [phase, setPhase] = useState<Phase>(cinematic ? "pov" : "intro");
  const [povId, setPovId] = useState<PovId>(firstShot?.id ?? "edge-wide");
  const [tag, setTag] = useState(firstShot?.tag ?? "");
  const [run, setRun] = useState(0);
  const [spoken, setSpoken] = useState<string>(firstLine?.text ?? "");
  const [lineId, setLineId] = useState<string>(firstLine?.id ?? "");
  const [speaking, setSpeaking] = useState(false);
  const [beat, setBeat] = useState(0);
  const [debrief, setDebrief] = useState<Debrief | null>(null);
  const [saved, setSaved] = useState<{ best: number; isNew: boolean } | null>(null);
  const [raw, setRaw] = useState(true);
  const [lockError, setLockError] = useState(false);
  const phaseRef = useRef<Phase>("intro");
  phaseRef.current = phase;
  const speakerRef = useRef<Speaker | null>(null);
  const runRef = useRef(0);
  const drillWait = useRef<((reps: RepResult[]) => void) | null>(null);
  const skipRef = useRef<(() => void) | null>(null);
  const handoffRef = useRef<() => void>(() => {});
  const settingsRef = useRef(props.settings);
  settingsRef.current = props.settings;
  const clip = useMemo(() => {
    if (!props.lesson.pov?.length) return null;
    return timeClip(
      props.lesson.pov.map((shot) => ({
        id: shot.id,
        tag: shot.tag,
        lines: shot.lines.map((id) => {
          const script = line(id);
          return { id: script.id, text: script.text };
        }),
      })),
    );
  }, [props.lesson]);

  if (!speakerRef.current) speakerRef.current = new Speaker(setSpeaking);

  useEffect(() => {
    const speaker = speakerRef.current;
    return () => speaker?.cancel();
  }, []);

  useEffect(() => {
    if (speakerRef.current) speakerRef.current.volume = props.settings.volume;
  }, [props.settings.volume]);

  useEffect(() => {
    if (phase === "drill") speakerRef.current?.cancel();
  }, [phase]);

  function skipLine() {
    if (phaseRef.current === "pov") {
      handoffRef.current();
      return;
    }
    if (skipRef.current) skipRef.current();
    else speakerRef.current?.skip();
  }

  function onClipLine(hit: ClipHit) {
    setPovId(hit.pov);
    setTag(hit.tag);
    setLineId(hit.lineId);
    setSpoken(hit.text);
    const speaker = speakerRef.current;
    if (!speaker) return;
    speaker.volume = settingsRef.current.volume;
    void speaker.speak(line(hit.lineId));
  }

  async function present(id: string, alive: () => boolean) {
    const speaker = speakerRef.current;
    if (!speaker || !alive()) return;
    const script = line(id);
    setLineId(script.id);
    setSpoken(script.text);
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    if (!alive()) return;
    const readMs = Math.min(11000, Math.max(3200, script.text.length * 46));
    await new Promise<void>((resolve) => {
      let speechDone = false;
      let timeDone = false;
      let settled = false;
      const finish = () => {
        if (settled) return;
        if (speechDone && timeDone) {
          settled = true;
          resolve();
        }
      };
      const timer = window.setTimeout(() => {
        timeDone = true;
        finish();
      }, readMs);
      skipRef.current = () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        speaker.skip();
        resolve();
      };
      void speaker.speak(script).finally(() => {
        speechDone = true;
        finish();
      });
    });
    skipRef.current = null;
  }

  async function playBeat(id: string, alive: () => boolean, ms: number) {
    const speaker = speakerRef.current;
    if (!speaker || !alive()) return;
    const script = line(id);
    setLineId(script.id);
    setSpoken(script.text);
    await new Promise<void>((resolve) => {
      let speechDone = false;
      let timeDone = false;
      let settled = false;
      const finish = () => {
        if (settled) return;
        if (speechDone && timeDone) {
          settled = true;
          resolve();
        }
      };
      const timer = window.setTimeout(() => {
        timeDone = true;
        finish();
      }, ms);
      skipRef.current = () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        speaker.skip();
        resolve();
      };
      void speaker.speak(script).finally(() => {
        speechDone = true;
        finish();
      });
    });
    skipRef.current = null;
  }

  useEffect(() => {
    if (!props.lesson.pov?.length) return;
    const speaker = speakerRef.current;
    if (!speaker) return;
    const token = ++runRef.current;
    let handed = false;
    speaker.volume = settingsRef.current.volume;
    const alive = () => token === runRef.current;
    const resultsPromise = new Promise<RepResult[]>((resolve) => {
      drillWait.current = resolve;
    });
    handoffRef.current = () => {
      if (handed || !alive()) return;
      handed = true;
      speaker.cancel();
      setPhase("arm");
      const brief = line(props.lesson.brief);
      setLineId(brief.id);
      setSpoken(brief.text);
      void speaker.speak(brief);
    };
    void (async () => {
      const results = await resultsPromise;
      if (!alive()) return;
      const report = buildDebrief(props.lesson.id, results);
      const complete = results.length >= props.lesson.reps.length;
      const record = props.onRecord(report.score, complete);
      setSaved(record);
      setDebrief(report);
      setPhase("debrief");
      for (const script of report.lines) {
        if (!alive()) return;
        await playBeat(script.id, alive, Math.min(7000, Math.max(2200, script.text.length * 40)));
      }
    })();
    return () => {
      runRef.current += 1;
      handed = true;
      speaker.cancel();
      drillWait.current = null;
    };
    // The clip clock lives in the canvas. This only arms the drill handoff.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.lesson.id, run]);

  async function begin() {
    const speaker = speakerRef.current;
    if (!speaker) return;
    const token = ++runRef.current;
    speaker.volume = settingsRef.current.volume;
    const alive = () => token === runRef.current;
    setPhase("explain");
    for (const id of props.lesson.explain) {
      if (!alive()) return;
      await present(id, alive);
    }
    for (let i = 0; i < props.lesson.showBeats.length; i += 1) {
      if (!alive()) return;
      setPhase("show");
      setBeat(i);
      await present(props.lesson.showBeats[i], alive);
    }
    if (!alive()) return;
    setPhase("arm");
    const brief = line(props.lesson.brief);
    setLineId(brief.id);
    setSpoken(brief.text);
    const resultsPromise = new Promise<RepResult[]>((resolve) => {
      drillWait.current = resolve;
    });
    void speaker.speak(brief);
    const results = await resultsPromise;
    if (!alive()) return;
    const report = buildDebrief(props.lesson.id, results);
    const complete = results.length >= props.lesson.reps.length;
    const record = props.onRecord(report.score, complete);
    setSaved(record);
    setDebrief(report);
    setPhase("debrief");
    for (const script of report.lines) {
      if (!alive()) return;
      await present(script.id, alive);
    }
  }

  function endDrill(session: LaneSession | null) {
    if (session && session.phase !== "done") session.finishEarly();
    drillWait.current?.(session?.results ?? []);
    drillWait.current = null;
  }

  if (cinematic && clip && (phase === "pov" || phase === "debrief")) {
    return (
      <div data-screen="lesson" data-lesson={props.lesson.id} data-phase={phase} data-pov={povId} data-line-id={lineId}>
        <PovCanvas key={run} clip={clip} frozen={phase === "debrief"} settings={props.settings} onLine={onClipLine} onEnd={() => handoffRef.current()} />
        <div className="pov-chrome">
          <button
            className="text-btn"
            onClick={() => {
              runRef.current += 1;
              speakerRef.current?.cancel();
              props.onExit();
            }}
          >
            Back
          </button>
          <strong className="pov-tag">{phase === "debrief" ? "DONE" : tag}</strong>
          {phase === "pov" ? (
            <button className="ghost-btn" onClick={skipLine}>
              Skip
            </button>
          ) : (
            <span />
          )}
        </div>
        {phase === "pov" ? (
          <p className="pov-line" data-coach-line={lineId}>
            {spoken}
          </p>
        ) : null}
        {phase === "debrief" && debrief ? (
          <div className="pov-debrief" data-score={debrief.score}>
            <b>{debrief.score}</b>
            <p>{debrief.right}</p>
            <p>{debrief.fix}</p>
            <p data-coach-line={lineId}>{spoken}</p>
            <div className="row">
              <button className="solid-btn" onClick={props.onExit}>
                Course
              </button>
              <button
                className="ghost-btn"
                onClick={() => {
                  setDebrief(null);
                  setSaved(null);
                  setPhase("pov");
                  setRun((n) => n + 1);
                }}
              >
                Run it again
              </button>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="stage" data-screen="lesson" data-lesson={props.lesson.id} data-phase={phase} data-line-id={lineId}>
      {phase === "arm" || phase === "drill" || phase === "pause" ? (
        <DrillStage
          lesson={props.lesson}
          settings={props.settings}
          phase={phase}
          setPhase={setPhase}
          phaseRef={phaseRef}
          spoken={spoken}
          raw={raw}
          lockError={lockError}
          onRaw={setRaw}
          onLockError={setLockError}
          onDone={(results) => {
            drillWait.current?.(results);
            drillWait.current = null;
          }}
          onExit={() => {
            runRef.current += 1;
            speakerRef.current?.cancel();
            props.onExit();
          }}
          onEnd={endDrill}
        />
      ) : (
        <>
          <div className="stage-head">
            <button
              className="text-btn"
              onClick={() => {
                runRef.current += 1;
                speakerRef.current?.cancel();
                props.onExit();
              }}
            >
              Back
            </button>
            <div className="steps">
              {(["Explain", "Show", "Drill", "Debrief"] as const).map((name) => (
                <i key={name} className={STEP[phase] === name ? "on" : ""}>
                  {name}
                </i>
              ))}
            </div>
            <button className="ghost-btn" onClick={skipLine}>
              Skip line
            </button>
          </div>
          {phase === "intro" ? (
            <section className="paper">
              <div className="kicker">
                {props.lesson.index} · {props.best != null ? `Best ${props.best}` : "No score yet"}
              </div>
              <h1>{props.lesson.title}</h1>
              <p>{props.lesson.summary}</p>
              <p>{props.lesson.control}</p>
              <div className="row">
                <button className="solid-btn" onClick={() => void begin()}>
                  Begin
                </button>
              </div>
            </section>
          ) : null}
          {phase === "explain" ? (
            <section className="paper">
              <div className="who">
                <i className={speaking ? "dot on" : "dot"} /> Coach
              </div>
              <p className="caption" data-coach-line={lineId}>
                {spoken}
              </p>
            </section>
          ) : null}
          {phase === "show" && props.lesson.show ? (
            <div>
              <ShowCanvas scene={props.lesson.show} beat={beat} />
              <div className="caption-bar">
                <div className="who">
                  <i className={speaking ? "dot on" : "dot"} /> Coach
                </div>
                <p data-coach-line={lineId}>{spoken}</p>
              </div>
            </div>
          ) : null}
          {phase === "debrief" && debrief ? (
            <section className="paper" data-score={debrief.score}>
              <div className="kicker">{props.lesson.title}</div>
              <h1>{debrief.score}</h1>
              {saved?.isNew ? <p className="pb">New personal best</p> : <p>Best {saved?.best ?? props.best ?? debrief.score}</p>}
              <div className="split">
                <article>
                  <strong>Right</strong>
                  <p>{debrief.right}</p>
                </article>
                <article>
                  <strong>Fix</strong>
                  <p>{debrief.fix}</p>
                </article>
              </div>
              <div className="who">
                <i className={speaking ? "dot on" : "dot"} /> Coach
              </div>
              <p data-coach-line={lineId}>{spoken}</p>
              <div className="row">
                <button className="solid-btn" onClick={props.onExit}>
                  Course
                </button>
                <button
                  className="ghost-btn"
                  onClick={() => {
                    setDebrief(null);
                    setSaved(null);
                    setPhase("intro");
                  }}
                >
                  Run it again
                </button>
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}

function ShowCanvas(props: { scene: ShowId; beat: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let stop = false;
    const start = performance.now();
    const surface = attachSurface(canvas);
    const frame = (now: number) => {
      if (stop) return;
      const { cssW, cssH } = surface.size();
      if (cssW >= 2 && cssH >= 2) drawShow(surface.ctx, cssW, cssH, props.scene, props.beat, (now - start) / 1000);
      requestAnimationFrame(frame);
    };
    const id = requestAnimationFrame(frame);
    return () => {
      stop = true;
      cancelAnimationFrame(id);
      surface.destroy();
    };
  }, [props.scene, props.beat]);
  return (
    <div className="show-wrap">
      <canvas ref={ref} className="show-canvas" />
    </div>
  );
}

function DrillStage(props: {
  lesson: Lesson;
  settings: Settings;
  phase: Phase;
  setPhase: (p: Phase) => void;
  phaseRef: MutableRefObject<Phase>;
  spoken: string;
  raw: boolean;
  lockError: boolean;
  onRaw: (raw: boolean) => void;
  onLockError: (bad: boolean) => void;
  onDone: (results: RepResult[]) => void;
  onExit: () => void;
  onEnd: (session: LaneSession | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const repRef = useRef<HTMLSpanElement>(null);
  const cueRef = useRef<HTMLSpanElement>(null);
  const stateRef = useRef<HTMLSpanElement>(null);
  const bannerRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<LaneSession | null>(null);
  const deviceRef = useRef<AimDevice | null>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const settings = props.settings;
    const device = createAimDevice({ dpi: settings.dpi, sens: settings.sens, yaw: settings.yaw });
    const sfx = new Sfx();
    sfx.volume = settings.sfx;
    const session = new LaneSession(props.lesson.reps, (id) => line(id).text, props.lesson.isolate);
    deviceRef.current = device;
    sessionRef.current = session;
    doneRef.current = false;
    let last = performance.now();
    let raf = 0;
    let stopped = false;

    const onLock = () => {
      if (doneRef.current) return;
      if (device.locked && (props.phaseRef.current === "arm" || props.phaseRef.current === "pause")) {
        props.setPhase("drill");
      } else if (!device.locked && props.phaseRef.current === "drill") {
        props.setPhase("pause");
      }
    };
    document.addEventListener("pointerlockchange", onLock);

    const onKey = (e: KeyboardEvent) => {
      if (e.code === "KeyR" && !e.repeat && device.locked && !doneRef.current) {
        sessionRef.current = new LaneSession(props.lesson.reps, (id) => line(id).text, props.lesson.isolate);
      }
    };
    window.addEventListener("keydown", onKey);

    const surface = attachSurface(canvas);
    const putRep = textSlot(repRef.current);
    const putCue = textSlot(cueRef.current);
    const putState = textSlot(stateRef.current);
    const putBanner = textSlot(bannerRef.current);
    const idle = { yaw: 0, pitch: 0, strafe: 0, forward: 0, firePressed: false, fireHeld: false };
    let held: { kind: "hit" | "miss" | "hurt"; until: number } | null = null;

    const tick = (now: number) => {
      if (stopped) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const current = sessionRef.current;
      if (!current) return;
      const frame = device.consume();
      const playing = props.phaseRef.current === "drill";
      current.update(playing ? dt : 0, playing ? frame : idle);
      if (current.pulse === "hit") sfx.hit();
      if (current.pulse === "miss") sfx.miss();
      if (current.pulse === "hurt") sfx.hurt();
      if (current.pulse) held = { kind: current.pulse, until: now + 140 };
      const flash = held && now < held.until ? held.kind : null;
      const view = current.view();
      const { cssW, cssH } = surface.size();
      if (cssW >= 2 && cssH >= 2) {
        drawWorld(surface.ctx, cssW, cssH, {
          camera: view.camera,
          walls: view.walls,
          actors: view.actors,
          pip: view.pip,
          fov: settings.fov,
          crosshair: settings.crosshair,
          flash,
        });
      }
      putRep(`${view.rep}/${view.repCount}`);
      putCue(view.cue);
      putState(view.exposed ? "EXPOSED" : "COVER");
      putBanner(view.banner);
      if (current.done && !doneRef.current) {
        doneRef.current = true;
        device.release();
        props.onDone(current.results);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      document.removeEventListener("pointerlockchange", onLock);
      window.removeEventListener("keydown", onKey);
      surface.destroy();
      device.destroy();
    };
    // The drill owns one session for this mount. Restart replaces the ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.lesson.id]);

  async function arm() {
    const canvas = canvasRef.current;
    const device = deviceRef.current;
    if (!canvas || !device) return;
    props.onLockError(false);
    const result = await device.requestLock(canvas);
    props.onRaw(result.raw);
    props.onLockError(!result.ok);
  }

  return (
    <div className="range-root">
      <canvas ref={canvasRef} />
      <div className="hud">
        <div className="hud-top">
          <span>
            <span ref={repRef} /> <span ref={stateRef} />
          </span>
          <strong ref={cueRef} />
          <span />
        </div>
        <div className="banner" ref={bannerRef} />
      </div>
      {props.phase !== "drill" ? (
        <div className="arm">
          <h2>{props.phase === "pause" ? "Paused" : props.lesson.title}</h2>
          <p>{props.phase === "pause" ? "Esc let the mouse go. Click to get back in." : props.spoken}</p>
          {props.lesson.pov ? null : <p>{props.lesson.control}</p>}
          {!props.raw ? <p className="warn">Raw input was not granted. OS pointer settings may change your cm/360.</p> : null}
          {props.lockError ? <p className="warn">Pointer lock did not start. Click again, in the page.</p> : null}
          <button className="solid-btn" onClick={() => void arm()}>
            Click to arm
          </button>
        </div>
      ) : null}
      <button
        className="ghost-btn corner"
        onClick={() => {
          doneRef.current = true;
          deviceRef.current?.release();
          props.onEnd(sessionRef.current);
        }}
      >
        End drill
      </button>
    </div>
  );
}

function PovCanvas(props: {
  clip: TimedClip;
  frozen: boolean;
  settings: Settings;
  onLine: (hit: ClipHit) => void;
  onEnd: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const clipRef = useRef(props.clip);
  const frozenRef = useRef(props.frozen);
  const onLineRef = useRef(props.onLine);
  const onEndRef = useRef(props.onEnd);
  clipRef.current = props.clip;
  frozenRef.current = props.frozen;
  onLineRef.current = props.onLine;
  onEndRef.current = props.onEnd;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const surface = attachSurface(canvas);
    const started = performance.now();
    let raf = 0;
    let stopped = false;
    let ended = false;
    let shown = "";
    const tick = (now: number) => {
      if (stopped) return;
      const clip = clipRef.current;
      const frozen = frozenRef.current;
      const elapsed = (now - started) / 1000;
      const t = frozen ? Math.max(0, clip.total - 0.05) : elapsed;
      const hit = clipAt(clip, t);
      const { cssW, cssH } = surface.size();
      if (cssW >= 2 && cssH >= 2) {
        const sample = samplePov(hit.pov, hit.local);
        drawWorld(surface.ctx, cssW, cssH, {
          camera: sample.camera,
          walls: sample.walls,
          actors: sample.actors,
          pip: sample.pip,
          fov: props.settings.fov,
          crosshair: props.settings.crosshair,
          flash: null,
        });
      }
      if (!frozen && hit.lineId !== shown) {
        shown = hit.lineId;
        onLineRef.current(hit);
      }
      if (!frozen && !ended && elapsed >= clip.total) {
        ended = true;
        onEndRef.current();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      surface.destroy();
    };
    // Settings that change the picture. The clock stays on this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.settings.fov, props.settings.crosshair]);

  return (
    <div className="range-root">
      <canvas ref={canvasRef} />
    </div>
  );
}
