export type ScoreEntry = {
  name: string;
  score: number;
  at: number;
};

export type Boards = Record<string, ScoreEntry[]>;

const LESSON = /^[a-z0-9-]{1,40}$/;
const NAME = /^[\p{L}\p{N}][\p{L}\p{N} ']{0,15}$/u;
const CAP = 20;

export function cleanName(raw: string): string | null {
  const name = raw.trim().replace(/\s+/g, " ");
  if (!NAME.test(name)) return null;
  return name;
}

export function emptyBoards(): Boards {
  return {};
}

export function parseBoards(raw: string): Boards {
  try {
    const parsed = JSON.parse(raw) as Boards;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed;
  } catch {
    return {};
  }
}

export function submitScore(
  boards: Boards,
  input: { lessonId: string; name: string; score: number; at: number },
): { ok: true; rank: number; entries: ScoreEntry[] } | { ok: false; error: string } {
  if (!LESSON.test(input.lessonId)) return { ok: false, error: "Unknown lesson." };
  const name = cleanName(input.name);
  if (!name) return { ok: false, error: "Use a name, up to 16 characters." };
  if (!Number.isInteger(input.score) || input.score < 0 || input.score > 1000) {
    return { ok: false, error: "That score cannot be posted." };
  }
  const next: Boards = { ...boards, [input.lessonId]: [...(boards[input.lessonId] ?? [])] };
  const row: ScoreEntry = { name, score: input.score, at: input.at };
  next[input.lessonId].push(row);
  next[input.lessonId].sort((a, b) => b.score - a.score || a.at - b.at);
  next[input.lessonId] = next[input.lessonId].slice(0, CAP);
  const rank = next[input.lessonId].findIndex((entry) => entry.at === row.at && entry.name === row.name && entry.score === row.score);
  if (rank < 0) return { ok: false, error: "That score did not make the board." };
  return { ok: true, rank: rank + 1, entries: next[input.lessonId] };
}

export function boardFor(boards: Boards, lessonId: string): ScoreEntry[] {
  if (!LESSON.test(lessonId)) return [];
  return boards[lessonId] ?? [];
}
