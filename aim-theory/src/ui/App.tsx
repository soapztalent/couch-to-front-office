import { useEffect, useState } from "react";
import { lessonById } from "../lesson/course";
import { LessonPlayer } from "../lesson/LessonPlayer";
import { loadBests, loadDone, loadSettings, loadStep, markDone, recordScore, saveSettings, saveStep, type Settings } from "../persist/storage";
import { RangePlayer } from "../range/RangePlayer";
import type { RangeMode } from "../range/range";
import { skillById } from "../skill/course";
import { SkillPlayer } from "../skill/SkillPlayer";
import type { StepId } from "../skill/steps";
import { nextFight, type WorldCall } from "../world/bay";
import { Bay } from "./Bay";
import { FigureShot } from "./FigureShot";
import { Settings as SettingsPanel } from "./Settings";

type Route =
  | { name: "world" }
  | { name: "lesson"; id: string }
  | { name: "skill"; id: string }
  | { name: "range"; mode: RangeMode };

export function App() {
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [bests, setBests] = useState<Record<string, number>>(() => loadBests());
  const [done, setDone] = useState<string[]>(() => loadDone());
  const [step, setStep] = useState<StepId>(() => loadStep());
  const [route, setRoute] = useState<Route>(() => ({ name: "lesson", id: nextFight(loadDone()).id }));
  const [held, setHeld] = useState(false);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.code !== "Tab") return;
      event.preventDefault();
      setHeld(true);
    };
    const up = (event: KeyboardEvent) => {
      if (event.code !== "Tab") return;
      event.preventDefault();
      setHeld(false);
    };
    const blur = () => setHeld(false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);

  useEffect(() => {
    if (held && document.pointerLockElement) document.exitPointerLock();
  }, [held]);

  function changeSettings(next: Settings) {
    setSettings(next);
    saveSettings(next);
  }

  function record(id: string, score: number, complete: boolean) {
    const result = recordScore(id, score, complete);
    if (complete) markDone(id);
    setBests(loadBests());
    setDone(loadDone());
    return result;
  }

  function startCall(call: WorldCall) {
    if (call.kind === "skill") setRoute({ name: "skill", id: call.id });
    else if (call.kind === "range") setRoute({ name: "range", mode: call.id as RangeMode });
    else setRoute({ name: "lesson", id: call.id });
  }

  function world() {
    return <Bay settings={settings} done={done} paused={held} onCall={startCall} />;
  }

  const shot = new URLSearchParams(window.location.search).get("shot");
  let screen = world();
  if (route.name === "lesson") {
    const lesson = lessonById(route.id);
    screen = lesson ? (
      <LessonPlayer
        key={lesson.id}
        lesson={lesson}
        settings={settings}
        best={bests[lesson.id]}
        paused={held}
        onExit={() => setRoute({ name: "world" })}
        onName={(name) => changeSettings({ ...settings, name })}
        onRecord={(score, complete) => record(lesson.id, score, complete)}
      />
    ) : (
      world()
    );
  } else if (route.name === "skill") {
    const skill = skillById(route.id);
    screen = skill ? (
      <SkillPlayer
        key={skill.id}
        skill={skill}
        step={step}
        settings={settings}
        best={bests[skill.id]}
        onExit={() => setRoute({ name: "world" })}
        onRecord={(score, complete) => record(skill.id, score, complete)}
        onStep={(next) => {
          saveStep(next);
          setStep(next);
        }}
      />
    ) : (
      world()
    );
  } else if (route.name === "range") {
    screen = (
      <RangePlayer
        mode={route.mode}
        settings={settings}
        best={bests[route.mode]}
        onExit={() => setRoute({ name: "world" })}
        onRecord={(score, complete) => record(route.mode, score, complete)}
      />
    );
  }

  if (shot === "front" || shot === "back" || shot === "drill") screen = <FigureShot view={shot} />;

  return (
    <>
      {screen}
      {held ? (
        <div className="tab-pause" data-pause="tab">
          <p className="kicker">Hold tab</p>
          <SettingsPanel settings={settings} onChange={changeSettings} />
        </div>
      ) : null}
    </>
  );
}
