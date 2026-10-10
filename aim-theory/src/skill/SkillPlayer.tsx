import { useEffect, useMemo, useRef, useState } from "react";
import { createAimDevice, type AimDevice } from "../input";
import type { Settings } from "../persist/storage";
import { RangeSession } from "../range/range";
import { drawRange } from "../range/draw";
import { attachSurface, textSlot } from "../sim/surface";
import { Sfx } from "../sim/sfx";
import { line } from "../voice/lines";
import { Speaker } from "../voice/speaker";
import { sampleShot, sampleStep, skillAt, skillTimeline, type SkillMark } from "./clip";
import { CheckSession } from "./check";
import type { SkillLesson } from "./course";
import { SKILL_LABEL } from "./course";
import { placeStep, STEP_TITLE, tuneFor, type StepId } from "./steps";

type Phase = "clip" | "arm" | "live" | "pause" | "debrief";

const MODE = { mark: "snap", glide: "follow", relay: "chain", step: "snap" } as const;

export function SkillPlayer(props: {
  skill: SkillLesson;
  step: StepId;
  settings: Settings;
  best?: number;
  onExit: () => void;
  onRecord: (score: number, complete: boolean) => { best: number; isNew: boolean };
  onStep: (step: StepId) => void;
}) {
  const [phase, setPhase] = useState<Phase>("clip");
  const [lineId, setLineId] = useState(props.skill.beats[0].lineId);
  const [spoken, setSpoken] = useState(line(props.skill.beats[0].lineId).text);
  const [tag, setTag] = useState(props.skill.title.toUpperCase());
  const [report, setReport] = useState<{ score: number; note: string; detail: string; isNew: boolean; best: number } | null>(null);
  const speakerRef = useRef<Speaker | null>(null);
  const phaseRef = useRef<Phase>("clip");
  phaseRef.current = phase;
  if (!speakerRef.current) speakerRef.current = new Speaker();
  const settingsRef = useRef(props.settings);
  settingsRef.current = props.settings;

  const timed = useMemo(
    () =>
      skillTimeline(
        props.skill.beats.map((beat) => {
          const script = line(beat.lineId);
          return { shot: beat.shot, lineId: script.id, text: script.text };
        }),
      ),
    [props.skill],
  );

  useEffect(() => () => speakerRef.current?.cancel(), []);
  useEffect(() => {
    if (phase === "live") speakerRef.current?.cancel();
  }, [phase]);

  function leave() {
    speakerRef.current?.cancel();
    props.onExit();
  }

  function onMark(mark: SkillMark) {
    setLineId(mark.lineId);
    setSpoken(mark.text);
    const speaker = speakerRef.current;
    if (!speaker) return;
    speaker.volume = settingsRef.current.volume;
    void speaker.speak(line(mark.lineId));
  }

  function handoff() {
    if (phaseRef.current !== "clip") return;
    speakerRef.current?.cancel();
    setPhase("arm");
    const brief = line(props.skill.brief);
    setLineId(brief.id);
    setSpoken(brief.text);
    speakerRef.current!.volume = settingsRef.current.volume;
    void speakerRef.current?.speak(brief);
  }

  if (phase === "clip") {
    return (
      <div data-screen="skill" data-skill={props.skill.id} data-phase="clip" data-line-id={lineId} data-step={props.step}>
        <ClipCanvas
          timed={timed}
          stepMix={props.skill.id === "step"}
          settings={props.settings}
          onMark={onMark}
          onFrame={setTag}
          onEnd={handoff}
        />
        <div className="pov-chrome">
          <button className="text-btn" onClick={leave}>
            Back
          </button>
          <strong className="pov-tag">{tag}</strong>
          <button className="ghost-btn" onClick={handoff}>
            Skip
          </button>
        </div>
        <p className="pov-line" data-coach-line={lineId}>
          {spoken}
        </p>
      </div>
    );
  }

  return (
    <div data-screen="skill" data-skill={props.skill.id} data-phase={phase} data-line-id={lineId} data-step={props.step}>
      <DrillCanvas
        skill={props.skill}
        step={props.step}
        settings={props.settings}
        phaseRef={phaseRef}
        setPhase={setPhase}
        onExit={leave}
        onDone={(score, clean, complete, scores) => {
          const saved = props.onRecord(score, complete);
          let noteId = clean ? props.skill.good : props.skill.fix;
          let detail = clean ? line(props.skill.good).text : line(props.skill.fix).text;
          if (props.skill.id === "step" && scores) {
            const placed = placeStep(scores, props.step);
            if (complete && placed.up) {
              props.onStep(placed.step);
              noteId = "step-up";
              detail = `${STEP_TITLE[placed.step]}. ${line("step-up").text}`;
            } else {
              noteId = "step-stay";
              detail = `${STEP_TITLE[props.step]}. ${SKILL_LABEL[placed.weak]} fell short.`;
            }
          }
          setLineId(noteId);
          setSpoken(detail);
          setReport({ score, note: line(noteId).text, detail, isNew: saved.isNew, best: saved.best });
          setPhase("debrief");
          speakerRef.current!.volume = settingsRef.current.volume;
          void speakerRef.current?.speak(line(noteId));
        }}
      />
      {phase === "debrief" && report ? (
        <div className="pov-debrief" data-score={report.score}>
          <b>{report.score}</b>
          {report.isNew ? <p className="pb">New personal best</p> : <p>Best {report.best}</p>}
          <p>{report.detail}</p>
          <div className="row">
            <button className="solid-btn" onClick={leave}>
              Course
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ClipCanvas(props: {
  timed: { marks: SkillMark[]; total: number };
  stepMix: boolean;
  settings: Settings;
  onMark: (mark: SkillMark) => void;
  onFrame: (tag: string) => void;
  onEnd: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timedRef = useRef(props.timed);
  const onMarkRef = useRef(props.onMark);
  const onFrameRef = useRef(props.onFrame);
  const onEndRef = useRef(props.onEnd);
  const settingsRef = useRef(props.settings);
  timedRef.current = props.timed;
  onMarkRef.current = props.onMark;
  onFrameRef.current = props.onFrame;
  onEndRef.current = props.onEnd;
  settingsRef.current = props.settings;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const surface = attachSurface(canvas);
    const started = performance.now();
    let shown = -1;
    let ended = false;
    let stopped = false;
    let raf = 0;
    let tag = "";
    const tick = (now: number) => {
      if (stopped) return;
      const timed = timedRef.current;
      const elapsed = (now - started) / 1000;
      const hit = skillAt(timed.marks, timed.total, elapsed);
      const frame = props.stepMix ? sampleStep(hit.local) : sampleShot(hit.shot, hit.local);
      const { cssW, cssH } = surface.size();
      if (cssW >= 2 && cssH >= 2) {
        const settings = settingsRef.current;
        drawRange(surface.ctx, cssW, cssH, {
          fov: settings.fov,
          crosshair: settings.crosshair,
          yaw: frame.yaw,
          pitch: frame.pitch,
          targets: frame.targets,
          dimIdle: true,
          grid: true,
          flash: frame.flash,
        });
      }
      const index = timed.marks.findIndex((mark) => mark.lineId === hit.lineId && mark.t0 === hit.t0);
      if (index !== shown) {
        shown = index;
        onMarkRef.current(hit);
      }
      const nextTag = frame.shot.toUpperCase();
      if (nextTag !== tag) {
        tag = nextTag;
        onFrameRef.current(nextTag);
      }
      if (!ended && elapsed >= timed.total) {
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
  }, [props.stepMix]);

  return (
    <div className="range-root">
      <canvas ref={canvasRef} />
    </div>
  );
}

function DrillCanvas(props: {
  skill: SkillLesson;
  step: StepId;
  settings: Settings;
  phaseRef: { current: Phase };
  setPhase: (phase: Phase) => void;
  onExit: () => void;
  onDone: (score: number, clean: boolean, complete: boolean, scores: ReturnType<CheckSession["scores"]> | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const deviceRef = useRef<AimDevice | null>(null);
  const scoreRef = useRef<HTMLSpanElement>(null);
  const timeRef = useRef<HTMLSpanElement>(null);
  const nameRef = useRef<HTMLSpanElement>(null);
  const doneRef = useRef(false);
  const [lockError, setLockError] = useState(false);
  const [raw, setRaw] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const settings = props.settings;
    const device = createAimDevice({ dpi: settings.dpi, sens: settings.sens, yaw: settings.yaw });
    deviceRef.current = device;
    const sfx = new Sfx();
    sfx.volume = settings.sfx;
    const seed = (Math.random() * 1e9) | 0;
    const tune = tuneFor(props.step);
    const check = props.skill.id === "step" ? new CheckSession(props.step, seed) : null;
    const single =
      check == null
        ? new RangeSession(MODE[props.skill.id], 20, seed, tune[props.skill.id === "step" ? "mark" : props.skill.id])
        : null;
    let last = performance.now();
    let raf = 0;
    let stopped = false;
    const onLock = () => {
      if (doneRef.current) return;
      if (device.locked && (props.phaseRef.current === "arm" || props.phaseRef.current === "pause")) props.setPhase("live");
      else if (!device.locked && props.phaseRef.current === "live") props.setPhase("pause");
    };
    document.addEventListener("pointerlockchange", onLock);
    const surface = attachSurface(canvas);
    const putScore = textSlot(scoreRef.current);
    const putTime = textSlot(timeRef.current);
    const putName = textSlot(nameRef.current);
    const finish = (complete: boolean) => {
      if (doneRef.current) return;
      doneRef.current = true;
      device.release();
      if (check) {
        const scores = check.scores();
        const snap = check.sessions.reduce((sum, session) => sum + session.snapshot().score, 0);
        const clean = scores.mark >= 0.5 && scores.glide >= 0.5 && scores.relay >= 0.5;
        props.onDone(snap, clean, complete, scores);
        return;
      }
      const snap = single!.snapshot();
      const clean = snap.hits > 0 && snap.misses <= snap.hits;
      props.onDone(snap.score, clean, complete, null);
    };
    const tick = (now: number) => {
      if (stopped) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const frame = device.consume();
      const playing = props.phaseRef.current === "live";
      const active = check ? check.sessions[check.phase] : single!;
      const hits = active.hits;
      const misses = active.misses;
      if (playing) {
        if (check) check.update(dt, frame.yaw, frame.pitch, frame.firePressed, frame.fireHeld);
        else single!.update(dt, frame.yaw, frame.pitch, frame.firePressed, frame.fireHeld);
      }
      const view = check ? check.sessions[check.phase] : single!;
      if (view.hits > hits) sfx.hit();
      if (view.misses > misses) sfx.miss();
      const snap = check ? check.snapshot() : single!.snapshot();
      const { cssW, cssH } = surface.size();
      if (cssW >= 2 && cssH >= 2) {
        drawRange(surface.ctx, cssW, cssH, {
          fov: settings.fov,
          crosshair: settings.crosshair,
          yaw: view.yaw,
          pitch: view.pitch,
          targets: view.snapshot().targets,
          dimIdle: true,
          grid: true,
        });
      }
      putScore(String(snap.score));
      putTime(snap.secondsLeft.toFixed(1));
      putName(check ? SKILL_LABEL[check.kind].toUpperCase() : props.skill.title.toUpperCase());
      const finished = check ? check.done : single!.finished;
      if (finished) finish(true);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      document.removeEventListener("pointerlockchange", onLock);
      surface.destroy();
      device.destroy();
    };
    // One session for this skill and step.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.skill.id, props.step]);

  async function arm() {
    const canvas = canvasRef.current;
    const device = deviceRef.current;
    if (!canvas || !device) return;
    setLockError(false);
    const result = await device.requestLock(canvas);
    setRaw(result.raw);
    setLockError(!result.ok);
  }

  const live = props.phaseRef.current === "live";
  return (
    <div className="range-root">
      <canvas ref={canvasRef} />
      <div className="hud">
        <div className="hud-top">
          <span ref={timeRef} />
          <strong ref={scoreRef} />
          <span ref={nameRef} />
        </div>
      </div>
      {!live && props.phaseRef.current !== "debrief" ? (
        <div className="arm">
          <h2>{props.phaseRef.current === "pause" ? "Paused" : props.skill.title}</h2>
          <p>{props.phaseRef.current === "pause" ? "Click to get back in." : spokenBrief(props.skill.brief)}</p>
          <p>
            {STEP_TITLE[props.step]} step
          </p>
          {!raw ? <p className="warn">Raw input was not granted. OS pointer settings may change your cm/360.</p> : null}
          {lockError ? <p className="warn">Pointer lock did not start. Click again.</p> : null}
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
          props.onExit();
        }}
      >
        Leave
      </button>
    </div>
  );
}

function spokenBrief(id: string): string {
  return line(id).text;
}
