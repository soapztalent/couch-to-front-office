import type { RepSpec } from "../sim/lane";
import type { PovId } from "../sim/pov";
import type { ShowId } from "../sim/shows";

export type LessonId = "edge" | "swing" | "choice" | "isolate";

export type PovBeat = {
  id: PovId;
  line: string;
  tag: string;
};

export type Lesson = {
  id: LessonId;
  index: string;
  title: string;
  summary: string;
  explain: string[];
  show?: ShowId;
  showBeats: string[];
  /** First-person beats in the drill view. When set, the lesson does not open a page of text. */
  pov?: PovBeat[];
  brief: string;
  control: string;
  reps: RepSpec[];
  isolate: boolean;
};

export const LESSONS: Lesson[] = [
  {
    id: "edge",
    index: "01",
    title: "The Peaker's Edge",
    summary: "Why a fast swing sees the holder first, and why posting on a pixel loses.",
    explain: [],
    showBeats: [],
    pov: [
      { id: "edge-peeker", line: "edge-pov-you", tag: "PEEKER" },
      { id: "edge-holder", line: "edge-pov-them", tag: "HOLDER" },
    ],
    brief: "edge-go",
    control: "A and D slide you along the angle. Mouse looks. Click shoots. On a hold, you only aim.",
    isolate: false,
    reps: [
      { call: "swing", cueId: "edge-cue-swing", enemy: "close" },
      { call: "swing", cueId: "edge-cue-swing", enemy: "close" },
      { call: "hold", cueId: "edge-cue-hold", enemy: "close" },
      { call: "swing", cueId: "edge-cue-swing", enemy: "deep" },
      { call: "hold", cueId: "edge-cue-hold", enemy: "close" },
      { call: "swing", cueId: "edge-cue-swing", enemy: "close" },
    ],
  },
  {
    id: "swing",
    index: "02",
    title: "The Swing",
    summary: "Crosshair on the head before you move. Strafe. Stop. Shoot.",
    explain: [],
    showBeats: [],
    pov: [
      { id: "swing-you", line: "swing-pov-you", tag: "SWINGER" },
      { id: "swing-them", line: "swing-pov-them", tag: "HOLDER" },
    ],
    brief: "swing-go",
    control: "Keep the pip on your crosshair while you strafe. Tap the opposite key, then click.",
    isolate: false,
    reps: [
      { call: "swing", cueId: "swing-cue-close", enemy: "close" },
      { call: "swing", cueId: "swing-cue-close", enemy: "close" },
      { call: "swing", cueId: "swing-cue-deep", enemy: "deep" },
      { call: "swing", cueId: "swing-cue-close", enemy: "close" },
      { call: "swing", cueId: "swing-cue-deep", enemy: "deep" },
      { call: "swing", cueId: "swing-cue-deep", enemy: "deep" },
    ],
  },
  {
    id: "choice",
    index: "03",
    title: "Wide or Jiggle",
    summary: "Swing when you are taking the fight. Jiggle when you only need to look.",
    explain: ["wj-01", "wj-02", "wj-03"],
    show: "choice",
    showBeats: ["wj-show-wide", "wj-show-jiggle"],
    brief: "wj-brief",
    control: "A jiggle is a short strafe past the edge and straight back. A swing stays out until the shot.",
    isolate: false,
    reps: [
      { call: "swing", cueId: "wj-cue-swing", enemy: "close" },
      { call: "jiggle", cueId: "wj-cue-jiggle", enemy: "close" },
      { call: "jiggle", cueId: "wj-cue-jiggle", enemy: "close" },
      { call: "swing", cueId: "wj-cue-swing", enemy: "deep" },
      { call: "jiggle", cueId: "wj-cue-jiggle", enemy: "close" },
      { call: "swing", cueId: "wj-cue-swing", enemy: "close" },
    ],
  },
  {
    id: "isolate",
    index: "04",
    title: "One Angle",
    summary: "Slice the near angle before the far one can see you.",
    explain: ["iso-01", "iso-02", "iso-03"],
    show: "isolate",
    showBeats: ["iso-show-bad", "iso-show-good"],
    brief: "iso-brief",
    control: "The pip marks the living angle you should clear. Don't step wide enough for both.",
    isolate: true,
    reps: [
      { call: "isolate", cueId: "iso-cue", enemy: "close" },
      { call: "isolate", cueId: "iso-cue", enemy: "close" },
      { call: "isolate", cueId: "iso-cue", enemy: "close" },
      { call: "isolate", cueId: "iso-cue", enemy: "close" },
    ],
  },
];

export function lessonById(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id);
}
