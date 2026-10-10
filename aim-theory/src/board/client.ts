import type { ScoreEntry } from "./store";

export async function fetchBoard(lessonId: string): Promise<ScoreEntry[]> {
  const res = await fetch(`/api/scores?lesson=${encodeURIComponent(lessonId)}`);
  if (!res.ok) throw new Error("The board did not load.");
  const body = (await res.json()) as { entries?: ScoreEntry[] };
  return body.entries ?? [];
}

export async function postScore(lessonId: string, name: string, score: number): Promise<{ rank: number; entries: ScoreEntry[] }> {
  const res = await fetch("/api/scores", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ lessonId, name, score }),
  });
  const body = (await res.json()) as { error?: string; rank?: number; entries?: ScoreEntry[] };
  if (!res.ok || !body.entries) throw new Error(body.error || "The board did not take that score.");
  return { rank: body.rank ?? 0, entries: body.entries };
}
