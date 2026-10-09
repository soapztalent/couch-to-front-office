import type { RepResult } from "./lane";
import { line, type ScriptLine } from "../voice/lines";

export type Debrief = {
  lines: ScriptLine[];
  right: string;
  fix: string;
  score: number;
};

function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const a = [...xs].sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

export function scoreReps(id: string, reps: RepResult[]): number {
  if (id === "edge") return scoreEdge(reps);
  if (id === "swing") return scoreSwing(reps);
  if (id === "choice") return scoreChoice(reps);
  if (id === "isolate") return scoreIsolate(reps);
  return 0;
}

function scoreEdge(reps: RepResult[]): number {
  let s = 0;
  for (const r of reps) {
    if (r.call === "swing") {
      if (r.won) s += 160;
      if (r.won && (r.shotErrorDeg ?? r.placementDeg ?? 99) <= 3) s += 40;
      if (r.entrySpeed > 0 && r.entrySpeed < 0.9) s -= 70;
    } else if (r.call === "hold") {
      s += 30;
      if (r.won) s += 20;
    }
    s -= r.misses * 25;
  }
  return Math.max(0, Math.min(1000, Math.round(s)));
}

function scoreSwing(reps: RepResult[]): number {
  let s = 0;
  for (const r of reps) {
    if (r.won) s += 120;
    const place = r.shotErrorDeg ?? r.placementDeg;
    if (r.won && place != null && place <= 2.6) s += 50;
    if (r.won && r.shotSpeed != null && r.shotSpeed < 0.4) s += 40;
    if (r.entrySpeed > 0 && r.entrySpeed < 0.9) s -= 60;
    s -= r.misses * 25;
  }
  return Math.max(0, Math.min(1000, Math.round(s)));
}

function scoreChoice(reps: RepResult[]): number {
  let s = 0;
  for (const r of reps) {
    if (r.won) s += 150;
    else s -= 20;
    s -= r.misses * 20;
  }
  return Math.max(0, Math.min(1000, Math.round(s)));
}

function scoreIsolate(reps: RepResult[]): number {
  let s = 0;
  for (const r of reps) {
    if (r.won) s += 220;
    else if (r.reason === "timeout" || r.reason === "order") s += 40;
    s -= r.misses * 20;
  }
  return Math.max(0, Math.min(1000, Math.round(s)));
}

export function buildDebrief(id: string, reps: RepResult[]): Debrief {
  const score = scoreReps(id, reps);
  if (id === "edge") return edgeDebrief(reps, score);
  if (id === "swing") return swingDebrief(reps, score);
  if (id === "choice") return choiceDebrief(reps, score);
  return isolateDebrief(reps, score);
}

function edgeDebrief(reps: RepResult[], score: number): Debrief {
  const swings = reps.filter((r) => r.call === "swing");
  const holds = reps.filter((r) => r.call === "hold");
  const swingWins = swings.filter((r) => r.won).length;
  const slow = swings.filter((r) => r.entrySpeed > 0 && r.entrySpeed < 0.9).length;
  const places = swings.map((r) => r.shotErrorDeg ?? r.placementDeg).filter((n): n is number => n != null);
  const place = median(places);
  const misses = reps.reduce((n, r) => n + r.misses, 0);
  const holdLoss = holds.some((r) => r.reason === "held-loss");
  const holdWin = holds.some((r) => r.reason === "held-win");
  const fixes: ScriptLine[] = [];
  const goods: ScriptLine[] = [];
  if (slow >= 1) fixes.push(line("edge-fix-slow"));
  if (place != null && place > 4.5) fixes.push(line("edge-fix-place"));
  if (misses >= 4) fixes.push(line("edge-fix-spam"));
  if (swingWins >= 1) goods.push(line("edge-good-swing"));
  if (holdLoss) goods.push(line("edge-good-hold-loss"));
  if (holdWin && !holdLoss) goods.push(line("edge-good-hold-win"));
  const right =
    swingWins > 0
      ? `Won ${swingWins} of ${swings.length} swings.`
      : holdLoss
        ? "You stayed for the hold and watched the swing come in."
        : "No swing to keep yet.";
  const fix = slow >= 1
    ? "Commit to the strafe. A slow peek gives the timing back."
    : place != null && place > 4.5
      ? "Place off the edge, at head height, before you move."
      : misses >= 4
        ? "Misses while you are out don't buy time."
        : swingWins === swings.length && swings.length > 0
          ? "Keep the crosshair off the wall on the next set."
          : "Take the swing instead of posting on the pixel.";
  return { lines: pack(fixes, goods, "edge-next"), right, fix, score };
}

