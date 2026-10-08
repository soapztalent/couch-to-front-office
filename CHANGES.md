# Couch To Front Office v9.1 (Oct 8, 2026)

## Draft night
- **Real players on stage.** The walk-up now uses the same 3D player model as the live game instead of the low-poly figures:
  - He walks up from the crowd with a proper stride and arm swing.
  - The GM hands him the jersey and he pulls it on (team kit with his number on the back and sleeves).
  - He shakes the GM's right hand at centre stage, both turned three-quarter to the camera.
  - They pose for photos with flashes.
  - The GM wears a dark suit with a shirt and a tie in the team's accent colour.
  - The model loads once and is reused; the 2D stage is still the fallback.
- **Handshake caption fixed:** it now shows the player's name and the club's GM separately (e.g. "Brock England" and "Boston Bruins GM", or "You · general manager" for your picks).
- **CPU signings toned down** to realistic rates: CHL picks 21–64 about 1 in 4 sign right away, CHL 65+ about 1 in 20, Europeans 16+ about 1 in 25. Your own odds from the on-stage conversation are unchanged.
- **No double phone call:** if you already talked to the player on stage, the follow-up phone call is skipped automatically.
- **Pick card:** shows your scouts' OVR range and POT range (SCOUT OVR / SCOUT POT).

## Scouting overhaul (Sim Bot)
- The new scouting department:
  - Combine and medicals.
  - Interviews that reveal character.
  - War room: scouts pitch players; you back, overrule, move or mark do-not-draft, then lock your board.
  - Leaks to move other clubs' boards.
  - Staff hiring.
  - A scouting file on every prospect.
  - Draft grades for all 32 clubs, and redrafts after three seasons.
- Real 2027–2030 draft classes (Elite Prospects bios, public rankings, real birthplaces and stat lines; 280 players per class).
- CPU clubs draft off their own imperfect boards (bias, noise, your leaks). Your auto-picks follow your locked war-room board.

## Fixes
- Home news shows the newest five items (it showed the oldest five).

# Couch To Front Office v9 (Oct 8, 2026)

v9 is v8 plus Build Bot's draft overhaul (with fixes) and a full redesign of every remaining page in the home hub / FA theme.

## Draft
- **Draft order and lottery:** non-playoff clubs get picks 1–16 through a 2-draw lottery (max jump of 10). Picks 17–32 now follow the real NHL rule: clubs out in rounds 1–2 by points with division winners last, then conference-final losers, the runner-up and the champion.
- **Draft room:** Sim to my pick, Sim round, make your own pick from the scouting board, or auto-draft the rest. CPU clubs pick sensibly (by board rank and team need).
- **Draft rights and ELCs:** picks join your reserve list as unsigned rights (CHL 2 years, college/Europe 4). Offer an entry-level contract from Draft Rights.
- **New:** ELC slide (teenagers with under 10 NHL games keep their ELC years), rights expiry on June 1, and draft re-entry for unsigned players who are still 20 or younger.
- **Fixed:** the "Resolve draft rights →" button did nothing; a goalie could be ranked first in a generated class.
- Generated classes are realistic: 280 players, mostly 18-year-olds, ~35% defence, ~10% goalies, a mix of nations and leagues, and clearly stronger players at the top.

