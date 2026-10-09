import { LESSONS } from "../lesson/course";
import { formatCm, type Settings } from "../persist/storage";

const RANGE = [
  { id: "snap", title: "Snap", copy: "Flicks. One click, then the next." },
  { id: "follow", title: "Follow", copy: "Tracking. Stay on the bot." },
  { id: "chain", title: "Chain", copy: "Switching. Hit the lit target." },
  { id: "rush", title: "Rush", copy: "Speed. Misses still cost." },
  { id: "line", title: "Line", copy: "Smoothness. Match the pace." },
] as const;

export function Home(props: {
  settings: Settings;
  bests: Record<string, number>;
  done: string[];
  onLesson: (id: string) => void;
  onRange: (id: string) => void;
  onSettings: () => void;
}) {
  return (
    <div className="shell">
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
        <p className="lede">
          The clip plays, then the drill is yours. Mouse and keyboard. Scores stay on this machine.
        </p>
        <div className="section-label">Course</div>
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
        <div className="section-label">Range</div>
        <p className="note">Mouse fundamentals for this phase. Same sensitivity, same pointer lock, scored the same way.</p>
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
      </main>
    </div>
  );
}
