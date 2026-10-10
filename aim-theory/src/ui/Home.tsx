import { useState } from "react";
import { LESSONS } from "../lesson/course";
import { formatCm, type Settings } from "../persist/storage";
import { nextSkill, SKILLS } from "../skill/course";
import { STEP_TITLE, type StepId } from "../skill/steps";

const RANGE = [
  { id: "snap", title: "Snap", copy: "Flicks. One click, then the next." },
  { id: "follow", title: "Follow", copy: "Tracking. Stay on the bot." },
  { id: "chain", title: "Chain", copy: "Switching. Hit the lit target." },
  { id: "rush", title: "Rush", copy: "Speed. Misses still cost." },
  { id: "line", title: "Line", copy: "Smoothness. Match the pace." },
] as const;

type Door = "theory" | "course" | "range";

const DOORS: { id: Door; title: string; copy: string }[] = [
  { id: "theory", title: "Theory", copy: "The fight around the crosshair." },
  { id: "course", title: "Course", copy: "Click, track, then switch." },
  { id: "range", title: "Range", copy: "Open practice." },
];

export function Home(props: {
  settings: Settings;
  bests: Record<string, number>;
  done: string[];
  step: StepId;
  onLesson: (id: string) => void;
  onSkill: (id: string) => void;
  onRange: (id: string) => void;
  onSettings: () => void;
}) {
  const [door, setDoor] = useState<Door | null>(null);
  const next = nextSkill(props.done);

  return (
    <div className="shell" data-screen="home" data-door={door ?? "home"}>
      <header className="top">
        <div className="mark">
          <b>Aim Theory</b>
          <span>Mouse and keyboard</span>
        </div>
        <button className="sens-chip" onClick={props.onSettings}>
          <strong>{formatCm(props.settings)} cm/360</strong>
          <em>
            {props.settings.dpi} DPI · sens {props.settings.sens} · {props.settings.fov}° FOV
          </em>
        </button>
      </header>
      <main className="home">
        {door == null ? (
          <>
            <button className="continue" data-continue={next.id} onClick={() => props.onSkill(next.id)}>
              <span className="kicker">Continue</span>
              <span>
                <h2>{next.title}</h2>
                <p>{next.summary}</p>
              </span>
              <span className="meta">
                {STEP_TITLE[props.step]}
                <br />
                {props.bests[next.id] != null ? `Best ${props.bests[next.id]}` : "No score yet"}
              </span>
            </button>
            <div className="doors">
              {DOORS.map((item) => (
                <button key={item.id} className="door" data-door={item.id} onClick={() => setDoor(item.id)}>
                  <h2>{item.title}</h2>
                  <p>{item.copy}</p>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="door-head">
              <button className="text-btn" onClick={() => setDoor(null)}>
                Back
              </button>
              <div className="section-label">{DOORS.find((item) => item.id === door)?.title}</div>
            </div>
            {door === "theory" ? (
              <div className="lesson-list">
                {LESSONS.map((lesson) => (
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
                ))}
              </div>
            ) : null}
            {door === "course" ? (
              <>
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
                </div>
              </>
            ) : null}
            {door === "range" ? (
              <>
                <p className="note">Open practice. Same sensitivity, same pointer lock, scored the same way.</p>
                <div className="range-grid">
                  {RANGE.map((item) => (
                    <button key={item.id} className="range-card" onClick={() => props.onRange(item.id)}>
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
          </>
        )}
      </main>
    </div>
  );
}