function swingDebrief(reps: RepResult[], score: number): Debrief {
  const wins = reps.filter((r) => r.won).length;
  const slow = reps.filter((r) => r.entrySpeed > 0 && r.entrySpeed < 0.9).length;
  const movingShots = reps.filter((r) => r.shotSpeed != null && r.shotSpeed >= 0.45).length;
  const places = reps.map((r) => r.shotErrorDeg ?? r.placementDeg).filter((n): n is number => n != null);
  const place = median(places);
  const low = reps.filter((r) => r.lowHead).length;
  const fixes: ScriptLine[] = [];
  const goods: ScriptLine[] = [];
  if (place != null && place > 4) fixes.push(line("swing-fix-place"));
  if (low >= 2) fixes.push(line("swing-fix-height"));
  if (movingShots >= 2) fixes.push(line("swing-fix-counter"));
  if (slow >= 2) fixes.push(line("swing-fix-slow"));
  if (wins >= 1) goods.push(line("swing-good"));
  const right = wins > 0 ? `Landed ${wins} of ${reps.length} with the swing.` : "No clean swing yet.";
  const fix =
    place != null && place > 4
      ? "Keep the crosshair on the pip while you strafe."
      : movingShots >= 2
        ? "Tap the opposite key, then shoot."
        : slow >= 2
          ? "Don't ease out. One speed, then the stop."
          : low >= 2
            ? "Bring it back to head height."
            : "Same motion on the deep hold: place wider, then go.";
  return { lines: pack(fixes, goods, "swing-next"), right, fix, score };
}

function choiceDebrief(reps: RepResult[], score: number): Debrief {
  const swings = reps.filter((r) => r.call === "swing");
  const jiggles = reps.filter((r) => r.call === "jiggle");
  const swingWins = swings.filter((r) => r.won).length;
  const jiggleWins = jiggles.filter((r) => r.won).length;
  const over = jiggles.filter((r) => r.reason === "overcommit" || r.reason === "took-fight").length;
  const timid = swings.filter((r) => !r.won && (r.reason === "jiggle" || r.reason === "no-swing" || r.reason === "timeout")).length;
  const diedJiggle = jiggles.filter((r) => r.reason === "died").length;
  const fixes: ScriptLine[] = [];
  const goods: ScriptLine[] = [];
  if (over >= 1) fixes.push(line("wj-fix-committed"));
  if (timid >= 1) fixes.push(line("wj-fix-jiggled"));
  if (diedJiggle >= 1) fixes.push(line("wj-fix-slow-jiggle"));
  if (swingWins + jiggleWins >= Math.ceil(reps.length * 0.6)) goods.push(line("wj-good-mix"));
  else if (swingWins >= 1 || jiggleWins >= 1) goods.push(line("wj-good-mix"));
  const matched = swingWins + jiggleWins;
  const right = matched > 0 ? `Matched the call on ${matched} of ${reps.length}.` : "The calls and the peeks did not match.";
  const fix =
    over >= 1
      ? "On a jiggle, show a shoulder and get back."
      : timid >= 1
        ? "On a swing call, finish the fight."
        : diedJiggle >= 1
          ? "The look has to be short."
          : "Keep treating the call as the whole rep.";
  return { lines: pack(fixes, goods, "wj-next"), right, fix, score };
}

function isolateDebrief(reps: RepResult[], score: number): Debrief {
  const wins = reps.filter((r) => r.won).length;
  const doubles = reps.filter((r) => r.reason === "double").length;
  const order = reps.filter((r) => r.reason === "order").length;
  const fixes: ScriptLine[] = [];
  const goods: ScriptLine[] = [];
  if (doubles >= 1) fixes.push(line("iso-fix-wide"));
  if (order >= 1) fixes.push(line("iso-fix-order"));
  if (wins >= 1) goods.push(line("iso-good"));
  const right = wins > 0 ? `Isolated ${wins} of ${reps.length}.` : "No clean slice yet.";
  const fix =
    doubles >= 1
      ? "If both can see you, you are already late."
      : order >= 1
        ? "Kill the near angle before you step to the far one."
        : "Stay tight to the first edge until it is clear.";
  return { lines: pack(fixes, goods, "iso-end"), right, fix, score };
}

function pack(fixes: ScriptLine[], goods: ScriptLine[], nextId: string): ScriptLine[] {
  const spoken: ScriptLine[] = [];
  if (fixes[0]) spoken.push(fixes[0]);
  if (goods[0]) spoken.push(goods[0]);
  if (spoken.length === 0) spoken.push(line(nextId));
  else spoken.push(line(nextId));
  const seen = new Set<string>();
  return spoken.filter((l) => (seen.has(l.id) ? false : (seen.add(l.id), true))).slice(0, 3);
}
