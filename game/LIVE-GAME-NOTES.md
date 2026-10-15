# Live game v5: how it works

The stats engine (`simulateMatchup`) still decides everything: the final score, who scores and assists, every shot on goal, hit, block, penalty and faceoff, and when each goal and penalty happens. The live game is a director. It plays real-looking hockey and steers the play so that each of those events actually happens on the ice at its exact game time. When the live game ends, the scoreboard equals the box score.

## Files

| File | Role |
|---|---|
| `live-game.js` | The whole live game: schedule builder, fixed-step simulation, 3D view, 2D fallback and UI. It loads only when you press "Play next game", not at page start. |
| `skater-glb.js`, `goalie-glb.js`, `skater-models.js` | The 3D team's ctfo-v2 rigged and animated players (2.5 MB total). They are loaded when a game is watched, not at page start. |
| `live-assets/arena-home-glb.js` | TD Garden with Bruins dressing: banners, gold center logo, BOSTON on the ice. Used when Boston is the home team. |
| `live-assets/arena-neutral-glb.js` | TD Garden with generic dressing. Used when any other team is at home. |
| `live-assets/glb2js.py` | Wraps a `.glb` as a JS file (base64 global). This keeps the game working when it's opened from `file://`, where browsers block XHR and fetch. |
| `index.html` / `app.js` | The engine now emits an event log, and the box score gets a scoring and penalty summary. Live playback has a new entry point, and the old renderer is kept as a fallback (`watchNextGameLegacy`). |

## The engine log (what the live game must reproduce)

`simulateMatchup(..., wantLog=true)` returns `log` with:
- **Goals:** time, team, situation (ES, PP, SH, EN, OT), scorer, assists, the five skaters on ice for both teams, and whether it was the late tying goal.
- **Penalties:** player, start, end, and the PP-goal time if one cut the penalty short. Penalties never overlap and never cross an intermission.
- **Goalie pull:** window and team.
- **Totals per player:** saves faced by situation, hits, blocks and faceoff wins.
- **Lines, pairs and PP/PK units** with their ice-time shares.

The box score shows a period-by-period line score plus SCORING SUMMARY and PENALTY SUMMARY tables built from the same log, so the times you saw live are in the box score.

## How a live game is built

1. **Schedule.** Goals and penalties are fixed at their engine times. Shift plans are generated from the TOI shares, with F shifts of 34–54 s and D shifts of 40–62 s, and they're adjusted so the five on-ice players for every goal, plus the penalized player, are on the ice at that moment. PP and PK units take over during penalties, OT is 3-on-3, and the extra attacker comes on when the goalie is pulled. Saves, hits and blocks get times in compatible shifts with realistic spacing. Extra icings, offsides and goalie freezes are added so the faceoff count equals the engine's, and the faceoff winners match each team's faceoff wins.
2. **Simulation (no DOM, testable headless).** Fixed 1/60 s steps; positions are in feet. The clock runs at period length / 20 minutes. It is elastic: it slows when the next event needs more time to set up and catches up when the play is ahead, but it can never pass the next event. Each event fires at its exact time.
3. **Director.** For the next event it works out which team must be attacking and commits a play when the timing works:
   - shot, one-timer or tip
   - pass-then-shot (cross-seam passes make the goalie push across)
   - point shot into a shot-blocker
   - check on the puck carrier
   - stick infraction (the offender goes to the box)
   - offside entry
   - icing
   
   Between events, the teams play: breakouts (D-to-D, rim, swinging center), regroups, neutral-zone carries, stretch passes, dump-and-chase, offside-aware entries, low-to-high, D-to-D and cycles. Possession changes through steals, intercepted passes, wide shots, dumps and clears.
4. **Systems.** These come from your Lines & Strategy settings; AI teams get one derived from their coach system.
   - **Forecheck:** 1-2-2, 2-1-2 or 1-1-3, with F1, F2 and F3 assigned live.
   - **Neutral zone:** 1-2-2, 1-3-1 trap or 2-1-2.
   - **Defensive zone:** Tight point, Protect slot or Balanced coverage. The strong-side D pins, the weak-side D takes the net-front, and wingers take the points.
   - **Power play:** umbrella with the QB at the top, flankers on their one-timer side, a bumper and a net-front.
   - **Penalty kill:** box, or a diamond when Tight point is chosen.
   - **Other situations:** 3-on-3 OT and 6-on-5 with the goalie pulled.
5. **Player tendencies** come from the engine's talent numbers:
   - Snipers look for soft ice in the circles and get one-timers.
   - Playmakers pass more.
   - Grinders go to the net and get tips and rebounds.
   - Offensive D activate down the weak side.
   - Defensive D stay home.
6. **Goalies.**
   - They stay in the crease, square to the puck and set their depth by distance (2.4–4.6 ft), and they hug the post on wraparounds.
   - They shuffle at 9 ft/s and T-push at 17 ft/s, go to the butterfly on shots and cover the puck for whistles.
   - They leave the crease only for the empty net.
