import { useState } from "react";
import { LESSONS } from "../lesson/course";
import type { Settings } from "../persist/storage";
import { nextSkill, SKILLS } from "../skill/course";
import { STEP_TITLE, type StepId } from "../skill/steps";
import { ScoreBoard } from "./Board";
import { Settings as SettingsPanel } from "./Settings";

const RANGE = [
  { id: "snap", title: "Snap", copy: "Flicks. One click, then the next." },
  { id: "follow", title: "Follow", copy: "Tracking. Stay on the bot." },
  { id: "chain", title: "Chain", copy: "Switching. Hit the lit target." },
  { id: "rush", title: "Rush", copy: "Speed. Misses still cost." },
  { id: "line", title: "Line", copy: "Smoothness. Match the pace." },
] as const;

export type MenuPane = "continue" | "theory" | "course" | "range" | "board" | "settings";

const NAV: { id: MenuPane; label: string }[] = [
  { id: "continue", label: "Continue" },
  { id: "theory", label: "Theory" },
  { id: "course", label: "Course" },
  { id: "range", label: "Range" },
  { id: "board", label: "Board" },
  { id: "settings", label: "Settings" },
];

export function Home(props: {
  settings: Settings;
  bests: Record<string, number>;
  done: string[];
  step: StepId;
  pane: MenuPane;
  onPane: (pane: MenuPane) => void;
  onLesson: (id: string) => void;
  onSkill: (id: string) => void;
  onRange: (id: string) => void;
  onChangeSettings: (next: Settings) => void;
}) {
  const [boardId, setBoardId] = useState(LESSONS[0]?.id ?? "");
  const next = nextSkill(props.done);
  const best = props.bests[next.id];
  const boardLesson = LESSONS.find((lesson) => lesson.id === boardId) ?? LESSONS[0];

  function lessonCard(lesson: (typeof LESSONS)[number]) {
    return (
      <button key={lesson.id} className="lesson-card" onClick={() => props.onLesson(lesson.id)}>
        <span className="idx">{lesson.index}</span>
        <span>
          <h2>{lesson.title}</h2>
          <p>{lesson.summary}</p>
        </span>
        <span className="meta">
          {props.done.includes(lesson.id) ? "Done" : "Lesson"}
          <br />
          {props.bests[lesson.id] != null ? `Best ${props.bests[lesson.id]}` : "No score yet"}
        </span>
      </button>
    );
  }

  return (
    <div className="menu" data-screen="home" data-pane={props.pane}>
      <aside className="menu-col">
        <div className="mark">
          <svg className="mark-cross" viewBox="0 0 28 28" aria-hidden="true">
            <path d="M14 3v7M14 18v7M3 14h7M18 14h7" />
          </svg>
          <div>
            <b>Aim Theory</b>
            <span>Mouse and keyboard</span>
          </div>
        </div>
        <nav className="menu-nav" aria-label="Menu">
          {NAV.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={props.pane === item.id ? "is-on" : undefined}
              data-nav={item.id}
              data-door={item.id === "theory" || item.id === "course" || item.id === "range" ? item.id : undefined}
              data-settings={item.id === "settings" ? "" : undefined}
              aria-current={props.pane === item.id ? "page" : undefined}
              onClick={() => props.onPane(item.id)}
            >
              <span className="idx">{String(index + 1).padStart(2, "0")}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <p className="menu-foot">{STEP_TITLE[props.step]}</p>
      </aside>
      <section className="menu-pane">
        {props.pane === "continue" ? (
          <div className="pane-continue">
            <p className="kicker">Continue</p>
            <h1>{next.title}</h1>
            <p className="lede">{next.summary}</p>
            <p className="pane-meta">
              {STEP_TITLE[props.step]}
              {best != null ? ` · Best ${best}` : ""}
            </p>
            <button className="solid-btn" data-continue={next.id} onClick={() => props.onSkill(next.id)}>
              Start
            </button>
          </div>
        ) : null}
        {props.pane === "theory" ? (
          <>
            <header className="pane-head">
              <p className="kicker">Theory</p>
              <h1>The fight around the crosshair.</h1>
            </header>
            <div className="lesson-list">{LESSONS.filter((lesson) => lesson.door === "theory").map(lessonCard)}</div>
          </>
        ) : null}
        {props.pane === "course" ? (
          <>
            <header className="pane-head">
              <p className="kicker">Course</p>
              <h1>Click, track, then switch.</h1>
            </header>
            <p className="note">
              You are on {STEP_TITLE[props.step]}. Click, track, then switch. You move up when the weak one holds.
            </p>
            <div className="lesson-list">
              {SKILLS.map((skill) => (
                <button key={skill.id} className="lesson-card" onClick={() => props.onSkill(skill.id)}>
                  <span className="idx">{skill.index}</span>
                  <span>
                    <h2>{skill.title}</h2>
                    <p>{skill.summary}</p>
                  </span>
                  <span className="meta">
                    {props.done.includes(skill.id) ? "Done" : STEP_TITLE[props.step]}
                    <br />
                    {props.bests[skill.id] != null ? `Best ${props.bests[skill.id]}` : "No score yet"}
                  </span>
                </button>
              ))}
              {LESSONS.filter((lesson) => lesson.door === "course").map(lessonCard)}
            </div>
          </>
        ) : null}
        {props.pane === "range" ? (
          <>
            <header className="pane-head">
              <p className="kicker">Range</p>
              <h1>The reps, then open practice.</h1>
            </header>
            <p className="note">Open practice. Same sensitivity, same pointer lock, scored the same way.</p>
            <div className="lesson-list">
              {LESSONS.filter((lesson) => lesson.door === "range").map(lessonCard)}
              <p className="section-label">Open practice</p>
              {RANGE.map((item, index) => (
                <button key={item.id} className="lesson-card" onClick={() => props.onRange(item.id)}>
                  <span className="idx">
                    {String(LESSONS.filter((lesson) => lesson.door === "range").length + index + 1).padStart(2, "0")}
                  </span>
                  <span>
                    <h2>{item.title}</h2>
                    <p>{item.copy}</p>
                  </span>
                  <span className="meta">{props.bests[item.id] != null ? `Best ${props.bests[item.id]}` : "20s"}</span>
                </button>
              ))}
            </div>
          </>
        ) : null}
        {props.pane === "board" && boardLesson ? (
          <>
            <header className="pane-head">
              <p className="kicker">Board</p>
              <h1>Scores for one lesson.</h1>
            </header>
            <label className="field board-pick">
              Lesson
              <select data-board-pick value={boardLesson.id} onChange={(event) => setBoardId(event.target.value)}>
                {LESSONS.map((lesson) => (
                  <option key={lesson.id} value={lesson.id}>
                    {lesson.index} {lesson.title}
                  </option>
                ))}
              </select>
            </label>
            <ScoreBoard
              lessonId={boardLesson.id}
              title={boardLesson.title}
              name={props.settings.name}
              onName={(name) => props.onChangeSettings({ ...props.settings, name })}
            />
          </>
        ) : null}
        {props.pane === "settings" ? (
          <>
            <header className="pane-head">
              <p className="kicker">Settings</p>
              <h1>Sens, sight, and sound.</h1>
            </header>
            <SettingsPanel settings={props.settings} onChange={props.onChangeSettings} />
          </>
        ) : null}
      </section>
    </div>
  );
}
