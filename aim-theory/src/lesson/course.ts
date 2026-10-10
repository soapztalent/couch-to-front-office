import type { RepSpec } from "../sim/lane";
import type { PovId } from "../sim/pov";
import type { ShowId } from "../sim/shows";
import { MORE_LESSONS } from "./catalog";

export type LessonId = string;

export type LessonFamily = "edge" | "swing" | "choice" | "isolate";

export type LessonDoor = "theory" | "course";

export type PovShot = {
  id: PovId;
  tag: string;
  /** Existing script lines, spoken in order while this shot keeps moving. */
  lines: string[];
};

export type Lesson = {
  id: LessonId;
  index: string;
  title: string;
  summary: string;
  /** Which score and which door this lesson belongs to. */
  family: LessonFamily;
  door: LessonDoor;
  explain: string[];
  show?: ShowId;
  showBeats: string[];
  /** First-person shots in the drill view. When set, the lesson is one clip, not a page. */
  pov?: PovShot[];
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
    family: "edge",
    door: "theory",
    explain: [],
    showBeats: [],
    pov: [
      { id: "edge-slow", tag: "PEEKER", lines: ["edge-show-slow"] },
      { id: "edge-slow-hold", tag: "HOLDER", lines: ["edge-03"] },
      { id: "edge-wide", tag: "PEEKER", lines: ["edge-01", "edge-show-wide"] },
      { id: "edge-hold", tag: "HOLDER", lines: ["edge-02", "edge-show-hold"] },
    ],
    brief: "edge-brief",
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
    family: "swing",
    door: "theory",
    explain: [],
    showBeats: [],
    pov: [
      { id: "swing-bad", tag: "CREEP", lines: ["swing-show-bad"] },
      { id: "swing-you", tag: "SWING", lines: ["swing-01", "swing-02", "swing-show-good", "swing-03"] },
      { id: "swing-hold", tag: "HOLDER", lines: ["swing-pov-them"] },
    ],
    brief: "swing-brief",
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
    family: "choice",
    door: "theory",
    explain: [],
    showBeats: [],
    pov: [
      { id: "choice-wide", tag: "WIDE", lines: ["wj-01", "wj-show-wide"] },
      { id: "choice-jiggle", tag: "JIGGLE", lines: ["wj-02", "wj-show-jiggle"] },
      { id: "choice-wide", tag: "WIDE", lines: ["wj-03"] },
    ],
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
    family: "isolate",
    door: "theory",
    explain: [],
    showBeats: [],
    pov: [
      { id: "isolate-both", tag: "BOTH", lines: ["iso-01", "iso-show-bad", "iso-03"] },
      { id: "isolate-one", tag: "ONE", lines: ["iso-02", "iso-show-good"] },
    ],
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
  ...MORE_LESSONS,
];

export function lessonById(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id);
}
