import { GAME_YAW, type GameId, cmPer360, sensFromCm } from "../sens/sensitivity";

export type Crosshair = {
  color: string;
  length: number;
  gap: number;
  thickness: number;
  outline: boolean;
  outlineColor: string;
  dot: boolean;
  dotSize: number;
};

export type Settings = {
  dpi: number;
  sens: number;
  yaw: number;
  game: GameId;
  fov: number;
  volume: number;
  sfx: number;
  crosshair: Crosshair;
};

export type HistoryEntry = {
  id: string;
  score: number;
  at: number;
  complete: boolean;
};

const KEY = "aim-theory.v1";

const DEFAULT_CROSS: Crosshair = {
  color: "#f4f1e8",
  length: 8,
  gap: 4,
  thickness: 2,
  outline: true,
  outlineColor: "#0c0c0a",
  dot: false,
  dotSize: 2,
};

export const DEFAULT_SETTINGS: Settings = {
  dpi: 800,
  sens: 1,
  yaw: GAME_YAW.cs2,
  game: "cs2",
  fov: 106,
  volume: 1,
  sfx: 0.45,
  crosshair: DEFAULT_CROSS,
};

export type StepId = "open" | "even" | "fine";

type Store = {
  settings: Settings;
  bests: Record<string, number>;
  history: HistoryEntry[];
  done: string[];
  step: StepId;
};

function empty(): Store {
  return { settings: structuredClone(DEFAULT_SETTINGS), bests: {}, history: [], done: [], step: "open" };
}

function read(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as Partial<Store>;
    return {
      settings: { ...DEFAULT_SETTINGS, ...parsed.settings, crosshair: { ...DEFAULT_CROSS, ...parsed.settings?.crosshair } },
      bests: parsed.bests ?? {},
      history: parsed.history ?? [],
      done: parsed.done ?? [],
      step: parsed.step === "even" || parsed.step === "fine" ? parsed.step : "open",
    };
  } catch {
    return empty();
  }
}

function write(store: Store): void {
  localStorage.setItem(KEY, JSON.stringify(store));
}

export function loadSettings(): Settings {
  return read().settings;
}

export function saveSettings(settings: Settings): void {
  const store = read();
  store.settings = settings;
  write(store);
}

export function loadBests(): Record<string, number> {
  return read().bests;
}

export function loadDone(): string[] {
  return read().done;
}

export function loadStep(): StepId {
  return read().step;
}

export function saveStep(step: StepId): void {
  const store = read();
  store.step = step;
  write(store);
}

export function markDone(id: string): void {
  const store = read();
  if (!store.done.includes(id)) store.done.push(id);
  write(store);
}

export function recordScore(id: string, score: number, complete: boolean): { best: number; isNew: boolean } {
  const store = read();
  store.history.unshift({ id, score, at: Date.now(), complete });
  store.history = store.history.slice(0, 80);
  let isNew = false;
  if (complete) {
    const prev = store.bests[id];
    if (prev == null || score > prev) {
      store.bests[id] = score;
      isNew = true;
    }
  }
  write(store);
  return { best: store.bests[id] ?? score, isNew };
}

export function formatCm(settings: Settings): string {
  const cm = cmPer360(settings.dpi, settings.sens, settings.yaw);
  if (!Number.isFinite(cm)) return "—";
  return cm.toFixed(1);
}

export function withGame(settings: Settings, game: GameId): Settings {
  if (game === "custom") return { ...settings, game };
  const cm = cmPer360(settings.dpi, settings.sens, settings.yaw);
  const yaw = GAME_YAW[game];
  const sens = sensFromCm(settings.dpi, cm, yaw);
  return { ...settings, game, yaw, sens: Number(sens.toFixed(4)) };
}
