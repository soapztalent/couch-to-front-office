import type { SkillShot } from "./clip";
import type { SkillKind } from "./steps";

export type SkillId = "mark" | "glide" | "relay" | "step";

export type SkillLesson = {
  id: SkillId;
  index: string;
  title: string;
  summary: string;
  beats: { shot: SkillShot; lineId: string }[];
  brief: string;
  good: string;
  fix: string;
};

export const SKILLS: SkillLesson[] = [
  {
    id: "mark",
    index: "01",
    title: "Mark",
    summary: "The click. Arrive, then one shot.",
    beats: [
      { shot: "mark", lineId: "mark-pov" },
      { shot: "mark", lineId: "mark-miss" },
    ],
    brief: "mark-go",
    good: "mark-good",
    fix: "mark-fix",
  },
  {
    id: "glide",
    index: "02",
    title: "Glide",
    summary: "The track. Stay with the bot.",
    beats: [
      { shot: "glide", lineId: "glide-pov" },
      { shot: "glide", lineId: "glide-chase" },
    ],
    brief: "glide-go",
    good: "glide-good",
    fix: "glide-fix",
  },
  {
    id: "relay",
    index: "03",
    title: "Relay",
    summary: "The switch. The lit mark, then the next.",
    beats: [
      { shot: "relay", lineId: "relay-pov" },
      { shot: "relay", lineId: "relay-next" },
    ],
    brief: "relay-go",
    good: "relay-good",
    fix: "relay-fix",
  },
  {
    id: "step",
    index: "04",
    title: "Step",
    summary: "Where you are. The weak skill decides.",
    beats: [
      { shot: "mark", lineId: "step-pov" },
      { shot: "mark", lineId: "step-weak" },
    ],
    brief: "step-go",
    good: "step-up",
    fix: "step-stay",
  },
];

export function skillById(id: string): SkillLesson | undefined {
  return SKILLS.find((skill) => skill.id === id);
}

export const SKILL_LABEL: Record<SkillKind, string> = {
  mark: "Mark",
  glide: "Glide",
  relay: "Relay",
};
