import { useEffect, useState } from "react";
import { fetchBoard, postScore } from "../board/client";
import type { ScoreEntry } from "../board/store";

export function ScoreBoard(props: {
  lessonId: string;
  title: string;
  score?: number;
  name: string;
  onName: (name: string) => void;
  onBack?: () => void;
}) {
  const [entries, setEntries] = useState<ScoreEntry[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [rank, setRank] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    setError("");
    fetchBoard(props.lessonId)
      .then((rows) => {
        if (alive) setEntries(rows);
      })
      .catch(() => {
        if (alive) setError("The board did not load.");
      });
    return () => {
      alive = false;
    };
  }, [props.lessonId]);

  async function post() {
    if (props.score == null || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await postScore(props.lessonId, props.name, props.score);
      setEntries(result.entries);
      setRank(result.rank);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The board did not take that score.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="board" data-board={props.lessonId}>
      <header className="board-head">
        <div>
          <p className="kicker">Board</p>
          <h2>{props.title}</h2>
        </div>
        {props.onBack ? (
          <button className="ghost-btn" onClick={props.onBack}>
            Back
          </button>
        ) : null}
      </header>
      <label className="field">
        Board name
        <input
          data-board-name
          value={props.name}
          maxLength={16}
          placeholder="Your name"
          onChange={(e) => props.onName(e.target.value)}
        />
      </label>
      {props.score != null ? (
        <button className="solid-btn" data-post disabled={busy || props.name.trim().length === 0} onClick={() => void post()}>
          Post {props.score}
        </button>
      ) : null}
      {rank != null ? <p className="note">Posted. You are {rank} on this lesson.</p> : null}
      {error ? <p className="note">{error}</p> : null}
      <ol className="board-list" data-board-list>
        {entries.length === 0 ? <li className="note">No scores yet.</li> : null}
        {entries.map((row) => (
          <li key={`${row.at}-${row.name}`} data-board-row>
            <span>{row.name}</span>
            <b>{row.score}</b>
          </li>
        ))}
      </ol>
    </section>
  );
}
