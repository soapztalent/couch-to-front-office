/**
 * Coach script. A recorded take replaces speech synthesis when `audio` is set.
 * Lines are written to be read aloud. They are not a chat, and they do not ask the player to answer.
 */
export type ScriptLine = {
  id: string;
  text: string;
  audio?: string;
};

const RAW = [
  [
    "edge-01",
    "Peaker's advantage means the player who swings out sees the holder first. You pick the moment the fight starts. They can only react to it.",
  ],
  [
    "edge-02",
    "On your screen, the holder is already there. On their screen, you appear late. That gap is the advantage. It is not luck.",
  ],
  [
    "edge-03",
    "The gap gets bigger when you swing fast and wide. You show up off their crosshair. A slow peek walks you onto the pixel they are already holding. Then the advantage is gone.",
  ],
  [
    "edge-show-slow",
    "Watch a slow peek. You creep the edge. You are on their crosshair the whole time. They shoot you as you appear.",
  ],
  [
    "edge-show-wide",
    "Now a wide swing. You are already looking at them. Their view is late, and their crosshair is still on the edge you left.",
  ],
  [
    "edge-show-hold",
    "Holding the angle feels safe. Against a fast swing, you are the one reacting late, to a target that is not where you aimed.",
  ],
  [
    "edge-brief",
    "Your turn. When the cue says swing, commit and take the fight. When it says hold, stay posted and watch how little time you get. Click the range to arm.",
  ],
  ["edge-cue-swing", "Swing it. Fast and wide."],
  ["edge-cue-hold", "Hold the angle."],
  [
    "edge-fix-slow",
    "You peeked slowly. That puts you on their crosshair and hands the timing back.",
  ],
  [
    "edge-fix-place",
    "Your crosshair was still on the wall. Before you move, put it off the edge, at head height, where their head will be.",
  ],
  [
    "edge-fix-spam",
    "Missed shots did not buy time. Each miss while you were out kept you in their window.",
  ],
  [
    "edge-good-swing",
    "You swung. They were still on the edge when your shot landed.",
  ],
  [
    "edge-good-hold-loss",
    "You held, and the swing beat you. That is the lesson. The peeker chooses the timing.",
  ],
  [
    "edge-good-hold-win",
    "You won a hold by flicking off the edge. That is a guess. It fails when they swing somewhere else. Take the swing yourself when you can.",
  ],
  [
    "edge-next",
    "Next lesson is the swing itself. Where the crosshair goes, and how you stop for the shot.",
  ],
  [
    "swing-01",
    "A swing is a committed strafe across an angle. You are not slicing out to look. You already know what you are clearing.",
  ],
  [
    "swing-02",
    "Put the crosshair on the pip. That mark is head height, where they are holding. Keep it there while you strafe. The wall clears off them. Your crosshair does not go hunting.",
  ],
  [
    "swing-03",
    "Once the head is out, tap the opposite strafe key so you stop, then shoot. If you click while you are still fast, the shot throws wide.",
  ],
  [
    "swing-show-bad",
    "Bad clear. The crosshair is stuck to the wall. Your body creeps. You have to flick after you are already exposed.",
  ],
  [
    "swing-show-good",
    "Good clear. The crosshair is waiting off the edge, on the head. You strafe, you tap the opposite key, you shoot. One motion.",
  ],
  [
    "swing-brief",
    "I will call the position. Close means just off the edge. Deep means a wider hold. Place on the pip, strafe, tap the opposite key, shoot. Click the range to arm.",
  ],
  ["swing-cue-close", "Close angle."],
  ["swing-cue-deep", "Deep hold. Place wider."],
  [
    "swing-fix-place",
    "You were looking at the wall. The crosshair has to be on the pip before your shoulder clears the edge.",
  ],
  [
    "swing-fix-counter",
    "You shot while you were still fast. Tap the opposite key, let the speed die, then click.",
  ],
  [
    "swing-fix-slow",
    "You eased out. A swing is one speed until the counter-strafe.",
  ],
  [
    "swing-fix-height",
    "You were off head height. The pip and their head sit near the horizon. Don't drop your eyes to the floor.",
  ],
  ["swing-good", "The head met the crosshair. That is a swing, not a flick."],
  [
    "swing-next",
    "You will not swing every angle. Next is when to swing and when to jiggle.",
  ],
  [
    "wj-01",
    "A wide swing takes the fight. Use it when someone is holding and you are ready to shoot.",
  ],
  [
    "wj-02",
    "A jiggle takes information. A short strafe out and straight back. You show a shoulder, you see if they are there, you are gone before their shot.",
  ],
  [
    "wj-03",
    "Don't jiggle when you should kill them. You give away the timing and never commit. Don't wide swing when you only needed to look.",
  ],
  ["wj-show-wide", "Wide swing. You leave the edge and you finish the shot."],
  ["wj-show-jiggle", "Jiggle. Out, see them, back behind the wall. No shot required."],
  [
    "wj-brief",
    "I will call swing or jiggle before each rep. Do that, and nothing else. Click the range to arm.",
  ],
  ["wj-cue-swing", "Wide swing. Take it."],
  ["wj-cue-jiggle", "Jiggle. Look, then get back."],
  [
    "wj-fix-committed",
    "You took a full swing on a jiggle call. You only needed a look.",
  ],
  [
    "wj-fix-jiggled",
    "You jiggled a fight you were supposed to take. Commit, or don't peek.",
  ],
  [
    "wj-fix-slow-jiggle",
    "The jiggle was too slow. If you stay out, it is a peek, and they get the shot.",
  ],
  [
    "wj-good-mix",
    "You matched the call. Swing when it is a fight. Jiggle when it is information.",
  ],
  ["wj-next", "Last lesson in this set. Never swing two angles at once."],
  [
    "iso-01",
    "Angle isolation means only one threat can see you. If two angles are open, you cannot pre-aim both. The one you are not looking at shoots you for free.",
  ],
  [
    "iso-02",
    "Slice the near angle first. Stay tight to that wall so the far angle is still closed. Clear it. Then place for the next edge, and swing that one.",
  ],
  [
    "iso-03",
    "Standing in the open between angles is how a swing gets you killed by someone you never fought.",
  ],
  [
    "iso-show-bad",
    "Too wide. Both players can see you. You can only shoot one.",
  ],
  [
    "iso-show-good",
    "Tight to the first edge. The far player is still behind a wall. One crosshair. One fight.",
  ],
  [
    "iso-brief",
    "Two holders. Clear the near angle, then the far one. If both can see you, you lose. The pip marks only the angle you should be fighting. Click the range to arm.",
  ],
  ["iso-cue", "Near angle first. Then the next."],
  [
    "iso-fix-wide",
    "You opened both angles. The one off your crosshair killed you.",
  ],
  [
    "iso-fix-order",
    "You dealt with the far angle while the near one was still live. Slice the close one first.",
  ],
  [
    "iso-good",
    "You sliced it. Near angle first, then the next. That is isolation.",
  ],
  [
    "iso-end",
    "That is the set. The peeker takes the timing. The swing puts the crosshair where the head will be. Jiggle to look. Isolate so you only fight one.",
  ],
  [
    "range-snap",
    "Snap is flicks. Small targets, one click each. A miss costs more than waiting a moment.",
  ],
  [
    "range-follow",
    "Follow is tracking. Hold the fire button on the bot. Let go when you slide off. Smooth beats chasing.",
  ],
  [
    "range-chain",
    "Chain is target switching. Hit the lit target, then the next. Don't spray the crowd.",
  ],
  [
    "range-rush",
    "Rush is speed. Small targets, fast respawn. Spam still loses. Click when you are on it.",
  ],
  [
    "range-line",
    "Line is smoothness. Stay on the bot. Jerky corrections cost more than a calm miss.",
  ],
  ["range-good", "That was clean enough to build on. Run it back if you want a tighter score."],
  ["range-fix", "The misses added up. Get on the target, then click. Speed without the hit is a loss."],
  ["range-smooth-fix", "You caught the bot in bursts. Ease onto it and match the pace."],
  ["edge-pov-you", "You swing. You see them first."],
  ["edge-pov-them", "You hold. You see them late."],
  ["edge-go", "Your swing."],
  ["swing-pov-you", "Your crosshair is already on the head."],
  ["swing-pov-them", "They swing out. You are still on the edge."],
  ["swing-go", "Place it, then swing."],
  ["mark-pov", "Put the crosshair on the mark, then click once."],
  ["mark-miss", "A miss means you were already off it. Don't spray the air."],
  ["mark-go", "Your click."],
  ["mark-good", "The shot was on the mark. That is a click."],
  ["mark-fix", "You fired before you were on it. Arrive, then click."],
  ["glide-pov", "The bot moves. You move with it."],
  ["glide-chase", "Snatching back onto it means you already left."],
  ["glide-go", "Hold fire and stay on it."],
  ["glide-good", "You held the bot. That is a track."],
  ["glide-fix", "You kept falling off and jumping back. Ease on and match the pace."],
  ["relay-pov", "One mark is lit. That is the only one you take."],
  ["relay-next", "When it drops, the next one is already the job."],
  ["relay-go", "Lit mark only."],
  ["relay-good", "You took the lit mark, then the next."],
  ["relay-fix", "A shot went to a mark that was dark. Take the one that is lit."],
  ["step-pov", "Click, then track, then switch. Those are the three skills."],
  ["step-weak", "Your step follows the weak one. A hot score does not pull the other two up."],
  ["step-go", "All three. The weak one decides."],
  ["step-up", "All three held. You take the next step."],
  ["step-stay", "You stay on this step. Bring up the skill that fell short."],
] as const;

export const LINES: Record<string, ScriptLine> = Object.fromEntries(
  RAW.map(([id, text]) => [id, { id, text }]),
);

export function line(id: string): ScriptLine {
  const found = LINES[id];
  if (!found) throw new Error(`Missing coach line ${id}`);
  return found;
}

export function attachTake(id: string, audio: string): void {
  const found = LINES[id];
  if (!found) throw new Error(`Missing coach line ${id}`);
  found.audio = audio;
}