7. **Line changes** happen on the fly from the engine's lines and TOI. Players skate to the bench gate on the far side (−Z), and penalized players skate to the box on the near side (+Z). Goals get a banner and a celebration, followed by a center-ice faceoff. Faceoffs happen at the correct dot: end zone after icings, freezes and penalties; neutral-zone dot outside the zone after offside; center after goals and at period starts.
8. **Shootouts** are played out shooter by shooter, and the winner is always the engine's.

## Broadcast view

- **Camera:** side-on, elevated and critically damped. "High camera" shows the scoreboard, ribbon and banners.
- **Animation:** 60 Hz simulation with render interpolation. Players get procedural lean, stride bob and shoot, pass, check, block, fall and butterfly poses.
- **Jerseys:** home teams wear their dark jersey; away teams wear white with team-colour trim. Both are recoloured from the skater texture, with numbers on the back.
- **Arena:** the TD Garden GLB, with the live score on the four scoreboard screens and a scrolling LED ribbon. If the arena file is missing or fails to load, the old procedural rink is used.
- **Fallbacks:** without WebGL, a 2D top-down board is used. If `live-game.js` itself fails, the old renderer runs.

## Controls

- **2x speed.**
- **Sim to end of period:** plays the rest of the period instantly, with the same events and the same score.
- **Skip to box score.**
- **Show systems:** F1/F2/F3, PP and PK role tags over the players.
- **High camera.**

The game closes by itself about 9 s after the final horn and opens the box score.

## Length

At the default 3-minute period setting, a full game measured about 16–20 minutes at 1x (average 18; about 9 at 2x). The clock stops for whistles, and every shot, hit and block is played out, so a full NHL game's ~200 events take time. Set `window.CTFO_PERIOD_MS` to change the base pace; the elastic clock keeps it watchable. Periods shorter than about 27 s switch to a quick mode that just runs the clock (used by the automated smoke test).

## Player models (ctfo-v2)

The skater and goalie are rigged and animated. The live game drives the clips itself, without the runtime's auto mode, because it knows the real speeds and events:
- **Skater locomotion** follows speed and turn rate: idle, glide, skate_stride (timescaled), and crossovers on hard turns.
- **Skater one-shots** follow play events: wrist_shot, slap_shot (D point shots) or one_timer; pass; receive_pass; body_check; and celebrate for the scorer.
- **Goalie:** goalie_ready, or goalie_idle when the puck is far away. butterfly on shots; glove_save or blocker_save depending on the side; t_push_left/right on fast lateral moves such as cross-seam passes; cover_puck on freezes.
- **Timing:** clips are offset so the release frame lands on the actual puck release. At 2x they play at 2x.
- **Colours:** home teams wear their primary jersey with secondary trim. Away teams wear white with primary trim, and the away goalie gets white pads. The back number is pinned to the chest bone.
- **Fallback:** if the model files are missing, capsule players are used.

## Test results (v5 build)

- **Headless engine, 40 stats-engine games:** in all 40 the live ledger equals the box score: score, shots on goal, hits, blocks and faceoffs per team, and every event at its exact time (±0.05 s). Per game:
  - The goalie is outside the crease 0 times.
  - About 238 passes, 20 one-timers and 7 cross-seam passes.
  - The power-play umbrella sets up in 80% of power plays; the rest usually never got set possession in the zone.
  - Of about 150 events, 15 are "forced", meaning the play couldn't set up in time and the player is nudged into position.
- **Headless Chrome (SwiftShader, no GPU), 12 + 3 live games through the real UI:**
  - 10+ full games ran at accelerated speed. Others used 2x plus Sim to end of period after P1 and P2, or Sim to end of period for every period.
  - All finals matched the box score: goals (scorer and time), penalties, SOG and faceoffs. That includes 2 OT and 2 shootout games.
  - All scoreboard checks during play and after Sim to end of period matched.
  - There were 0 console errors and 0 failed requests.
- **Season smoke (v4 flow):** start a franchise, watch a game, skip a game, sim to the deadline, visit all pages, trade room, sim to the playoffs, save. All passed with 0 errors. The save has no meshes in it (223 KB IndexedDB).

## Known limitations

- **Forced events:** about 10% of events are forced. A player can visibly slide the last few feet into a shooting lane or check, or appear in a line change (about 29 instant swaps a game) when the scripted personnel couldn't get there in time.
- **Shootout length:** the shootout is decided by the engine, but its attempt-by-attempt goals are generated to fit the winner. The engine doesn't log individual shootout attempts.
- **Tactics not wired:** "Shoot first" and "Possession" offensive styles don't change on-ice behaviour yet; only "Crash the net" does.
- **Camera:** it follows the puck but doesn't cut to replays.
- **Mid-period skipping:** Sim to end of period plays the rest of the period instantly; there is no fast-forward to a specific time.
