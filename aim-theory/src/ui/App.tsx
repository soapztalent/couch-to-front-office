import { useState } from "react";
import { lessonById } from "../lesson/course";
import { LessonPlayer } from "../lesson/LessonPlayer";
import { loadBests, loadDone, loadSettings, markDone, recordScore, saveSettings, type Settings } from "../persist/storage";
import { RangePlayer } from "../range/RangePlayer";
import type { RangeMode } from "../range/range";
import { Home } from "./Home";
import { Settings as SettingsScreen } from "./Settings";

type Route =
  | { name: "home" }
  | { name: "settings" }
  | { name: "lesson"; id: string }
  | { name: "range"; mode: RangeMode };

export function App() {
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [bests, setBests] = useState<Record<string, number>>(() => loadBests());
  const [done, setDone] = useState<string[]>(() => loadDone());
  const [route, setRoute] = useState<Route>({ name: "home" });

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

  if (route.name === "settings") {
    return <SettingsScreen settings={settings} onChange={changeSettings} onBack={() => setRoute({ name: "home" })} />;
  }
  if (route.name === "lesson") {
    const lesson = lessonById(route.id);
    if (!lesson) return <Home settings={settings} bests={bests} done={done} onLesson={(id) => setRoute({ name: "lesson", id })} onRange={(id) => setRoute({ name: "range", mode: id as RangeMode })} onSettings={() => setRoute({ name: "settings" })} />;
    return (
      <LessonPlayer
        key={lesson.id}
        lesson={lesson}
        settings={settings}
        best={bests[lesson.id]}
        onExit={() => setRoute({ name: "home" })}
        onRecord={(score, complete) => record(lesson.id, score, complete)}
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
  return (
    <Home
      settings={settings}
      bests={bests}
      done={done}
      onLesson={(id) => setRoute({ name: "lesson", id })}
      onRange={(id) => setRoute({ name: "range", mode: id as RangeMode })}
      onSettings={() => setRoute({ name: "settings" })}
    />
  );
}
