# Aim Theory

A mouse-and-keyboard course about the fight around the crosshair. Each lesson is one first-person clip: the fight moves, then it cuts to the other side of that moment. The coach says the lesson over the picture. Then the drill is yours. This version is not a chat and it is not a place to hire a coach.

Lessons:

1. **The Peaker's Edge** — peaker's advantage, and why holding an angle loses to a fast swing.
2. **The Swing** — crosshair placement, a committed strafe, and the counter-strafe before the shot.
3. **Wide or Jiggle** — take the fight, or take information.
4. **One Angle** — isolate so only one player can see you.

Skills are the mouse work around that: Mark is the click, Glide is the track, Relay is the switch. Step is where you are. You move from Open to Even to Fine only when the weak skill holds. The range (Snap, Follow, Chain, Rush, Line) is open practice for the same ideas. Same sensitivity model, same pointer lock.

Controller, pen, and touch are later phases. They are not in this build. Lessons ask an input device for degrees of look and a strafe axis. The only device is `src/input/mouse-keyboard.ts`.

## Run

```bash
cd aim-theory
npm install
npm run dev
```

Open the local URL. Chrome or Edge is the right browser.

```bash
npm test
npm run build
```

## Play

- Open a lesson. The clip plays on its own. One line sits on the picture while that view moves, then it cuts to the other side. No click between views. When the clip ends, the drill is yours: click to arm.
- Captions stay on screen if you mute the coach in Settings. **Skip** leaves the clip and starts the drill.
- On the drill, **click to arm**. The browser hides the cursor and locks it to the page. That lock is required. Aim Theory asks for unadjusted movement so the operating system does not accelerate the mouse. If the browser refuses, a warning stays up, because cm/360 can be wrong while OS pointer settings are in the way.
- **A** and **D** slide you along the angle. The mouse looks. **Click** shoots. On a swing, tap the opposite strafe key to stop, then shoot.
- **Esc** releases the mouse and pauses. **R** restarts the drill. **End drill** scores whatever you finished.

## Sensitivity

Settings take DPI, in-game sens, and a game yaw (Counter-Strike 2, Valorant, Overwatch 2, Apex, Fortnite, Call of Duty, or a custom yaw). cm/360 updates live:

`cm/360 = (360 × 2.54) / (yaw × sens × DPI)`

Switching games keeps that physical turn and rewrites the sens number. Horizontal FOV is separate: it changes how wide the range looks, not how far the mouse travels for a full turn. Default is 106°, about Counter-Strike on a 16:9 screen.

Fortnite's sens field is the percent without the sign. 8 means 8%.

Scores and personal bests are stored in `localStorage` on this machine. There are no accounts.

## Coach lines

Every spoken sentence is a script line in `src/voice/lines.ts` with an id and the exact words. The app speaks them with the browser's speech synthesis. To drop in a recorded take later, set `audio` on that line to a URL or a file in `public/`. If `audio` is set, that file plays instead of the synthetic voice. The words on screen stay the same.

```ts
LINES["edge-01"].audio = "/voice/edge-01.wav";
```

Or call `attachTake("edge-01", "/voice/edge-01.wav")` before the lesson starts.
