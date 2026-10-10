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
    "You pick the moment. They don't get a say until you're already out.",
  ],
  [
    "edge-02",
    "On your screen they're waiting. On theirs, you show up late. That gap is the whole edge.",
  ],
  [
    "edge-03",
    "Creep it and you walk onto the pixel they're holding. Then the edge is theirs, and you're just a target.",
  ],
  [
    "edge-show-slow",
    "Slow peek. You're on their crosshair the whole way out. They don't even have to move.",
  ],
  [
    "edge-show-wide",
    "Wide and fast. You're already on their head. Their crosshair is still on the wall you left.",
  ],
  [
    "edge-show-hold",
    "This is holding. A fast swing shows up off your pixel, and now you're the one who's late.",
  ],
  [
    "edge-brief",
    "Your turn. Swing means you take it, fast and wide. Hold means you post up and feel how little time you get. Click the range to arm.",
  ],
  ["edge-cue-swing", "Swing it. Fast and wide."],
  ["edge-cue-hold", "Hold the angle."],
  ["edge-fix-slow", "That peek was slow. You handed them the timing."],
  [
    "edge-fix-place",
    "Your crosshair was still on the wall. Set it off the edge, head height, before you move.",
  ],
  [
    "edge-fix-spam",
    "Those misses didn't buy time. Every click out there kept you in their window.",
  ],
  ["edge-good-swing", "You swung. They were still on the edge when it landed."],
  [
    "edge-good-hold-loss",
    "You held, and the swing beat you. That's the lesson. They chose the moment.",
  ],
  [
    "edge-good-hold-win",
    "You flicked one off the edge. That's a guess. It dies the next time they swing somewhere else.",
  ],
  [
    "edge-next",
    "Next is the swing itself. Where your crosshair goes, and how you stop for the shot.",
  ],
  [
    "swing-01",
    "A swing isn't a peek to look. You already know who's there. You go get them.",
  ],
  [
    "swing-02",
    "Crosshair on the pip before you move. Head height. The wall slides off them. You don't go hunting.",
  ],
  [
    "swing-03",
    "Head clears, tap the other strafe key, stop, then shoot. Click while you're still fast and it throws wide.",
  ],
  [
    "swing-show-bad",
    "This is the miss. Crosshair stuck to the wall, body creeping, then a flick after you're already exposed.",
  ],
  [
    "swing-show-good",
    "This is the one. Crosshair waiting on the head. Strafe, stop, click. One motion.",
  ],
  [
    "swing-brief",
    "I'll call close or deep. Close is just off the edge. Deep is wider. Place it, strafe, stop, shoot. Click the range to arm.",
  ],
  ["swing-cue-close", "Close angle."],
  ["swing-cue-deep", "Deep hold. Place wider."],
  [
    "swing-fix-place",
    "You were still on the wall. The crosshair has to be on the pip before your shoulder clears.",
  ],
  ["swing-fix-counter", "You shot while you were still fast. Stop first, then click."],
  ["swing-fix-slow", "You eased out. A swing is one speed until the stop."],
  [
    "swing-fix-height",
    "You dropped off head height. The pip and their head sit on the horizon.",
  ],
  ["swing-good", "The head met the crosshair. That's a swing, not a flick."],
  [
    "swing-next",
    "You won't swing every angle. Next is when to swing, and when to only look.",
  ],
  [
    "wj-01",
    "A wide swing takes the fight. Someone's holding, you're ready, you finish it.",
  ],
  [
    "wj-02",
    "A jiggle is just a look. Shoulder out, you see them, you're gone before their click.",
  ],
  [
    "wj-03",
    "Don't jiggle a kill. Don't wide-swing a corner you only needed to see.",
  ],
  ["wj-show-wide", "Wide. You leave the edge, and the shot was the plan."],
  ["wj-show-jiggle", "Jiggle. Out, see them, back in the wall. No hero shot."],
  [
    "wj-brief",
    "I'll call swing or jiggle. Do that and nothing else. Click the range to arm.",
  ],
  ["wj-cue-swing", "Wide swing. Take it."],
  ["wj-cue-jiggle", "Jiggle. Look, then get back."],
  [
    "wj-fix-committed",
    "You took a full swing on a look. You only needed to see them.",
  ],
  [
    "wj-fix-jiggled",
    "You jiggled a fight you were supposed to take. Commit, or don't peek.",
  ],
  [
    "wj-fix-slow-jiggle",
    "That look was too slow. Stay out and it becomes a peek, and they get the shot.",
  ],
  [
    "wj-good-mix",
    "You matched the call. Swing when it's a fight. Jiggle when it's information.",
  ],
  ["wj-next", "Last one. Never swing two angles at once."],
  [
    "iso-01",
    "One angle. If two people can see you, you only get to shoot one. The other one is free.",
  ],
  [
    "iso-02",
    "Slice the close one first. Stay tight so the far angle is still a wall. Clear it, then the next.",
  ],
  [
    "iso-03",
    "The usual death is the gap between them. You get shot by someone you never fought.",
  ],
  [
    "iso-show-bad",
    "Too wide. Both of them have you. Your crosshair only covers one.",
  ],
  [
    "iso-show-good",
    "Tight to the first edge. The far one is still behind a wall. One fight.",
  ],
  [
    "iso-brief",
    "Two holders. Near one, then the far one. If both can see you, you lose. The pip is the angle that's still alive. Click the range to arm.",
  ],
  ["iso-cue", "Near angle first. Then the next."],
  ["iso-fix-wide", "You opened both. The one off your crosshair killed you."],
  [
    "iso-fix-order",
    "You took the far one while the close one was still alive. Slice the close one first.",
  ],
  ["iso-good", "You sliced it. Near one, then the next. That's isolation."],
  [
    "iso-end",
    "That's the set. You take the timing. The crosshair is already on the head. Jiggle to look. Isolate so you only fight one.",
  ],
  [
    "range-snap",
    "Snap is the click under pressure. Small marks, one shot each. A miss costs more than a breath.",
  ],
  [
    "range-follow",
    "Follow is the track. Hold fire on the bot. Let go when you slide off. Smooth beats chasing.",
  ],
  [
    "range-chain",
    "Chain is the switch. Hit the lit one, then the next. Don't spray the crowd.",
  ],
  [
    "range-rush",
    "Rush is speed. Small marks, fast respawn. Spam still loses. Click when you're on it.",
  ],
  [
    "range-line",
    "Line is smoothness. Stay on the bot. A jerk costs more than a calm miss.",
  ],
  ["range-good", "That was clean enough to build on. Run it back if you want it tighter."],
  ["range-fix", "The misses added up. Get on it, then click. Speed without the hit is a loss."],
  ["range-smooth-fix", "You caught the bot in bursts. Ease on, and match the pace."],
  ["edge-pov-you", "You swing. You see them first."],
  ["edge-pov-them", "You hold. You see them late."],
  ["edge-go", "Your swing."],
  ["swing-pov-you", "Your crosshair is already on the head."],
  ["swing-pov-them", "They come out already aimed. You're still holding the edge."],
  ["swing-go", "Place it, then swing."],
  ["mark-pov", "A click is an arrival. You get to the mark, and then you fire. One shot."],
  ["mark-miss", "The usual miss is the spray. You were already off it, and you kept shooting the air."],
  ["mark-go", "Your click. Be on it, then one shot."],
  ["mark-good", "That was on the mark. That's a click."],
  ["mark-fix", "You fired on the way there. Arrive, then click."],
  ["glide-pov", "A track is staying with them. The bot moves, and you move like you already knew."],
  ["glide-chase", "The usual miss is the snatch. You left, then you jumped back on. That's not a track."],
  ["glide-go", "Hold fire and stay with it."],
  ["glide-good", "You held the bot. That's a track."],
  ["glide-fix", "You kept falling off and grabbing back. Ease on, and match the pace."],
  ["relay-pov", "A switch is one job. The lit mark is the only one that exists."],
  ["relay-next", "When it drops, the next one is already the job. Don't finish a conversation with the last one."],
  ["relay-go", "Lit mark only."],
  ["relay-good", "You took the lit one, then the next."],
  ["relay-fix", "A shot went to a mark that was dark. Take the one that's lit."],
  ["step-pov", "Click, then track, then switch. Three skills. That's the whole check."],
  ["step-weak", "Your step follows the weak one. A hot score doesn't drag the other two up."],
  ["step-go", "All three. The weak one decides."],
  ["step-up", "All three held. You take the next step."],
  ["step-stay", "You stay here. Bring up the one that fell short."],
  ["rev-swing-none-saw", "I held this angle the whole time. You never came out."],
  ["rev-swing-none-fix", "Commit. Leave fast, already on my head, and take the shot."],
  ["rev-swing-sat-saw", "You stepped out and then just lived there. I had all day."],
  ["rev-swing-sat-fix", "If you're out, the shot is now. Don't stand in my window."],
  ["rev-swing-creep-saw", "I had you the whole way. You crept that corner onto the pixel I was holding."],
  ["rev-swing-creep-fix", "Leave faster. Be on my head before your shoulder clears."],
  ["rev-swing-low-saw", "Your eyes were down on my chest. I never had to move."],
  ["rev-swing-low-fix", "Bring it up to the horizon. My head lives there."],
  ["rev-swing-move-saw", "You were still flying when you shot. It left wide of my head."],
  ["rev-swing-move-fix", "Tap the other strafe key. Let the speed die. Then click."],
  ["rev-swing-wall-saw", "You cleared me still looking at the wall. I watched you find me."],
  ["rev-swing-wall-fix", "Put the crosshair on my head before you move."],
  ["rev-swing-spam-saw", "You kept clicking and none of them were on me."],
  ["rev-swing-spam-fix", "One shot, after you stop. Misses don't buy you time."],
  ["rev-swing-pixel-saw", "You came out on my pixel. I didn't have to flick."],
  ["rev-swing-pixel-fix", "Swing wider. I should still be looking at wall when you appear."],
  ["rev-jig-fight-saw", "That was a full fight. I saw you commit on a look."],
  ["rev-jig-fight-fix", "A jiggle doesn't shoot. Shoulder out, see me, disappear."],
  ["rev-jig-wide-saw", "You showed me your whole body. A look is a shoulder."],
  ["rev-jig-wide-fix", "Short strafe. The moment you see me, you're already going back."],
  ["rev-jig-stay-saw", "You stayed out long enough for me to shoot. That's not a look."],
  ["rev-jig-stay-fix", "Out and straight back. If I can click, you were too slow."],
  ["rev-jig-none-saw", "I never got a flash of you. You didn't take the look."],
  ["rev-jig-none-fix", "Step out just far enough to see me, then get back in the wall."],
  ["rev-hold-sat-saw", "I swung you and you were a statue on that pixel."],
  ["rev-hold-sat-fix", "Holding loses this. When the call is swing, you take the timing."],
  ["rev-iso-both-saw", "I had a free shot. You were fighting my friend, and I was already on you."],
  ["rev-iso-both-fix", "Stay tight to the first wall. I shouldn't see you yet."],
  ["rev-iso-order-saw", "You shot past me. I was the close one, and I was still alive."],
  ["rev-iso-order-fix", "Clear me first. Then place for the next edge."],
  ["rev-iso-slow-saw", "You sliced my angle like you were afraid of it. I was already on your head."],
  ["rev-iso-slow-fix", "Same swing. Fast, on my head, then the next angle."],
  ["rev-iso-none-saw", "We both held, and you never took an angle."],
  ["rev-iso-none-fix", "Near one first. Tight to the wall, swing, then the next."],
  ["rev-iso-late-saw", "You opened my angle and your crosshair was still catching up."],
  ["rev-iso-late-fix", "Pre-aim me before you clear. One fight, already aimed."],
  ["rev-iso-low-saw", "You found my angle and aimed at my legs."],
  ["rev-iso-low-fix", "Head height on the way out. Then the next angle."],
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