## Draft night broadcast
- Every pick can play out like the TV broadcast: **On the clock** (crest, pick, countdown, team colours) → **Podium** (the GM; you, for your picks: "With the 12th pick in the 2027 NHL Draft, the … are proud to select…") → **The pick** card (height/weight, shoots, birthplace and date, team/league, last season, scouting blurb, potential grade and projection, and a character hint like "Character: Competitive, Loyal") → **Walk-up** on a 3D stage (he walks up from the crowd, pulls on the jersey, shakes the GM's hand, photo flashes) → **Draft board** with the next club on the clock. A ticker of recent picks runs along the bottom.
- Controls: Skip this pick, Sim to my next pick, speed 1x/2x/4x, and Presentation: Full / Round 1 only / Off (saved). After round 1, CPU picks get a quick card flash (Full) or just the ticker (Round 1 only). Your picks always get the full show. If 3D isn't available, a 2D stage is used.
- **On-stage conversation (your picks):** after the handshake he asks you a question, or you ask him one and pick your follow-up. 150 hand-written questions (75 each way) across ice time, turning pro, development, team direction, depth chart, family, idols, work ethic, leadership, pressure, Europe, contract timing and character. Each has 4 answers: a strong one, a decent one, a risky one that depends on his personality, and a bad one. No question repeats within a save.
- What you say moves his willingness to sign: **signs his ELC on the spot**, **will sign later this summer** (within a few weeks), **returns to junior/college/Europe** (you keep his rights), or rarely **unhappy, may not sign** (rights at risk). It uses the real ELC and rights rules, including the 50-contract limit and the ELC slide.
- A **debrief** follows: his full personality profile, a verdict (Great / Good / Risky / Wrong), why it landed that way, the best answer and why, and "Signing chance 48% → 71%".
- CPU clubs' draftees go through the same model off-screen.

## Full redesign
- Every office page now uses the same look as the home hub and the FA market: near-black panels with thin borders, gold condensed kickers, condensed headings, dark buttons with a gold primary button, square tags, gold selected states and gold focus rings.
- Office dashboard (including the Next Game card and the quick-sim buttons), roster, lines, schedule, standings, player stats, player file, trade room, salary cap, contracts and re-signs, AHL/prospects and the organization planner, draft room, playoffs, awards, scouting, options and data tools, save, box score, and the live-game scoreboard, call bar and buttons (the 3D rink itself is unchanged).
- The photo masthead and arena backgrounds are replaced by a compact dark command bar; the top nav is a dark bar with a gold underline on the active tab.
- **Fixed:** red warning and error text is red again (the old theme greyed it out); the organization planner, which had no styling, is laid out properly; the player file's Team Leadership panel no longer squashes its text, and the Captain button is labelled "Captain"; team names in the box score are no longer cut off; the re-sign list's "Build trade" button no longer runs off the edge.
- The GM style screen shows TBD payroll for clubs whose contracts aren't in the starting snapshot, like the home screen.
- Playoff series notices name your club instead of always saying "Boston". Error notices are red again (the theme had painted every notice green).
- No game-logic changes beyond the draft work above. All controls and element IDs are unchanged.

---

# Couch To Front Office v8 (Oct 8, 2026)

- The "Choose your GM style" setup screen is redesigned to match the v7 home hub / FA theme (same panels, fonts, tags, gold primary button, check-mark selected state, focus rings); every control works as before.

---

# Couch To Front Office v7 (Oct 8, 2026)

v7 is v6 plus a fully redesigned **home / start screen** in the same design language as the FA v2 market screen. Game logic is unchanged.

## New: front-office hub home screen
- **New layout and hierarchy, not a recolor.** Near-black panels with thin borders, gold condensed uppercase kickers, big condensed headings with a gold accent, stat blocks (small dim label + big number), gold and dark-outline buttons, and square tags. These are the same tokens the FA screen uses (`#07090b` page, `#0d1013` panels, `#1d2328` lines, `#FFB81C` gold, green/red status colors, Barlow Condensed / DM Sans stacks).
- **Command bar** (top): "RUN YOUR FRANCHISE." with the career window (2026–27 → 2050–51), 25 seasons and "save anytime" as stat blocks. The **data status line** (Ready to play · Offline, player counts, payroll-snapshot note) is the bar's footer strip.
- **Continue career is the primary action when a save exists.** It gets its own gold-edged strip with the saved club's crest, name, season and record, plus a large gold **CONTINUE CAREER** button. While a save exists, **Start new franchise** switches to a dark outline button so there is only one gold call to action.
- **Team picker:** all 32 clubs in four division columns (Atlantic, Metropolitan, Central, Pacific, each labelled with its conference), with logos, a team-color edge, and a clear selected state (gold border and fill, check mark, "(selected)" for screen readers, `aria-pressed`). Keyboard focus stays on the tile you picked and every button has a visible gold focus ring.
- **Selected-club panel** (right rail, sticky): crest, name, division tag, roster count, payroll, cap space, average age, a payroll-vs-cap meter, the **Start new franchise** button, and the top 4 players by OVR.
  - Honest data: the starting snapshot only has full contracts and ratings for Boston (the other clubs' contracts and ratings are set when a career starts). For those clubs the panel shows **TBD** for payroll and cap space, the meter says "contracts set at career start", the player list becomes a "Roster preview" without OVR badges, and team tiles show the player count instead of cap room.
- **Responsive:** checked at 1280×800 and 1920×1080 with no horizontal overflow. Below 1180 px the picker goes to 2 columns; below 860 px the rail stacks under the picker; below 560 px it is one column.
- **Unchanged:** Career tools menu, the mode and setup screens, saving and loading, and every element ID the game uses (`continue-career-button`, `to-modes`, `team-grid`, `selected-*`, `starting-data-status`, and so on).

## Files
- `home-redesign.css`: new, generated from `home-redesign.src.css` by `build_home_css.py` (in the patch folder; same pattern as Sim Bot's `free-agency.css`). Every rule is scoped to `body[data-view] #team-screen.home7` and marked `!important` so it beats `bruins-theme.css`.
- `index.html`: new `#team-screen` markup, a `<link>` to `home-redesign.css` after `free-agency.css`, and the script changes below.
- `app.js` (byte-exact mirror of the inline script): `renderTeams` now groups by division and keeps focus; new `home7ClubSummary`, `home7Rows`, `home7Known`, `home7Cap` helpers; `updateTeamHeadings` calls the summary; `refreshContinueCareer` toggles `body.h7-has-save` and puts the club crest in the continue strip.

---

# Couch To Front Office v6 (Oct 8, 2026)

v6 is v5 (the rebuilt live 3D game) plus the teammates' season-sim fixes, the new AI trade market and the AHL system, plus a new quick-sim feature on the dashboard. The full merge log is in MERGE-NOTES.md.

## New: quick sim on the Next Game card
- Two new buttons sit under **PLAY NEXT GAME**, in the same gold style: **SIM TO END OF WEEK** and **SIM TO END OF SEASON**.
- **Sim to end of week:** sims every game through the coming Sunday, which is the first Sunday after your last game. If no game falls before that Sunday (a schedule break), it sims the next 7 days instead. It stops early when:
  - the regular season ends
  - the trade deadline arrives (it then opens the Trade deadline day screen)
  - a club phones you about a trade
- **Sim to end of season:** asks for confirmation first, then sims the rest of the regular season. It stops *before* the playoffs, and the main button then reads **START PLAYOFFS**. It runs the trade deadline on the way, the same as "Simulate to playoffs".
- **How it sims:**
  - It uses the existing season-sim path: the stats engine, with no live game.
  - Weekly AI trades, AHL moves, injuries, the trade deadline and autosave all still run.
  - A progress panel ("Game 5 of 13") with a **Stop after this game** button covers the screen while it sims, and the card's buttons are disabled.
- **Afterwards:**
  - The dashboard refreshes.
  - A summary line shows the games simmed, Boston's record over that stretch, the season record and points, and the number of trades around the league.
  - The card keeps a "Last sim: …" note.
- **End of season and offseason:** once the regular season is complete, the buttons are replaced by "Regular season complete". In the playoffs and offseason they're hidden.

## From Sim Bot (V4FIX + V4LOYAL)
- **Birth dates:** 40 roster players with missing birth dates now have real ones, and an age fallback replaces the flat age of 24.
- **Contracts:** sanity rules for veteran and RFA contracts (no more $10M one-year deals for 36-year-olds).
- **Playoffs:** they always finish with a champion, a runner-up and all 15 series, even when Boston misses or is knocked out.
- **Awards:** the Calder now goes to real rookies, and the Hart and Vezina use weighted formulas.
- **Year-1 cap floor:** AI clubs are brought up to the floor at the season opener.
- **Loyalty:** players with 8+ straight seasons with one club are tracked, get hometown discounts and lean toward re-signing.

## From Sim Bot: Free Agency v2 (5-day market)
- **A 5-day market.** Players decide on Day 1, 2 or 3 depending on OVR (85+ on Day 3, 75–84 on Day 2, the rest on Day 1). Loyal players decide a day earlier. Days 4–5 are buffer days for final chances, late twists and last call.
- **Agent calls:** a player's agent can offer Boston a sign-today counter.
- **Boston final-chance rebid:**
  - When Boston is trailing at a player's decision, you get one rebid.
  - Every rebid, win or lose, adds a penalty to all your other FA talks: +8 interest points and +4% asks. It resets each offseason.
- **AI prices:** AI bids sit close to the ask (median about 1.02× ask).
- **Limits at close:** the 50-contract limit is enforced during FA, and the G, D and F minimums are filled before the market closes.
- **New screen:** a new FA screen (table, offer drawer, final-chance dialog) styled by `free-agency.css`.

## From New Bot (AI trade market v5 + AHL)
- **Weekly GM evaluations:** every AI GM reviews its club every 7 calendar days. Each club has one of six org roles (WIN_NOW, CONTENDER, BUBBLE, RETOOL, REBUILD, YOUTH_MOVEMENT) plus a cap-trouble overlay.
  - A role change needs **3** straight evaluations.
  - Trades happen weekly, at the deadline, at the draft, on July 1 and through the summer.
  - Loyal players get a soft no-trade preference.
- **AHL affiliates:**
  - call-ups and send-downs
  - injury and hole fills
  - waivers, with a claim order
  - the 50-contract limit
  - development scaled by playing time

## v6 merge fixes
- **AI moves on game nights:** the weekly trade/AHL tick now runs after your game's box score is recorded. An opponent player moved that night no longer vanishes from the box score or the live game.
- **Live game after a deadline trade:** the live game finds dressed players even if a deadline trade moved them right after the game.
- **Tenure in cap-floor trades:** these trades (preseason and Sept 1) now reset loyalty tenure right away.
- **False error banner:** a failed image load (for example a team logo while offline) no longer shows the red "The game could not start" banner.

## Test results (headless Chrome)
- **Season runs on the final build** (FA v2 included): two full-season runs, from the opener through the July 1 rollover into the 2027–28 start.
  - 0 console errors, and 0 duplicate players at every checkpoint.
  - Boston missed the playoffs, and the bracket still finished with all 15 series: CBJ beat VGK 4–1 in the Final.
- **Trades:** 43 AI market trades (24 weekly, 10 at the deadline, 6 at the draft, 3 on July 1), plus V4FIX cap-floor trades. Earlier pre-FA-v2 runs had 43–50.
- **AHL:** 336 moves (118 call-ups, 111 send-downs, 71 waiver placements, 36 claims). The 50-contract test passed: ANA was padded to 53 contracts, a trade into ANA was refused, and ANA was trimmed back to 50.
- **Cap:** no AI club over the cap or under the floor at FA close or at the 2027–28 start.
- **Standings:** every team played 82 games, and league W equals L + OTL.
- **League averages:** 3.09 GF/G, 29.8 SF/G, .898 SV%, 22.3% PP.
- **Live 3D games:** 5 played through the real UI on the final build, using 2x speed plus Sim to end of period. Every one matched the box score: final score, goal times, teams and scorers, including 3 overtime games. Every game rendered in 3D. One game came right after the deadline trades and one after a save/reload. Each game averaged 214–305 passes and 18–31 one-timers, the umbrella appeared on most power plays, and the goalie never left his crease. There were 0 errors.
- **Quick sim:**
  - 23 "Sim to end of week" runs went from game 2 to the deadline, at 1–3 games each. The stop at the deadline opened the Trade deadline day screen.
  - Standings, Boston's record, Boston's team-stats GP and league W = L + OTL stayed consistent after every sim, and every summary matched the record change.
  - Cancelling "Sim to end of season" simmed nothing. Accepting it simmed the remaining 13 games and stopped at game 82 before the playoffs, showing START PLAYOFFS.
  - In an earlier run, a stop for a trade call worked.
- **Save and reload:** after a reload, Continue career restored the same day, record, roster, AI trade log, AHL log, org roles and tenure.
- **FA v2 in full seasons (final build):**
  - 0 errors.
  - After FA: no AI club over the cap or under the floor ($93.64M–$113.23M), none over 50 contracts, and no club short at G, D or F at the 2027–28 start.
  - The pool was empty at close, so no stars were left unsigned.
- **FA v2 targeted test:**
  - A **losing Boston rebid** works: Hayton went to EDM, the notice read "your rebid fell short (the penalty stays)", and the penalty went 0 → 1.
  - The penalty **survived save + reload** (rebids 1, +8 interest, +4% asks, same market day).
  - The market then closed with 0 clubs over the cap or under the floor, none over 50, no unsigned 85+ players, and 0 errors.

---

# v5: live game rebuilt (real hockey, choreographed to the stats engine)

Base: v4 (`/workspace/sim-v4`, unchanged). The season sim, saves, trades and every other screen work exactly as in v4. Only the live game and the box score changed, plus the engine now emits an event log.

## Files

| File | Change |
|---|---|
| `index.html` / `app.js` (kept identical) | `simulateMatchup` takes a new `wantLog` flag and returns a full event log (goals with on-ice players, penalties, goalie pull, per-player shots/hits/blocks/faceoffs). The penalty and goal timeline was made self-consistent: no overlapping penalties, a PP goal ends the penalty, and no shorthanded goal by the player in the box. `simulateGame` stores a scoring/penalty summary on the box score. The box score shows a line score plus SCORING and PENALTY SUMMARY tables. "Play next game" now runs `live-game.js`; the old renderer is kept as `watchNextGameLegacy` and is used automatically if the new one can't start. The player-mesh `<script>` tags moved out of `<head>`, so meshes load only when a game is watched. |
| `live-game.js` (new, 118 KB) | The new live game: schedule, fixed-step hockey simulation, systems, director, 3D broadcast view, 2D fallback and controls. See `LIVE-GAME-NOTES.md`. |
| `live-assets/` (new) | `arena-home-glb.js` and `arena-neutral-glb.js` (TD Garden, base64 so it works from `file://`), `glb2js.py`, README. |
| `skater-glb.js`, `goalie-glb.js`, `skater-models.js` | Replaced with the 3D team's ctfo-v2 rigged and animated models (2.5 MB total instead of 24.8 MB). The old `skater-models.js` can't animate skinned meshes, so it had to go. |

## What you'll see

- **Every goal, shot, hit, block, penalty and faceoff from the box score happens on the ice at the time shown.** The scoreboard always equals the box score, including after 2x and Sim to end of period.
- **Systems from Lines & Strategy:** forecheck 1-2-2, 2-1-2 or 1-1-3 (F1/F2/F3 visible with "Show systems"), neutral zone 1-2-2, 1-3-1 or 2-1-2, and defensive coverage Balanced, Tight point or Protect slot. AI teams get systems from their coach.
- **Hockey plays:**
  - Breakouts: D-to-D, rim, swinging center.
  - Neutral zone: regroups, stretch passes, dump-and-chase, offside-aware entries.
  - Offensive zone: cycles, low-to-high, point shots, one-timers, tips, rebounds.
- **Power play:** umbrella with QB, flankers on their one-timer side, bumper and net-front.
- **Penalty kill:** box, or diamond with Tight point. Man counts follow the penalties, and the penalized player sits in the box.
- **Goalies** stay in the crease, track the angle, shuffle, T-push and butterfly. They cover the puck for whistles and leave only for the extra attacker.
- **On-the-fly line changes** follow the engine's lines and TOI, and faceoffs take place at the correct dots. Goals get a celebration, then a center-ice faceoff. OT is 3-on-3, and shootouts are played out.
- **Broadcast presentation:**
  - Side-on camera, plus a "High camera" option.
  - TD Garden arena with the live score on the scoreboard and LED ribbon. It falls back to the procedural rink if the file is missing.
  - Home teams wear dark jerseys and away teams wear white, with numbers.
  - Animated skating, shots, passes, checks, saves and celebrations.
- **Controls:** 2x speed, Sim to end of period, Skip to box score, Show systems and High camera.

## Tested

40 headless engine games, 15 live games in headless Chrome through the real UI (10+ full games at accelerated speed, plus 2x and Sim to end of period), and the v4 season/save smoke flow. Every live final and every intermediate scoreboard matched the box score. Goalies never left the crease outside the empty net, and there were 0 console errors. Details and limitations are in `LIVE-GAME-NOTES.md`.

To rebuild from v4: `/workspace/codereview/patch9/build_v5.sh`.

---

# Couch To Front Office: sim engine v2

Base: the newer upload (`couch-to-front-office-main`). Only the game-sim engine and a few support spots changed. Everything else in the package is byte-for-byte the same as the upload.

## Files touched

| File | What changed |
|---|---|
| `index.html` (the big inline script) | All changes below. **This is the file the game actually runs.** |
| `app.js` | The same patch, applied identically. Note: `index.html` does **not** load `app.js`, because it inlines its own copy of the script. `app.js` was patched only so the two copies stay in sync. If you edit the game later, remember to edit the inline script in `index.html`. |

No other files changed: CSS, data files, assets and notes are untouched.

## What the new engine does (plain language)

### 1. Real ice time by line and pair, plus power play and penalty kill
- Each game is split into even-strength time and special-teams time. The number of power plays per team is random (about 3 a game, nudged by home ice and the "Crash the net" style), and each power play lasts about 1:45 on average.
- Even-strength time is shared by line: F1 about 31%, F2 25.5%, F3 24.5%, F4 19%. D pairs share 36%, 33% and 31%. Each game adds a little random variation.
- **PP1 and PP2** take about 63% and 37% of power-play time, using your Special Teams PP 5-on-4 unit first. **PK1 and PK2** take about 55% and 45% of penalty-kill time.
- Resulting average TOI: F1 about 19:00, F2 about 17:00, F3 about 14:00, F4 about 9:30, D1 about 24:00, D2 about 19:30, D3 about 15:30.
- Shots are generated **per player, per second on ice**. Each player's shot rate comes from their real NHL shots per 60 minutes. More ice time and more PP time mean more shots and points, while fourth-liners and scratches get very little.
- Assists go to the players who were actually on the ice: the scorer's linemates and D pair, or their PP or PK unit. Plus/minus works the same way, and PP goals never exceed the number of power plays.
- Shorthanded goals are possible. Penalty minutes are now credited to players (2 PIM per opponent power play), weighted by ice time and a hidden physical trait.
- Late in the game the trailing team can pull its goalie: sometimes it ties the game with an extra attacker, and sometimes the leading team scores into the empty net (no goal against for the goalie).
- OT is a 3-on-3 with the top 4 forwards and top 2 D. About 62% of OTs end with a goal, and the rest go to a shootout based on shooters' finishing and goalie quality.

### 2. Goalie rotation
- Every team, including yours, now uses two goalies. The starter's target share depends on how far apart the two goalies are rated, from about 56% to 75% of starts, with a small per-team, per-season variation.
- Back-to-backs strongly favor the backup (85%). Your team uses real calendar dates, and AI teams get about 17% back-to-back days. A starter who has made 12 straight starts sometimes gets a rest, plus a 3% random rest.
- **New setting:** Lines & Strategy, Team system, **Goalie workload**: `Balanced` (default), `Ride the starter` (about 80%), or `Split starts` (about 52%). In a one-season test Boston's split was 62/20 for Balanced, 66/16 for Ride, and 44/38 for Split.
- Your goalie order (Lines, Goalies 1 and 2) picks the starter, and injured goalies are skipped.
- Goalies now also track starts, losses, OT losses and shutouts (`goalieStarts`, `goalieLosses`, `goalieOtLosses`, `goalieShutouts`).

### 3. Realistic league totals while ratings still matter
- Player talent blends their last 3 real NHL seasons (weighted 50/30/20: shots/60, assists/60, shooting %, goalie save %) with their in-game OVR. Over later franchise seasons it drifts toward OVR so progression and aging take over.
- Small-sample seasons are pulled toward league average, so a hot 20-game season doesn't create a monster.
- The team gap matters: the average skater rating of the dressed lineup (plus each player's shooting, puck and defense strengths) changes shot volume and shot quality. Coach system, your Lines & Strategy choices, roster chemistry, stamina and home ice add small nudges.
- Goalie quality changes save % directly. League save % is about .900; top goalies reach .915–.923 and the worst about .880.
- 3-season averages: about **3.06 goals and 29.3 shots per team per game**, PP about 22–23%, best team 117–126 points, worst team 50–68. Shot leaders are around 350–385 shots instead of 660, and the top goal scorers land in the 50s and 60s.

### 4. Scratches and safety
- Only the 12 forwards and 6 D who are actually dressed get a game played, TOI, and other stats. Scratched and injured players no longer get a GP. Before, about 20.5 skaters per team per game were credited.
- `simulateToTradeDeadline` and `simulateToPlayoffs` now stop if a simulated day fails to advance, so the page can't hang in an endless loop.
- PK defaults: when the game auto-builds penalty-kill units, it now picks defensive forwards and D, interleaved, and leaves your top-3 scorers off the PK. Existing saves get this once, only if their PK still matched the old automatic "top-4 OVR" default, so hand-picked units are kept.

## Functions changed or added (index.html inline script; same in app.js)

- **Replaced:** `simulateMatchup(g, idA, idB, homeId)`. It has the same signature and the same return fields (`a, b, shotsA, shotsB, xGA, xGB, ot, so`) plus `goalieA, goalieB, ppA, ppB`. It also writes the same season team-stat fields as before, so box scores, standings, player stats and the trade desk read it unchanged.
- **New helpers (same script scope, right before `simAI`):** `SIMV2` (all tuning constants), `simV2Talent`, `simV2Lineup`, `simV2PickGoalie`, `simV2BackToBack`, `simV2Shares`, `simV2Strategy`, `simV2AttrDev`, `simV2Club`, `simV2Healthy`, `simV2IsF`, `simV2Pick`, `simV2Poisson`, `simV2Normal`, `simV2Hash`, `simV2Rand`.
- **`resetPlayerSeasonStats`:** also resets `shortHandedGoals`, `ppToiSeconds`, `shToiSeconds`, `goalieStarts`, `goalieLosses`, `goalieOtLosses`, `goalieShutouts`, `simConsecutiveStarts`.
- **`ensureSpecialTeams`:** new defensive default order for `pk54` and `pk53`. PP and shootout defaults are unchanged.
- **`simulateToTradeDeadline`, `simulateToPlayoffs`:** the no-progress loop guard.
- **Lines & Strategy team-system list:** added the `goalieWorkload` option row. It is stored in `g.lineStrategy.goalieWorkload` like the other system settings.

## Save compatibility
- No fields were renamed or removed. New per-player counters are added as they get used. New club flag: `simV2PkDefaults`, a one-time PK default migration. Old saves load and keep playing, and the first season after upgrading is a mix of old and new stats.

## Tuning knobs (`SIMV2` at the top of the engine block)
`fLineShare`, `dPairShare`, `ppUnitShare`, `pkUnitShare` set ice time. `ppOppsPerTeam` and `ppSecondsPerOpp` set penalties. `refShots60`, `refAssists60` and `refShPct` set league shooting by position. `sitShotMult` and `sitFinishMult` cover ES/PP/SH. `leagueSvPct` sets goaltending. `qualityShotK` and `qualityFinishK` set how much team rating gaps matter: raise them for bigger gaps between good and bad teams. Also `otGoalChance`, `lateTyingGoal`, `engLead1-3`, `b2bRate`, `faceoffsPerGame`, `hitsPerTeam` and `blocksPerTeam`.

## Known limitations and tradeoffs
- **Playoffs are unchanged.** They are still decided by the old series logic (no game-by-game player stats), and the bracket and champion bugs from the first review still apply.
- No in-game sequence (periods or penalties by time). Goals have random times only internally, and goalies are never pulled mid-game for performance.
- AI teams still don't get injuries, so only the user team loses players. That is unchanged.
- AI-generated player attributes run about 12 below their OVR, while the user team's attributes track OVR. To keep things fair, the engine uses attributes only *relative to the player's own average* and uses OVR for overall strength. The ratings mismatch itself is not fixed.
- The new stats (PP TOI, SH TOI, SH goals, goalie starts, L, OTL and SO) are tracked but **not shown in the UI yet**. Existing GP, G, A, PTS, +/-, PIM, TOI, SOG, FO%, hits, blocks and goalie W/GAA/SV% columns all fill in.
- Points leaders sometimes reach 125–135 (e.g. McDavid 136 in one chained test season). That is high but possible. About 5–8 players reach 100 points a season, a bit more than the NHL's usual 3–6.
- OT/shootout games are about 19% vs the NHL's about 23%. Best-team points (117–126) are a bit high some seasons because the strongest real rosters (COL, EDM, MIN) stack up.
- Offline, the pre-existing "fatal error" banner from blocked NHL logo images still appears, same as the unmodified build. That's not related to this change.

---

# Update 2: saving and the Free Agents crash

As before, this patch is applied **identically to `index.html` (the inline script the game runs) and `app.js`**. No other files changed.

## 1. Saving now persists and survives a reload

**What was wrong:** the whole game object was written to `localStorage` on every change, and it was **about 9.1–9.5 MB** of JSON. Browsers cap `localStorage` at about 5 MB, so every write threw a quota error. `persist()` swallowed the error, and **Save** still said "Franchise saved". After a reload there was nothing to load. In a clean browser profile the unmodified build left `localStorage` empty, and **Continue career** was hidden.

**What changed:**
- **Smaller saves.** Before writing, `compactGameForSave(g)` drops data that is rebuilt from the bundled files:
  - **NHL history (`nhlStatsById` / `nhlStatsByName`, about 1.9 MB):** only entries that differ from the bundled `nhl-stats-history.js` are kept (normally none). `nhlStatsBundledVersion` is left out, so the existing `mergeBundledNhlHistory` rebuilds it on load in any build.
  - **`leagueTeams[*].prospects` (about 160 KB × 31 clubs ≈ 4.9 MB):** a generated list that nothing in the game reads. The game's real draft class (`g.prospects`) and each club's drafted players (`orgProspects`) are still saved. On load each club gets `prospects: []`, so the data shape is unchanged.
  - **Result:** the save JSON is about **2.25 MB** for a new career, **2.5 MB** mid-season and **2.76 MB** in the offseason.
- **Compression:** the compact JSON is gzipped with the browser's built-in `CompressionStream`, so the stored save is about **170–270 KB**.
- **Where saves live:** **IndexedDB** (database `couch-to-front-office`, store `saves`, key `nhl-franchise-simulator-v05-save`).
  - If IndexedDB is unavailable or fails, the save goes to **localStorage** under the same key as before (gzip + base64, about 230 KB).
  - A small summary (`…-save-meta`, about 150 bytes) in localStorage drives the **Continue career** card.
  - When an IndexedDB save succeeds, any older full save under the old localStorage key is removed.
- **Honest results:**
  - **Save** now waits for the write and says where it went and how big it was, e.g. "Franchise saved in this browser (IndexedDB, 190 KB)".
  - If every storage option fails it says "Save failed: … Use Export to keep a copy", and the top-bar label shows the same.
  - Auto-save shows "Auto-saved 10:42 PM · IndexedDB · 190 KB" or the failure.
- **Auto-save:** the many `persist()` calls now mark the game as changed, and one write happens about 0.7 s after a burst of activity. Changes are also flushed when the tab is hidden or closed. On close, a plain-JSON copy is also written synchronously to localStorage when it fits. On load, the newest copy wins.
- **Load:** reads IndexedDB first, then localStorage. It reads the new format, the new localStorage fallback, and old raw saves under the v0.5 and v0.4 keys.
- **Export / Import:**
  - **Export** writes the compact JSON in the same `{format:'nhl-franchise-save-v06', game:{…}}` wrapper, without pretty-printing. That is about **2.5 MB** instead of about **17 MB**.
  - **Import** accepts both old full exports and new compact ones. An old export made with the unmodified build imported with the same day, record, rosters and standings.
- **Lossless check:** loading a compact save produces exactly the same game as loading a full save would. That was checked across the whole game object at career start, mid-season, end of season and offseason. The live-sync status fields are restored after the bundle re-merge.
  - The only differences after any load are the existing `upgradeGame` clean-ups that the original loader also does: `retainedLayers` defaults, roster-role assignment, `centerDrought` and `rosterRoleAssignmentsInitialized`.

**Functions changed or added:** `persist` (replaced), new `flushSave`, `writeSave`, `writeLocalSave`, `writeSaveMeta`, `readStoredSave`, `openLoadedGame`, `compactGameForSave`, `rehydrateSavedGame`, `saveStatsDelta`, `saveCanon`, `openSaveDb`, `saveDbRequest`, `saveGzip`/`saveGunzip`, `saveToBase64`/`saveFromBase64`, `saveSummary`, `saveSizeLabel`, `updateSaveStateLabel`, `persistOnLeave`, `parseLocalSave` and `gameFromLocalRecord`. Also changed: `saveGame`, `loadGame`, `exportGame`, `importSave`, and the reading part of `refreshContinueCareer`. A `pagehide` listener and a `visibilitychange` listener were added.

## 2. Free Agents no longer crashes in-season

**What was wrong:** `freeAgencyMarket(g)` read `g.offseason.freeAgency`, and `g.offseason` is `null` during the season. Opening **Front Office → Free Agents** threw "Cannot read properties of null (reading 'freeAgency')", and the page never rendered.

**What changed:**
- `freeAgencyMarket(g)`: with no offseason it returns a small in-season market object (`g.inSeasonFreeAgency`: date, log). The offseason market is untouched.
- `renderFreeAgency(g)` now routes the page:
  - **In-season:** the new `renderInSeasonFreeAgency`.
  - **Offseason:** the original page, renamed `renderOffseasonFreeAgency`, which still drives the July 1 – September 1 offer/advance-day flow.
- **The in-season page** lists **unsigned players**: the curated `current-free-agents.js` pool (34 players at the 2026 start), and in later seasons, UFAs left unsigned after the summer (105 at the start of season 2 in testing).
  - Each card shows position, age, last club, asking AAV, sim OVR, preference and fit. You pick term (1–5 years) and AAV (−25% to +35% of asking). Search works as before.
  - Header cards show the market date (from the schedule), the number available, and cap room with contracts used out of 23.
- **Signing in-season (`signFreeAgentInSeason`):** the player answers immediately. The order of checks:
  1. The market must be open: regular season only, not the playoffs.
  2. You must have fewer than 23 players under contract.
  3. The full AAV must fit under the cap.
  4. The offer must reach his price for your club. That price is the asking AAV adjusted by fit, roughly 85–115%; if you're short, he says roughly what he wants.
  5. The existing `completeFreeAgentSigning` then moves the player, records the contract and transaction, and rebuilds lines.
- `signFreeAgent` sends in-season clicks to this path. Offseason offers work exactly as before.

**Functions changed or added:** `freeAgencyMarket` (in-season branch), `renderFreeAgency` (router), `renderOffseasonFreeAgency` (the original, renamed), new `renderInSeasonFreeAgency`, `signFreeAgentInSeason`, `inSeasonMarketDate`, `inSeasonSigningOpen`, `inSeasonFreeAgentAsk`, and `signFreeAgent` (in-season branch).

## Limits
- **Old full saves still in localStorage.** Earlier builds could never write a full save there, so in practice there is nothing to recover. If a smaller older save exists under the v0.5/v0.4 key, it still loads.
- **Older browsers.** Gzip needs `CompressionStream` (Chrome/Edge 80+, Firefox 113+, Safari 16.4+). Without it, saves are stored as plain compact JSON (about 2.5 MB): fine in IndexedDB, and still under the localStorage limit for the fallback.
- **Saves stay in this browser on this computer.** Use Export to move a career. Private-browsing windows may discard storage when closed.
- **In-season signing rules are simple.** The full AAV counts against the cap (no pro-rating). No waivers are needed for unsigned players. AI clubs don't sign free agents in-season. Boston starts the 2026 season at 23/23 contracts, so you have to make room (for example a 2-for-1 trade) before signing anyone.

# Update 3: cap space at the new league year (July 1)

The same changes are in `index.html` (the inline script the page actually runs) and `app.js`. The patch is a new block before `capUsed(g)`, plus small edits to existing functions.

## What was wrong
Going into free agency, every team showed the same payroll and cap space it had at the end of the season. Expiring contracts never came off the books. Six things caused it:
1. **Expired deals still counted.** When a contract ran out, the game set `capHit` to 0 but left `salary` alone. `contractHit(p)` reads `p.capHit || p.salary`, so a 0 cap hit fell back to the old salary. Every UFA and RFA kept counting against his old team's cap all summer, for every team.
2. **Your own payroll was frozen in season 1.** For the user team, season 1 payroll is a fixed reference figure (the real-world payroll plus adjustments for your moves). That figure stayed in use until the next season began, so Boston's number couldn't change in the offseason no matter what expired.
3. **The cap ceiling rose too late.** The cap stayed at $104.0M until season 2 started, even though free-agent asks were already priced off the 2027 cap ($113.5M).
4. **Retained salary rolled over too late.** It only moved to the next year at the start of season 2.
5. **Re-signing an expired player was mishandled.** Re-signing a player whose contract had already run out treated the new deal as an extension. It added a phantom year at his old salary and pushed the new salary back a year.
6. **Unsigned RFAs never left.** RFAs nobody re-signed stayed on rosters with 0 years left. Dozens carried into season 2.

Testing the fix also exposed an older bug from the original build. When an AI club re-signed its own free agent, `completeFreeAgentSigning` pushed the player onto the roster a second time. He then counted twice against the cap (and toward 23 contracts), so a few teams went past the cap on the first day of free agency (for example MIN about $120M against a $113.5M cap). The user team already had a guard against this; AI clubs didn't.

## What changed
- **The new league year opens on July 1** (`ensureLeagueYear`), when the offseason reaches free agency. It runs once per offseason, from the Free Agents market or from any cap calculation, and does the following:
  - Expired contracts (UFAs and unsigned RFAs) stop counting for every team.
  - Your team switches from the season-1 reference payroll to its real contract total.
  - The cap ceiling moves to that year's projected cap ($104.0M → $113.5M for 2027).
  - Retained-salary obligations roll forward one year, once only. The season-2 rollover skips them if July 1 already handled it.
  - A history entry is written, for example: "July 1: the new league year opens. The cap ceiling is $113.5M (up from $104.0M). Boston Bruins payroll moves from $95.1M to $82.7M as expired contracts come off the books."
- **Before July 1** (playoffs, draft, signing window), expiring deals still count at their old cap hit, as in the NHL. Each expired player keeps that figure in `expiringCapHit`. Payroll on every screen stays at last season's number until the league year opens.
- **`contractHit` returns 0** for an expired contract with no years left, instead of falling back to the old salary.
- **Re-signing a player whose deal already expired** now starts the new contract right away at the new salary. There is no phantom year. A player extended earlier still switches to the new salary when his old deal ends.
- **Unsigned RFAs are settled when the market closes on September 1** (`resolveUnsignedRfas`). If the club has room under the cap and fewer than 23 contracts, it tenders a one-year qualifying offer: 105% of the old salary up to $1M, 100% above that, minimum $775K. Otherwise the player becomes an unrestricted free agent.
- **AI re-signings no longer duplicate the player.** Rosters are also de-duplicated when the league year opens and when free agency closes, which repairs saves made mid-free-agency on an older build.
- **The trade desk's cap forecast** uses the same rules. It also no longer double-counts your season-1 payroll adjustment.

**Functions changed:** `contractHit`, `capUsed`, `capUsedClub`, `tradeCapForecast`, `expireSeasonContracts`, `freeAgencyMarket` (offseason path), `advanceSeason` (retained rollover), `completeFreeAgentSigning` (AI duplicate), both free-agency close sites (`advanceFreeAgencyDay` and `finishFreeAgency`), and the re-sign handler (`negotiate-extension`).
**New functions:** `leagueYearPending`, `capReferenceActive`, `pendingExpiringHits`, `rollRetainedObligations`, `ensureLeagueYear`, `resolveUnsignedRfas`, `dedupeClubRosters`.
**New save fields:** `player.expiringCapHit`, `player.expiringLeagueYear`, `offseason.leagueYearOpened`, `offseason.leagueYearOpenedAt`, `offseason.retainedRolled`, `offseason.leagueYearSummary`. Older saves load fine. A save made during an earlier offseason opens its league year the next time free agency is reached or cap is computed.

## Validation (headless, Boston, full season 1 → offseason → free agency → season 2)
- **Cap ceiling:** $104.0M before free agency, $113.5M on July 1.
- **Space freed on July 1, all 32 teams:** average $16.02M, min $0.81M (TOR), max $37.56M (PIT). League average cap space went from $13.02M to $38.54M.
  - For all 31 AI teams, the drop equals the sum of their expiring cap hits exactly.
  - Boston's drop is $6.32M less than its expiring total because of a contract that changes salary at the new league year (Fraser Minten, $0.88M → $7.2M).
- **Boston on July 1:** payroll $95.13M → $82.72M, cap space $8.87M → $30.78M. The 7 expiring deals total $18.74M:
  - DiPietro $0.81M (UFA)
  - Eyssimont $1.45M (UFA)
  - Khusnutdinov $0.93M (RFA)
  - Kuraly $1.85M (UFA)
  - Lohrei $3.20M (RFA)
  - Mittelstadt $5.75M (UFA)
  - Zacha $4.75M (UFA)
- **Screens agree:**
  - On July 1: Free Agents "CAP ROOM $30.8M", Overview "CAP HIT $82.72M / $113.50M", and the trade desk shows matching cap space.
  - After free agency: Free Agents $23.5M, Salary Cap page committed $89.99M / available $23.51M.
- **AI teams spent the room:** 80 free-agent signings. Average payroll went from $74.96M on July 1 to $109.00M at the September 1 close, max $112.98M. No team ended over the cap or over 23 contracts. A per-day check found no team over the cap on any free-agency day.
- **Save/reload** after free agency gives an identical 32-team payroll table.
- **Season 2:** average payroll $111.05M, min $90.92M (BOS), max $113.50M. 0 teams over the cap, 0 players with 0 years left on any roster.
- Smoke test and save tests pass with 0 console errors.

## Limits
- **Contracts that change salary** (extensions, step-ups) switch to their new figure when the season ends, not on July 1. So before free agency these players already count at the new number.
- **Not modeled:** buyouts, LTIR, offer sheets and arbitration. Retained salary is the only dead-cap item.
- **Over the cap at the end of season 1:** COL, VGK and WSH finish season 1 slightly over the $104M cap. This comes from the starting rosters plus deadline moves and isn't affected by this patch. July 1 puts all of them back under.
- **AI free-agent prices can be steep.** They come from the existing ovr-share table (for example an 83-OVR winger at about $11M). Cap limits are enforced, but individual AAVs can look high.

# Update 4: cap schedule lined up with the NHL, and a cap floor

`index.html` (inline script) and `app.js` have the same changes.

## Old vs. real vs. new ceiling
| Season | Old game | Real NHL | New game ceiling | New floor |
|---|---|---|---|---|
| 2025-26 | (not modeled) | $95.5M (floor $70.6M), announced | $95.5M | $75.5M |
| 2026-27 | $104.0M | $104.0M (floor $76.9M), announced; confirmed May 6, 2026 | $104.0M | $84.0M |
| 2027-28 | $113.5M | $113.5M (floor $83.9M), announced ("subject to minor adjustments") | $113.5M | $93.5M |
| 2028-29 | $121.0M (+6.5%) | $127.5M: preliminary NHL projection given to the Board of Governors, Sept 2026 | $127.5M | $107.5M |
| 2029-30 | $128.5M | – | $136.5M (+7%) | $116.5M |
| 2030-31 | $137.0M | – | $144.5M (+6%) | $124.5M |
| 2031-32 | $146.0M | – | $151.5M (+5%) | $131.5M |
| 2035-36 | $188.0M | – | $181.0M (+4.5%/yr) | $161.0M |
| 2040-41 | $257.5M | – | $225.5M | $205.5M |
| 2050-51 | $483.0M | – | $349.5M | $329.5M |

**Sources:**
- NHL.com, Jan 31, 2025: https://www.nhl.com/news/nhl-nhlpa-announce-team-payroll-ranges-for-next-3-seasons-through-2027-28 (NHLPA copy: https://www.nhlpa.com/news/nhlpa-nhl-announce-team-payroll-ranges-for-next-three-seasons/)
- NHL.com, May 6, 2026: https://www.nhl.com/news/nhl-nhlpa-announce-team-payroll-range-for-2026-27-season
- Sportsnet (Friedman), Sept 25, 2026: https://www.sportsnet.ca/nhl/article/salary-cap-expected-to-substantially-increase-for-2028-29/
- Cap history: https://capwages.com/articles/nhl-salary-cap-explained

**What the old game got right and wrong:**
- **Right:** the in-game 2026-27 and 2027-28 ceilings.
- **Wrong:**
  - 2028-29 and later grew a flat 6.5% a year ($483M by 2050-51).
  - The Salary Cap tab, the offseason outlook and the trade desk projected future ceilings at +2.5% a year, or simply re-used this year's cap.
  - `advanceSeason` also applied a +2.5% step that was immediately overwritten.
  - Free-agent asks with no explicit cap always used the 2027-28 cap, even in season 1 or season 5.
  - There was no cap floor anywhere in the game.

## Growth rule for years without an announcement
- **2028-29:** the league's own $127.5M projection.
- **After that, the growth tapers:** +7% (2029-30), +6% (2030-31), +5% (2031-32), then +4.5% a year through 2050-51, rounded to $0.5M each year.
- **Why 4.5%:** that's the long-run average for the cap era ($39.0M in 2005-06 to $95.5M in 2025-26 is about 4.6% a year). The 2025-29 jumps (9-12%) come from a revenue surge the league says is temporary.

## One source of truth
- **The schedule:** `leagueCapCeiling(year)`, `leagueCapGrowthRate(year)`, `leagueCapFloorGap()` ($20M) and `leagueCapFloor(year)`. `projectedNhlCap` now just calls `leagueCapCeiling`. "year" is the season's starting year (2026 = 2026-27).
- **Helpers:**
  - `capSeasonYear(g)`: the league year in force; it moves to the next season on July 1.
  - `syncLeagueCap(g)`: sets `g.cap` from the schedule on load and at each new season.
  - `capCeilingAtIndex` / `capFloorAtIndex`: future columns.
  - `marketCapFor(g)`: the cap free-agent prices use.
  - `capFloorFor(g)`: always exactly `g.cap − $20M`.
- **Where it's used:**
  - New-game cap; `upgradeGame` (older saves get re-aligned); `advanceSeason` (the stray +2.5% step is removed); and the July 1 rollover from Update 3.
  - **Free-agent asks:** every call that has a game is priced off `marketCapFor(g)`. That is the current cap during the season and the coming season's cap in the offseason.
  - **Trade desk forecasts:** each future year carries its own ceiling. Cap checks compare each year against that year's ceiling, and the Cap impact table gets a CEILING row.
  - **Contract projections:** the Organization → Cap tab (new Cap floor row) and the offseason five-year outlook.
- **Fixed along the way (from Update 3):**
  - Before July 1, the trade desk counted the user's expiring contracts twice. The forecast's first year now matches the payroll shown everywhere else, for every team.
  - AI clubs re-signing their own free agents could go past 23 contracts. They now respect the limit.

## The cap floor ($20M below the ceiling, every season)
The game had no floor before. Now:
- **Displays:**
  - Salary Cap page: a CAP FLOOR card ("FLOOR MET" or "$X BELOW FLOOR"), a red warning when your payroll is under the floor, and a new "League cap schedule" table with the next 5 seasons' ceiling, floor and source.
  - Free Agents headers (offseason and in-season): the same card and warning.
  - Overview cap bar: "% COMMITTED · FLOOR $X", plus "$Y BELOW FLOOR" when short.
  - Organization → Cap tab: a floor row.
- **History warnings:** if your team is under the floor when free agency closes on Sept 1, or when the new season opens, a CAP FLOOR history entry is written once per checkpoint. There is no penalty.
- **AI free agency aims for the floor:**
  - While a club is under the floor, it bids more often: +8 to +30 points of bid chance, capped at 88%.
  - It also skips the "full roster / low need" and "rebuilders avoid veterans" filters.
  - When the market closes, `aiFloorTopUp` signs remaining free agents for any AI club still short:
    - It takes the best available player first and fills missing positions first.
    - Salary is the larger of his ask and the gap divided by open slots, kept under the cap and the 23-contract limit.
    - Overpays get a 1-year deal.
    - A history line is logged.
- **Season 1 isn't forced to the floor.** It starts from the real imported rosters. Under this rule 10 AI clubs start 2026-27 below $84M (the real CBA floor is $76.9M). Clubs reach the floor from the first free agency on.

**New save fields:** `g.capFloorNotes` (records which warnings have already been shown). Older saves load and have `g.cap` re-aligned to the schedule.

## Validation (headless, Boston, 3 seasons: 2026-27 → 2028-29)
- **Schedule:** printed for all 25 career seasons (2026-27 … 2050-51). The floor is exactly ceiling − $20M in every season.
- **Rollover:**
  - Season 1: cap $104.0M / floor $84.0M.
  - July 1, 2027: cap $113.5M / floor $93.5M.
  - Season 2 start: $113.5M.
  - July 1, 2028: $127.5M / floor $107.5M.
  - Season 3 start: $127.5M.
  - The cap matched `leagueCapCeiling(capSeasonYear)` at every checkpoint.
- **AI teams vs. floor and cap:**
  - Sept 1, 2027: AI payroll min $97.5M, avg $110.4M, max $113.5M. 0 below the floor, 0 over the cap, 0 over 23 contracts.
  - Season 2 start and end: 0 below the floor, 0 over the cap.
  - Sept 1, 2028: min $118.0M, avg $123.4M, max $127.2M. 0 below the floor, 0 over the cap.
  - Season 3 start and end: min $119.1M / $118.9M, avg $126.4M. 0 below the floor, 0 over the cap.
  - Regular FA bidding got every AI club over the floor. A separate test of `aiFloorTopUp` on July 1 signed 34 players for 11 short clubs, with no club pushed over the cap or past 23 contracts.
- **User team (the test never signs anyone for Boston):** it stayed under the floor and the warnings appeared:
  - Salary Cap page: "$20.9M below the $107.5M cap floor".
  - Overview cap bar: "FLOOR $107.50M · $20.95M BELOW FLOOR".
  - History entries at both checkpoints.
- **Trade desk:** the forecast's first year matches each team's payroll at every checkpoint (0 difference, all 32 teams). The CEILING row reads $104.0M / $113.5M / $127.5M / $136.5M in season 1.
- **FA asks** (Pastrnak, 95 OVR): $18.7M in season 1 (104M cap), $21.35M on July 1, 2027 (113.5M), $23.0M on July 1, 2028 (127.5M).
- **Save/reload** after free agency: identical cap and payroll table.
- **Smoke test and save tests** (IndexedDB, localStorage fallback, no-storage failure, old-export import): pass with 0 console errors.

## Limits
- The real CBA floor is about 26% below the ceiling ($27M+ in 2027-28). The game uses a flat $20M gap as requested, so the game's floor is stricter than the NHL's.
- Re-signing asks (`extensionAsk`) are still based on the player's current salary, not the cap. AI deadline trades can still briefly leave a club at 24 contracts during the season; this was already the case and is cleared by season end.
- Before July 1 in the offseason, the trade desk's first column is the league year still in force. The next column jumps one year ahead, because contracts have already been rolled forward at that point.

---

# Update 5 (v3.1): realistic free-agent contracts, a 20% max contract, RFAs and stars no longer left unsigned

Applied to `index.html` (inline script) and `app.js` identically. The pre-change v3 is kept at `/workspace/sim-v3-backup`. Patch sources: `codereview/patch6/fa_block.js` (new functions, inserted before `freeAgencyMarket`) and `codereview/patch6/apply6.py` (asserted string replacements).

## What was wrong (v3.0, 3-season run)
- **Asks were far above value.** The median UFA got 3.6–3.8x his old AAV (2.8–3.1x for players already above $1M). Hughes signed for $25.3M (22% of the cap), McDavid for $29.65M and Werenski for $26.65M. 35+ veterans got 3–4 year deals at $15M+.
- **No max or minimum contract.** Nothing capped AAV anywhere.
- **AI clubs never re-signed their own players before July 1.** Almost every expiring player hit the market. At FA close, clubs with full rosters left RFAs untendered (48 and 87 per summer), including Matthew Schaefer.
- **Stars sat unsigned all season.** 41 and 47 players rated 80+ were unsigned at Sept 1, including Kucherov, Karlsson, Malkin, Matthews, Josi, Vasilevskiy and Schaefer.
- **Filler instead of real players.** The game generated 55 and 87 "Depth" players, and they dressed in thousands of games.

## What changed
- **Value model.**
  - A player's ask comes from his league rank (OVR, with production/save-% and youth adjustments), mapped to a share of the cap.
  - Skaters: about 1.3% of the cap at the 30th percentile, 5.5% at the 70th, 8.8% at the 90th and 14.5–16% for the very top. Goalies follow their own curve, topping out at 11%.
  - An age multiplier applies: 1.0 through age 31, then 0.95 / 0.90 / 0.82 / 0.72 / 0.62 / 0.55 / 0.48 from age 32 to 38+.
  - A league market scale (0.95–1.3, computed each July 1 from committed money vs. cap) lifts prices modestly when the cap jumps. It is tapered so stars get little of it.
- **Contract limits everywhere.**
  - Max AAV is 20% of the current cap. The league minimum scales with the cap: $775K at $95.5M, $850K at $104M, $925K at $113.5M, $1.025M at $127.5M.
  - Limits apply to AI and user FA offers, AI re-signs, RFA qualifying offers, user re-sign/extension offers, `aiFloorTopUp`, and emergency depth.
  - On July 1, any existing contract above the max is cut to the max (logged as CAP RULES).
- **Term rules.** At most 7 years with a new club and 8 for a re-sign. Age 35 gets 1 year (occasionally 2). Age 36+ gets 1 year only.
- **AI teams handle their own players before the market (June 30).**
  - Valuable RFAs (OVR ≥ 80 or top-70% value, or young with upside) are qualified at 100–105% of prior salary, or re-signed. Elite RFAs aged 25 or under get 5–8 year deals near value; others get 2–3 year bridge deals.
  - Only marginal or overpaid RFAs are not qualified, and they become UFAs.
  - Good AI UFAs under 35 re-sign with their club with a probability that rises with value.
- **The market clears.**
  - Asks hold for 3 days, then fall about 1.15% a day, to a floor of 55% of the opening ask.
  - AI bids sit near the ask: 0.90–1.10x, depending on team plan.
  - AI clubs with full rosters can still bid; when they sign, they send a cheaper, lower-rated player at the same position to the reserve.
  - AI offers expire after 7 days. Only offers a club can still afford are considered.
- **No more goalie-less clubs.** From day 3, an AI club with fewer than two NHL goalies signs the best goalie it can afford.
- **Closing the market (Aug 31), in this order:**
  1. A late sweep signs every remaining decent UFA (78+ or top-65% value) to the best-fit club, at 55% of the opening ask.
  2. RFAs are resolved.
  3. A second sweep runs.
  4. The floor top-up runs.
- **Positional holes are filled in this order:**
  1. The club's own reserve or prospect is called up.
  2. The best real unsigned FA at the position is signed.
  3. A surplus reserve player is claimed from another club (logged as WAIVER CLAIM).
  4. Only then does the game generate a "Depth" player.
- **Cap floor (AI clubs).**
  - Clubs under the floor bid up to 35% over ask (capped at +$4M; not on top-5% players), and pay more in the late sweep.
  - Cap-floor trades: a club still under the floor takes a veteran contract (age 26+, at or above market value, $1.5M–$12M) from a club near the cap, which adds a 3rd-round pick. Logged as CAP FLOOR TRADE.
  - Last resort: one-year performance bonuses spread across the club's veterans (logged as CAP FLOOR). The bonus applies only to the current season's cap hit. It does not carry into the next year's salary or into the player's salary history (`floorBonusCurrent` is removed at rollover).
- **User side.**
  - `extensionAsk` is now market-based (RFAs at 88% of value, never below the QO).
  - The user's re-sign and FA offer amounts are clamped to the min/max.

**New save fields** (all optional, so older saves load):
- `slot.baseAsk`, `slot.notQualified`
- `offseason.faScale`, `offseason.faScaleInputs`, `offseason.faPreMarketDone`
- `player.floorBonus`, `player.floorBonusCurrent`, `player.floorBonusYear`

## Validation (headless, Boston auto-managed, 3 seasons 2026-27 → 2028-29, two independent runs)
| | Summer 2027 before | Summer 2027 after | Summer 2028 before | Summer 2028 after |
|---|---|---|---|---|
| Median UFA raise (all / prev AAV > $1M) | 3.64 / 3.11 | 1.41 / 1.38 | 3.79 / 2.84 | 1.32 / 1.15 |
| Average UFA AAV | $9.60M | $3.26M | $10.57M | $4.19M |
| Contracts > 20% of cap | 1 (Hughes 22.3%) | 0 | 2 (McDavid 23.3%, Werenski 20.9%) | 0 |
| RFAs qualified/re-signed vs. not qualified | 27 / 48 | 42 / 33 | 40 / 87 | 35 / 27 |
| AI UFAs re-signed with own club | 4 | 22 | 0 | 19 |
| OVR ≥ 80 unsigned at Sept 1 | 41 | 0 | 47 | 0 |
| Generated filler players | 55 | 1 | 87 | 0 |

- **Second run:** median raise 1.41/1.37 and 1.36/1.16. It also had 0 contracts over 20%, 0 players rated 80+ unsigned, and 1 and 0 fillers created.
- **Unsigned at FA close:** 1 player in 2027 (a 70 OVR) and none in 2028.
- **Filler dressing:** before, 40 and 66 fillers played in seasons 2 and 3 (some for all 82 games). After, 1 player (Boston's own generated goalie) in 19 games.
- **Top contracts:**
  - 2027: Hughes 7y $19.6M (17.3%), Kucherov 1y $16.7M (14.7%), Robertson 6y $12.9M, Dunn 7y $12.6M, DeBrincat 7y $12.0M.
  - 2028: McDavid 5y $23.4M (18.4%), Werenski 5y $22.3M (17.5%), Kucherov 1y $19.0M, Matthews (re-signed) 4y $18.6M, Keller (re-signed) 4y $16.6M, Morrissey (re-signed) 1y $16.3M.
  - Schaefer (RFA): 5y $14.6M with NYI.
  - Ovechkin and Crosby: 1-year deals of $7.6M–9.8M.
  - Kucherov, Josi, Panarin and Karlsson, all 33+: 1-year deals.
- **AI payroll at season start:**
  - 2027-28: avg $101.4M, min $93.7M, against a $93.5M floor and $113.5M cap.
  - 2028-29: avg $111.2M, min $107.6M, against a $107.5M floor and $127.5M cap.
  - No AI club was under the floor or over the cap.
- **Floor help in summer 2028** (the cap jumps $14M while existing contracts don't): 15 cap-floor trades, 2–3 waiver claims, then $21.9M–24.9M of one-year bonuses at 4–5 clubs. No bonuses were needed in 2027.
- **Console errors:** 0 in both career runs and in the smoke test.
- **Save tests pass:** IndexedDB, localStorage fallback, no-storage failure, and old-export import.
- **New mid-free-agency test:** save on FA day 6, reload, and the market state (asks, decayed asks, offers, scale) is identical. The market then runs to Sept 1 with no contract above the max.

## Limits / not changed
- **Duplicate players are a data issue, not contract logic, so they are not fixed here.** 18 names are duplicated at game start: the roster import creates both a `local-*` contract-data entry (often on the wrong club, default OVR 70) and a `nhlratings-*` reserve copy (default age 24). Example: a 92-OVR, age-25 "Connor Hellebuyck" stashed on WPG's reserve at $925K, which another club claims in the waiver step. The rest come from the prospect name generator's small name pool (e.g. "Luke Keller" ×11); 87 duplicate names by the end of season 3.
- **Contracts signed before the patch are not raised to the new minimum.** Every contract created by the patched code is within the min/max.
- **Boston is never managed by the harness,** so it stays under the floor and gets the usual floor warnings.
- **Floor bonuses are an abstraction.** They stand in for the one-year overpays real floor teams make.

---

# Update 6 (v3.2): duplicate players and repeated prospect names

Applied to `index.html` (inline script) and `app.js` identically. The v3.1 build is kept at `/workspace/sim-v3.1-backup`. Patch sources: `codereview/patch7/dedupe_block.js` (new functions) and `codereview/patch7/apply7.py` (asserted replacements).

## Root causes
- **The ratings file and the opening roster don't agree on teams or names.** The game builds rosters from the 2026-27 opening roster, then looks up each player's rating in `nhlratings-data.js` under his own club only. If the club couldn't find a row for a rated player, the game created a second "Rated roster pool" reserve copy with the real rating, a placeholder age of 24 and a placeholder $925K contract. Three kinds of mismatch triggered this:
  - **17 players changed clubs since the ratings were made.** Example: Kirill Marchenko is on TOR in the roster and contract files but rated under CBJ. TOR's Marchenko got a default 70 OVR; CBJ got an 89-OVR, age-24, $925K copy.
  - **10 players are spelled differently in the two files**, e.g. Michael/Mike Matheson, Samuel/Sam Montembeault, Nick/Nicholas Paul, Alexander/Alex Wennberg, Josh/Joshua Mahura. The contract lookup already knew most of these aliases; the rating lookup didn't. Some copies even got the real contract twice, e.g. Matheson at $6M on both the roster and the reserve.
  - **29 players in the opening free-agent list** (Laine, Tarasenko, Mrazek, Pearson, …) also got a reserve copy at their old club. Each existed twice: in the FA pool and on a reserve.
- **This repeated on every load.** The reserve-copy step re-ran every time a save loaded. A player who later moved away from his rated club could get a fresh copy on the next load.
- **Elias Pettersson (genuine same-name pair).** The contract file keys contracts by name only, so both Elias Petterssons on VAN (C, born 1998; D, born 2004) got the defenceman's $913K ELC.
- **The prospect name generator.** It had 20 first names × 20 last names, indexed so each 224-player draft class used only 20 distinct names. That's why "Luke Keller" appeared 11–12 times. It also produced real NHL names (e.g. Tyler Johnson, Jack Thompson); generated players with those names picked up the real player's stats lookup by name.

## Fixes
- **Identity matching.**
  - One canonical identity: normalized name plus the alias table, now extended with Wennberg and Mahura.
  - The rating lookup now uses canonical names. When the row sits under another club, it falls back to a league-wide row, using position for same-name players.
  - A rating-file reserve is created only if the player exists nowhere else: not on any club, not in the opening FA list, not retired. Kopitar is marked retired.
  - The reserve seeding no longer re-runs on load.
- **Contract lookup.** An ELC record is not applied to a player over 25 when two players on that club share the name. That stops C Pettersson from getting the ELC.
- **Data corrections** (new careers only, labelled in `contractSource`):
  - **Elias Pettersson (C):** 6 years × $11.6M remaining.
  - **Connor Hellebuyck:** he isn't in the bundled 2026-27 opening-roster or contract files at all; he existed only as the ratings-file reserve (age 24, $925K). He's restored to WPG's NHL roster: born 1993-05-19 (age 33), 5 years × $8.5M remaining, using his public 7 × $8.5M contract. Clay Stevenson moves to WPG's reserve as the third goalie.
  - This is an assumption about the 2026-27 data. It's one function to revert: `applyStartingDataCorrections`.
- **`repairDuplicatePlayers(g)`.** It runs at new-game creation, on every load (`upgradeGame`), and at each July 1 league-year rollover.
  - It merges records that share an id, and records of the same real person under different ids, across rosters, reserves, prospects, the FA pool and the draft class.
  - **Which copy it keeps:** real roster/contract record, then FA-file record, then rating-file copy. The kept record takes the rating or birth date from the dropped copy if it had none.
  - **Clean-up:** it removes the dropped copy's FA slots, trade-block entries and offers, and repairs the user's lines. History text is left unchanged.
  - **Generated players:** any generated player whose name is used twice, or matches a real player, is renamed (`renamedFrom` keeps the old name).
  - **Old saves:** the placeholder Hellebuyck gets his real birth date.
  - **Visibility:** a single DATA REPAIR history entry is added when anything changed.
- **Name generator.**
  - 138 first × 310 last names, about 42,800 combinations, plus middle-initial variants if ever needed.
  - Every name is checked against a registry: every real name in the bundled data (opening roster, ratings, contracts, FA list, the 1,481 players in the NHL stats history), every player in the save, and `g.generatedNames`, a log of every generated name in the career (persisted).
  - AI clubs no longer build an unused 224-player prospect list. The game deleted it at save anyway.

**New save fields:** `g.generatedNames`, `g.duplicateRepair`, `g.lastDuplicateRepair`, `g.ratingReservesSeeded`; `player.renamedFrom`, `player.bioCorrected`.

## Validation (headless)
| | v3.1 | v3.2 |
|---|---|---|
| Duplicate real-player identities at game start (incl. FA pool) | 56 (17 cross-team, 10 alias, 29 FA pool) | 0 |
| Draft class at start: distinct names | 20 for 224 players (max 12 copies) | 224 unique |
| After 3 seasons: duplicate identities / duplicate generated names / generated players with real names | 56 / 60 / 22 | 0 / 0 / 0 (two runs; checked at start, each FA close, each season start, end) |
| Elias Pettersson (C) contract | $913K ELC (wrong) | $11.6M × 6 |
| Kirill Marchenko | TOR 70 OVR + CBJ 89-OVR age-24 copy | one record: TOR, age 26, 89 OVR, $3.85M × 7 |

- **The only same-name pair left is genuine:** the two Elias Petterssons on VAN, kept separate by position and birth date. The harness reports it separately.
- **Cap/FA in line with v3.1** (two runs):
  - Median UFA raise 1.38 / 1.33 (2027) and 1.36–1.38 / 1.15–1.17 (2028).
  - 0 contracts over 20%; 0 players rated 80+ unsigned; 0–1 filler players a year.
  - AI payroll minimum at or above the floor, none over the cap.
- **Old-save repair test** (season-2 save made with v3.1, loaded with v3.2):
  - 56 duplicate copies merged and 402 generated prospects renamed. Afterwards: 0 duplicates, 0 broken line ids, transaction log unchanged.
  - Six clubs' payrolls dropped by about $1–4M, because rating-file copies that had been promoted to NHL rosters were removed.
  - The season then simulates to the deadline. Save and reload is idempotent: no second repair, record identical.
- **Other tests:** smoke test, save tests (IndexedDB, localStorage fallback, no storage, old-export import, which is also repaired) and the mid-free-agency save/reload pass. 0 console errors.

## Limits
- **About 230 players exist only in the ratings file.** They aren't in the 2026-27 opening roster, contract or FA files. They stay as "Rated roster pool" reserves with placeholder age 24 and $925K, as before; they aren't duplicates. Hellebuyck is corrected; Kopitar is excluded as retired.
- **In old saves, Hellebuyck keeps his placeholder contract and reserve spot** (only his birth date is fixed). Changing an old career's WPG cap mid-save wasn't done automatically.
- **Removed copies' stats are only carried over if the kept record had none.** History and transaction text still show the old prospect names.

---

# v4: merged into the user's build 77 (3D live rink)

Base: `Couch-To-Front-Office (77).zip`. Build 77 is upload3 plus a Three.js 3D live rink and its model files. None of Updates 1–6 above were in it. All six were re-applied unchanged, and every patch matched exactly. A 3-way merge produced the identical `index.html`. See `MERGE-NOTES.md` for the full diff, flags and test numbers.

## Files touched
| File | What changed |
|---|---|
| `index.html` | Updates 1–6 (same edits as v3.2) plus the two v4 adapters below. **This is the file the game runs.** |
| `app.js` | Now an exact copy of the main inline script in `index.html`. Build 77's `app.js` was still the upload3 version without the 3D rink, so it was out of date. It is still **not loaded** by the game. |

Everything else is byte-identical to build 77, including `vendor/`, `*-glb.js`, `skater-models.js`, `models/`, `models.html`, CSS, data and assets.

## v4 adapters (inside the user's `watchNextGameNow`)
1. **The live rink shows the goalie who actually started** (`iceUnit`). Build 77 always drew `lines.goalies[0]`. With the Update 1 goalie rotation, the backup starts about 24 games a season. The starter is now read from the game's box score (`g.latestBoxScore`, the goalie row with the most TOI), with the depth chart as fallback.
2. **2D fallback when WebGL can't start** (`boot3d`). `buildWorld()` is wrapped in `try/catch`, and on failure the rink uses the existing 2D canvas renderer. Before, it froze on "Opening faceoff". This matches the user's existing fallback for when `three.min.js` or `GLTFLoader.js` fails to load.

## Checked, no change needed
- The live rink replays the new engine's box score (score, OT/SO, players' G/shots/hits/blocks) correctly. At normal speed the scoreboard matched the final box score.
- **3D model data never goes into saves or exports.** It lives only in `window.GOALIE_GLB`, `window.SKATER_GLB` and a local Three.js scene. The save is still about 190–230 KB gzipped in IndexedDB.
- A full export from the unmodified build 77 (17.1 MB) imports into v4. v3.1 and v3.2 saves load and get repaired as before.

## Validation summary (headless Chrome)
- **Engine, 3 seasons:**
  - 3.02 / 3.07 / 3.05 goals per team-game, 29.5–29.6 shots, .900–.901 SV%.
  - TOI F 19.0 / 17.2 / 14.0 / 9.3 and D 24.3 / 19.6 / 15.3.
  - Starter averages 58 GP, backup 24.
- **3-season career:**
  - Cap $104.0M → $113.5M → $127.5M, floor = cap − $20M, no AI club below the floor or over the cap after FA.
  - 0 contracts over 20% of the cap, 0 players rated 80+ unsigned, 0 duplicates.
- **Smoke test with WebGL:** the 3D rink rendered, "Skip to box score" worked, and the full season flow had 0 console errors.
- **Smoke test without WebGL:** the 2D fallback played the game to the end.

## Rebuild
`/workspace/codereview/patch8/build_v4.sh`
