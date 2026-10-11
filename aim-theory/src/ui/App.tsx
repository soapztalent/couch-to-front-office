import { useState } from "react";
import { lessonById } from "../lesson/course";
import { LessonPlayer } from "../lesson/LessonPlayer";
import { loadBests, loadDone, loadSettings, loadStep, markDone, recordScore, saveSettings, saveStep, type Settings } from "../persist/storage";
import { RangePlayer } from "../range/RangePlayer";
import type { RangeMode } from "../range/range";
import { skillById } from "../skill/course";
import { SkillPlayer } from "../skill/SkillPlayer";
import type { StepId } from "../skill/steps";
import { Home, type MenuPane } from "./Home";

type Route =
  | { name: "home" }
  | { name: "lesson"; id: string }
  | { name: "skill"; id: string }
  | { name: "range"; mode: RangeMode };

export function App() {
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [bests, setBests] = useState<Record<string, number>>(() => loadBests());
  const [done, setDone] = useState<string[]>(() => loadDone());
  const [step, setStep] = useState<StepId>(() => loadStep());
  const [route, setRoute] = useState<Route>({ name: "home" });
  const [pane, setPane] = useState<MenuPane>("continue");

  function changeSettings(next: Settings) {
    setSettings(next);
    saveSettings(next);
  }

  function home() {
    return (
      <Home
        settings={settings}
        bests={bests}
        done={done}
        step={step}
        pane={pane}
        onPane={setPane}
        onLesson={(id) => setRoute({ name: "lesson", id })}
        onSkill={(id) => setRoute({ name: "skill", id })}
        onRange={(id) => setRoute({ name: "range", mode: id as RangeMode })}
        onChangeSettings={changeSettings}
      />
    );
  }

  function record(id: string, score: number, complete: boolean) {
    const result = recordScore(id, score, complete);
    if (complete) markDone(id);
    setBests(loadBests());
    setDone(loadDone());
    return result;
  }

  if (route.name === "lesson") {
    const lesson = lessonById(route.id);
    if (!lesson) return home();
    return (
      <LessonPlayer
        key={lesson.id}
        lesson={lesson}
        settings={settings}
        best={bests[lesson.id]}
        onExit={() => setRoute({ name: "home" })}
        onName={(name) => changeSettings({ ...settings, name })}
        onRecord={(score, complete) => record(lesson.id, score, complete)}
      />
    );
  }
  if (route.name === "skill") {
    const skill = skillById(route.id);
    if (!skill) return home();
    return (
      <SkillPlayer
        key={skill.id}
        skill={skill}
        step={step}
        settings={settings}
        best={bests[skill.id]}
        onExit={() => setRoute({ name: "home" })}
        onRecord={(score, complete) => record(skill.id, score, complete)}
        onStep={(next) => {
          saveStep(next);
          setStep(next);
        }}
      />
    );
  }
  if (route.name === "range") {
    return (
      <RangePlayer
        mode={route.mode}
        settings={settings}
        best={bests[route.mode]}
        onExit={() => setRoute({ name: "home" })}
        onRecord={(score, complete) => record(route.mode, score, complete)}
      />
    );
  }
  return home();
}
