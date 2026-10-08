# AI handoff: Couch To Front Office (v9.1)

This note is for an AI assistant picking up this build. Everything you need is in this folder.

## 1. What it is
"Couch To Front Office" (header: "NHL 26 Coach to GM") is a browser NHL franchise simulator. You run a club's front office (default: **Boston Bruins**, 2026-27): lines and strategy, trades, the cap, free agency, the draft, and a season sim. Games can be watched as a live 3D broadcast.

**Run it:** open `index.html` in Chrome, Edge or Firefox. It's built to work from `file://`, because models and arenas are wrapped as base64 `.js` files. If the browser blocks local file loads, serve the folder instead: `python -m http.server 8000` in this folder, then open `http://localhost:8000/index.html`.

**File map**
| File | What it is |
|---|---|
| `index.html` | **The game.** All game code is inlined in one big `<script>`, starting `/* NHL Franchise Simulator v0.8`. |
| `app.js` | An exact mirror of that inline script. **It is not loaded by the game.** |
| `starting-roster.js` (`window.NHL_STARTER`) | 2026-27 opening rosters. A copy is also inlined in `index.html`. |
| `nhlratings-data.js` | Player ratings |
| `nhl-contracts-data.js` | Contracts |
| `nhl-stats-history.js` | Real stats history |
| `current-free-agents.js` | The opening FA list |
| `live-game.js` | The live game: schedule builder, fixed-step hockey sim, systems, 3D and 2D views, controls. Loaded only when a game is watched. |
| `live-assets/arena-home-glb.js`, `arena-neutral-glb.js` | The TD Garden arena: Bruins dressing when Boston is home, neutral otherwise. `glb2js.py` wraps a `.glb` file as a `.js` file. |
| `skater-glb.js`, `goalie-glb.js`, `skater-models.js` | Rigged, animated player models, and `buildHockeyPlayer(THREE,color,num,isGoalie,opts)` |
| `vendor/three.min.js`, `vendor/GLTFLoader.js` | Three.js (r128-era) |
| `models/`, `models.html`, `player-sprites.js`, `player-glb-data.js`, `skaters/` | Older model and sprite assets plus a model viewer |
| `styles.css`, `front-office.css`, `office-redesign.css`, `visual-polish.css`, `game-feel.css`, `live-rink.css` | Legacy UI styles: layout and structure. Their colours are overridden by `theme-core.css` (see rule 5). `bruins-theme.css` was removed in v9. |
| `theme-core.css` | **Generated** (v9). The shared theme layer for every office page, modal and the live-game chrome. Source: `theme-src/theme-core.src.css`; generator: `theme-src/build_theme.py`. Loaded last. |
| `home-redesign.css`, `setup-redesign.css` | **Generated** CSS for the home screen (v7) and the GM style screen (v8) |
| `draft.js`, `draft-data.js`, `data/draft-classes.js` | The draft module (v9, Build Bot's draft overhaul plus fixes): order and lottery, live draft room, CPU picks, draft rights, ELCs. `data/draft-classes.js` is an empty bundle for real classes; fictional classes are generated. |
| `draft-show.js`, `draft-questions.js`, `draft-show.css` | Draft-night broadcast and the on-stage conversation (v9). `draft-questions.js` (150 questions) is **generated** from `theme-src/draft-show/questions.dsl` by `theme-src/draft-show/build_questions.py`; `draft-show.js` is the concatenation of `theme-src/draft-show/src/*.js` (edit the parts, then rebuild with patch13's `show/apply_show.py`). |
| `free-agency.css` | **Generated** CSS for the FA screen (see rule 3) |
| `CHANGES.md` | Full change log |
| `MERGE-NOTES.md` | How v6 was assembled |
| `LIVE-GAME-NOTES.md` | Live game internals |

## 2. Critical rules
1. **`index.html` inlines all code and does NOT load `app.js`.** Every code change must be made **identically** in the inline script in `index.html` *and* in `app.js`. Afterwards, check that `app.js` equals the inline script byte for byte: take the text from just after `<script>` before `/* NHL Franchise Simulator v0.8` up to the next `</script>`.
2. Roster data changes go in both `starting-roster.js` and the inline `window.NHL_STARTER` copy in `index.html`.
3. **Free-agency CSS:** edit `free-agency.src.css` (from the FA patch source) and regenerate `free-agency.css`. Never hand-edit the generated file. The generator raises selectors to `body[data-view] .fa2 …` and adds `!important` to beat `bruins-theme.css`. If you only have this folder and no source CSS, add overrides in a new small CSS file instead.
4. Keep the user's own changes when merging. Theirs win unless they bring back a fixed bug.
5. **Theme (v9):** never hand-edit `theme-core.css`. Edit `theme-src/theme-core.src.css`, then run `python3 theme-src/build_theme.py theme-core.css` in this folder. The generator does two things:
   - **Recolor layer (automatic):** it reads the legacy CSS files and re-emits every rule that paints a blue/slate colour or an arena photo, with the colour shifted to the neutral hub greys (same brightness) and photos removed. Gold, red, green and team colours are kept. It re-runs from the current legacy files, so after editing a legacy CSS file, regenerate.
   - **Core layer:** the src rules. Selectors without a leading `html`/`body`/`:root`/`:where` are prefixed with `html body[data-view="office"]`, and every declaration gets `!important`. Generic element rules exclude the FA screen (`:not(:where(.fa2 *))`), so `free-agency.css` keeps winning there.
   - Tokens are CSS variables on `:root` (`--t-bg`, `--t-panel`, `--t-line`, `--t-text`, `--t-muted`, `--t-gold` #FFB81C, `--t-green`, `--t-red` #ff6b68, `--t-amber`, fonts `--t-display`/`--t-sans`). Warnings (`.negative`, `.cap-floor-warning`, `*warning*`, `*danger*`) are red; `.positive` is green.

## 3. Architecture (search the inline script for these names)
- **The stats engine decides everything.**
  - `simulateMatchup(g,a,b,home,wantLog)` produces the score, scorers, shots, hits, blocks, penalties, faceoffs and TOI. It gives ice time by line, pair and PP/PK unit, and rotates goalies (Balanced / Ride the starter / Split starts).
  - `simulateGame` plays the user's next game and sims the rest of the league for that day (`simAI`).
  - The **live 3D game** (`watchNextGameNow` → `liveGameSpec` → `window.CTFOLive.open`) is a *director*. It choreographs real hockey so that every engine event happens on the ice at its exact time, and the scoreboard always equals the box score.
  - Systems in the live game: F1/F2/F3 forecheck (1-2-2, 2-1-2, 1-1-3), NZ trap, D-zone coverage, umbrella PP, box or diamond PK. Positional roles and tendencies: sniper, playmaker, grinder, offensive and defensive D.
  - Controls: 2x speed, Sim to end of period, Show systems, High camera. If WebGL fails, it falls back to 2D (`watchNextGameLegacy`).
- **Saving:** `compactGameForSave` and `rehydrateSavedGame` (bundled data isn't stored), IndexedDB with a localStorage fallback (`flushSave`, `persist` with a 700 ms debounce, `persistOnLeave`). The save messages are honest. **Continue career** loads it.
- **Cap:**
  - The real schedule (`leagueCapCeiling`): $104.0M in 2026-27, $113.5M in 2027-28, $127.5M in 2028-29. Then +7%, +6%, +5%, then +4.5% a year.
  - The floor is **exactly cap − $20M** (`capFloorFor`).
  - The league year rolls over on **July 1** (`capSeasonYear`, `syncLeagueCap`), and that frees expiring money.
- **Free agency (FA v2, `FA MARKET V2` block, `fa2*` functions):**
  - A **5-day market.** Players decide on Day 1, 2 or 3 depending on OVR. Loyal players decide a day earlier. Days 4–5 are buffer days, used for final chances, late twists and last call.
  - Agent calls let a player offer Boston a sign-today counter.
  - **Boston final-chance rebid:** one per player. Each rebid adds a penalty to all other FA talks: +8 interest points and +4% asks, stored in `g.fa2BostonPenalty` and reset each offseason.
  - The 50-contract limit is enforced. G, D and F minimums are filled at close.
  - Older contract rules still apply: the max contract is **20% of the cap**, there's a cap-scaled league minimum, term limits, and V4FIX vet and RFA sanity caps (`v4fixContractSanity`).
- **Trades (`AI TRADE MARKET v5`):**
  - Each AI GM evaluates its club every 7 calendar days (`aiWeeklyGmTick` → `runAIGMs` → `aiRunGmEvaluation`), plus at the deadline, the draft and July 1.
  - Org roles: WIN_NOW, CONTENDER, BUBBLE, RETOOL, REBUILD, YOUTH_MOVEMENT, plus a CAP_TROUBLE overlay. A role change needs **3** straight evaluations (`AI_ORG.CONFIRM`). Tuning constants are in `AI_ORG` / `AI_TRADE`.
  - Old V4FIX trade windows are stubbed. V4FIX cap-floor dumps (`faFloorCapDumps`) remain.
- **AHL (`AHL AFFILIATES` block, `ahl*`):**
  - `reserveRoster` is the AHL club, and `orgProspects` holds junior and college rights.
  - Weekly call-ups and send-downs, driven by role, injuries and merit.
  - Waivers with reverse-standings claims, the **50-contract limit**, and development scaled by playing time.
  - The user's club is never AI-managed.
- **Loyalty (`V4LOYAL`):** `p.orgTeam` and `p.yearsWithOrg`. Players with 8+ seasons are "loyal": they give a hometown discount, are more likely to re-sign, and carry a soft no-trade in the AI market. Any move between clubs resets tenure (`v4loyalEnsure`).
- **Ages and data:** V4FIX fills real birth dates, and `fallbackPlayerAge` replaces the old flat age of 24.
- **Prospect names and duplicates:**
  - The name generator draws from 138 × 310 names and is checked against a registry of real names and every name already used (`g.generatedNames`).
  - `repairDuplicatePlayers` runs on new game, every load and July 1, and merges duplicate records.
- **Quick sim (v6, `V6 QUICK SIM`):**
  - Next Game card buttons: **Sim to end of week** (through the coming Sunday, or the next 7 days) and **Sim to end of season** (asks to confirm, stops before the playoffs).
  - They use the same stats-engine path, chunked with `setTimeout` behind a progress overlay with a Stop button.
  - They stop early at the trade deadline (week mode) or when a club phones about a trade, then show a summary.
- **Home screen (v7, `#team-screen.home7`):** the front-office hub start screen. Markup lives in `index.html`; styles in `home-redesign.css`, which is generated from `home-redesign.src.css` (kept in the patch folder) so every rule is scoped and `!important` to beat `bruins-theme.css`. Script: `renderTeams` (division columns, keeps keyboard focus), `home7ClubSummary` (cap space, average age, cap meter, top players), `refreshContinueCareer` (sets `body.h7-has-save`, which makes Continue the only gold button). Clubs without contracts in the starting snapshot show TBD payroll/cap and a roster preview instead of OVRs.
- **Draft (v9, `draft.js`, `window.CTFODraft`):** installed from a hook before `try{init();}` (`CTFODraft.install(deps)`), it rebinds the game's draft functions and handles its own buttons (`ctfo-sim-to-mine`, `ctfo-round`, `ctfo-open-rights`, `ctfo-elc`, `finish-draft` = auto-draft the rest).
  - **Order:** picks 1–16 are non-playoff clubs with a 2-draw lottery (odds 18.5% … 0.5%, max jump 10 spots, a club can win at most twice in 5 years). Picks 17–28: clubs that lost in rounds 1–2, by points, non-division-winners first and division winners last. 29–30 conference-final losers, 31 runner-up, 32 champion. 7 rounds, 224 picks.
  - **Draft room:** sim to my pick, sim a round, manual pick from the scouting board, auto-draft (scouting reports, team need, watchlist). CPU clubs pick by board rank with team need and noise.
  - **Rights and ELCs:** draftees are unsigned rights on the reserve list (not counted in the 50). CHL rights last 2 years, NCAA/Europe 4. An ELC (length by age; salary capped at the league minimum + $175K) can be offered from Draft Rights. **Slide:** an 18/19-year-old on an ELC who plays under 10 NHL games slides a year (18: up to 2 slides, 19: 1). **Expiry:** unsigned rights lapse on June 1 of the expiry year; a player still 20 or younger on Sept 15 re-enters the draft once, older players become free agents.
  - **Classes:** fictional 280-player classes (ages 17–20, mostly 18; ~35% D, ~10% G with no goalie in the top 15 most years; CAN/USA/SWE/FIN/RUS/CZE …; CHL/USHL/NCAA/European leagues).
- **Draft broadcast + conversation (v9, `draft-show.js`, `window.CTFODraftShow`):** a presentation layer only; it never picks players. `draft.js` calls `CTFODraftShow.picked(g,row,p,how)` at the end of every selection, `CTFODraftShow.cpuDecide()` instead of the old CPU ELC roll, wraps `acceptChance` with `adjustAccept()` and calls `summerTick()` when a new season starts; it exposes `CTFODraft.api` (signElc, elcTerms, leagueType, ageAt, iso, seedOf, needBonus, draftYearOf) and `CTFODraft.X` (the game deps).
  - **Scenes:** ON THE CLOCK (crest, round/pick, countdown, team-colour wash) → PODIUM (the drafting GM; you for your picks; typed announcement + suspense beat) → THE PICK card (bio, birthplace, stats, scouting blurb, OVR/potential grade/projection, `Character:` top two traits) → WALK-UP (Three.js stage: procedural low-poly player and GM, walk from the crowd, jersey goes on, handshake, photo flashes) → DRAFT BOARD (last six picks + up next). A lower-third and a bottom ticker run throughout. The scene is built lazily (`vendor/three.min.js` is loaded on demand), disposed when the queue empties, and falls back to a CSS 2D stage if WebGL fails (`CTFODraftShow._noGL`).
  - **Controls/settings:** Skip this pick, Sim to my next pick (fast-forwards to a ticker), Speed 1x/2x/4x, Presentation Full / Round 1 only / Off (overlay + draft room), saved in `localStorage['ctfo.draftShow']`. Full = round 1 and your picks get the full show, later CPU picks a 1.4 s card flash (more than 12 queued become ticker-only). Round 1 only = later CPU picks ticker-only. Off = no broadcast, but your own picks still get the conversation. Auto-drafted user picks (Auto-draft the rest) resolve silently.
  - **Conversation model:** each draftee gets seeded traits 0–100 (Ambitious, Loyal, Patient, School-first, Competitive, Family-first, Confident, Coachable; league/age biases), cached in `p.ctfoTraits`. Hidden willingness to sign now is a logit from league (CHL/NCAA/college-bound/Europe), age, pick, team direction (`g.philosophy` / CPU `orgState.role`) and positional depth (`needBonus`) plus traits. Each question has exactly 4 answers (strong +1.4, moderate +0.7, risky 0, negative −1.3 base) plus trait weights × (trait−50)/50 (negative weights are damped to 35% for players low in that trait) and context weights. Signing chance = sigmoid(base) → sigmoid(base+effect). Outcome roll: rarely unhappy (more likely after a bad answer), sign now (`signElc`; at the 50-contract limit he becomes 'later'), sign later this summer (2–8 weeks; signs in `summerTick`, an ELC offer meanwhile is accepted), or return to junior/college/Europe (rights kept; NCAA rights last while he is in school). Unhappy → ELC offers accept at 35% of the normal chance; if his rights lapse, the D3 re-entry rule applies. A good/great talk also nudges later-summer ELC acceptance (×1.08/1.15, Wrong ×0.8). CPU clubs run the same model silently with a GM answer policy (best 35%, 2nd 30%, 3rd 20%, worst 15%).
  - **Debrief:** profile with values and one-line descriptions, verdict (Great = best answer, Good ≥ +0.4, Risky > −0.4, Wrong), WHY sentences built from the largest trait/context terms of the chosen answer, the best answer and why, signing chance before → after and the outcome.
  - **Save data:** `p.ctfoDraft.talk` {qid, by, choice, pBefore, pAfter, E, outcome, weeks, limit, verdict, year, owner, overall, user, pending, done}; `g.ctfoTalkUsed` (question ids already asked in this save; no repeats until the eligible pool is exhausted, then `g.ctfoTalkCycles`++). A pending talk (reload mid-conversation) re-opens on the next office render. The Draft Rights cards show the stage outcome.
- **Theme (v9):** every office page, modal and the live-game chrome use the hub tokens from `theme-core.css` (see rule 5). Office shell: a compact dark command bar (club name, Save / Export / Options), a dark nav bar with a gold underline on the active tab, breadcrumb line, sticky bottom bar with the gold advance button.
- **Playoffs and awards:**
  - The bracket always completes, even when Boston misses or is eliminated (`v4fixFinishBracket`).
  - The Calder goes to real rookies, and the Hart and Vezina use weighted formulas.

## 4. Version history
- **v1 / v2 (user's builds):** the original single-file franchise sim and front office UI.
- **Update 1 – sim engine v2:** realistic TOI by line and pair, PP/PK units, goalie rotation, shot and scoring rates, OT/SO, empty-net and shorthanded goals, PIM, a hang guard.
- **Update 2:** compact saves in IndexedDB with honest save messages. Fixed the Free Agents screen crash.
- **Update 3:** the July 1 league-year rollover, so cap space frees from expiring contracts.
- **Update 4:** the real NHL cap schedule, with the floor $20M below the cap.
- **Update 5 (v3.1):** realistic FA asks, the 20% max contract, AI re-signs, no RFAs or stars left unsigned.
- **Update 6 (v3.2):** duplicate-player repair and the big prospect name generator.
- **v4:** all of the above merged into the user's build 77 (the Three.js 3D rink). The rink shows the real starting goalie and falls back to 2D if WebGL fails.
- **v5:** the live game rebuilt as real hockey choreographed to the engine. Systems, umbrella PP, one-timers, goalies that stay in the crease, line changes, TD Garden arena, animated models (25 MB → 2.5 MB), 2x speed and Sim to end of period.
- **v6:** teammate patches:
  - Sim Bot: birth dates, vet and RFA contract caps, playoffs and awards, the year-1 floor, loyalty, and the FA v2 5-day market.
  - New Bot: weekly org-role trades and the AHL system.
  
  Also in v6: the quick-sim buttons, plus merge fixes (the AI weekly tick runs after the box score, live-game player lookup after deadline trades, tenure reset in cap-floor trades, no false error banner on failed image loads).

- **v7:** the home/start screen redesigned as a front-office hub in the FA v2 design language: command bar with the data status line, Continue career as the primary action, the team picker in division columns with a clear selected state, and a selected-club panel (roster, payroll, cap space, average age, cap meter, key players). No game-logic changes.
- **v8:** the "Choose your GM style" setup screen (`#setup-screen.home8`, styles in `setup-redesign.css` generated from `setup-redesign.src.css`) redesigned in the v7 hub / FA theme: Rebuild/Contend/Retool cards with a check-mark selected state, payroll reference card with the Use snapshot toggle, gold "Enter the front office" button, focus rings; all controls and IDs unchanged.
- **v9:** Build Bot's draft overhaul merged and fixed (NHL order rule for picks 17–28, the "Resolve draft rights" button, goalie-heavy class tops, ELC slide, rights expiry and draft re-entry), a draft-night broadcast with an on-stage ELC conversation (150 questions), and a full redesign of every office page, modal and the live-game chrome in the hub theme through a shared `theme-core.css` layer. `bruins-theme.css` (which greyed out red warnings) is gone. The GM style screen shows TBD payroll for clubs without snapshot contracts. No other game-logic changes.
- **v9.1:**
  - **Real draft-night figures.** The walk-up stage (`theme-src/draft-show/src/05-stage.js`) now uses the live game's ctfo-v2 skater (`skater-glb.js` + `skater-models.js`, `buildHockeyPlayer`). It is loaded lazily (`vendor/three.min.js` → `vendor/GLTFLoader.js` → skater-glb → skater-models), built once and reused; the stage disposes its own resources and the renderer on exit and unregisters its figures from `window.CTFO_PLAYERS`.
    - The clips are stopped and the 20 bones are posed procedurally each frame (reset to rest, model-space rotations, two-bone arm IK with a pole):
      - walk cycle driven by distance travelled;
      - GM hands on the podium;
      - jersey card handed over, then arms overhead for the pull-on, with the material swapping at the end;
      - right-hand handshake, both figures three-quarter to camera (ry ±0.88);
      - photo pose with inner arms behind the partner's back.
    - GLTFLoader strips dots from bone names (`upper_arm.L` → `upper_armL`), so both spellings are aliased.
    - Materials come from the stage's own tint builder (same algorithm as the runtime, plus hair recolour of the helmet texels).
      - The player wears the team kit with his number (back and sleeves).
      - The GM gets a dark suit with a shirt and tie decal (tie in the team accent colour); stick and tape are hidden.
      - Team textures are an LRU of 4.
    - The 2D fallback is unchanged. If the models finish loading mid-item, a 2D stage swaps to 3D.
  - **Handshake caption** shows the player's name and "<TEAM> GM" (or "You · general manager") separately.
  - **CPU draft-night signing calibrated** to Build Bot's rates via logit offsets for CPU clubs only (`S.CPU_ADJ` per bucket in `02-game.js`, `S.cpuEv`; CPU "later" share ×`S.CPU_LATER`=0.35). User odds from the Q&A are unchanged.
  - **Phone call skipped** when the stage conversation already happened for that pick (`S._skipCall` in `04-engine.js` clears `offseason.playerCall` and advances the draft one pick; no draft.js change).
  - **Pick card** shows `SCOUT OVR currentLow–currentHigh` and `SCOUT POT low–high` from `p.scoutReport` (the source fix from scouting's MERGE-NOTES; scouting's runtime MutationObserver is now redundant but harmless).
  - **Home news** shows the newest 5 transactions (`slice(0,5)`; the log is newest-first).
  - **Scouting v2 (Sim Bot)** is merged through `/workspace/scouting/patch/apply-scouting.sh`; see `SCOUTING-NOTES.md`. It adds:
    - a marked block before `try{init();}` (`/* ===== SCOUTING V2 … END SCOUTING V2 ===== */`, `window.CTFOScouting`);
    - `scouting.css` (linked after `draft-show.css`);
    - real 2027–2030 classes in `data/draft-classes.js` (280 per class).
    - During the draft it swaps `projection` (CPU: club's perceived value) and `scoutReport` (you: locked war-room board) for exactly one pick at a time.

## 5. Known open issues and next steps
- **Home screen data:** only Boston has full contracts and ratings in the starting snapshot, so other clubs show TBD payroll and cap space on the home screen until a career starts. If a fuller snapshot is bundled later, the panel fills in automatically (it switches on when at least 60% of a club's active players have a salary or OVR).
- **Home screen testing:** headless Chrome at 1280×800 and 1920×1080 only. Not yet checked on the user's real monitor or with the web fonts (Barlow Condensed / DM Sans aren't bundled; Windows falls back to Arial Narrow / Arial).
- **Draft (v9):**
  - Real 2027–29 classes are not bundled (`data/draft-classes.js` is empty); the fictional generator is used. Real classes would need an Elite Prospects API key and a data pass.
  - Generated prospect names are checked against the real-player registry, but a name can still match a real player outside the NHL (e.g. "Nikita Gusev").
  - The base game only expires contracts on the NHL roster; AHL/org contracts never count down. v9 handles this for draftees' ELCs only (they burn a year off-roster). Other AHL contracts are still frozen.
- **Draft broadcast (v9.1):** the figures are the live game's skater model posed procedurally. The helmet is part of the mesh, so it is recoloured as hair and still reads a bit like a helmet. Skates stay under dark socks. Both figures share one face, and the bulky sleeve makes the handshake look elbow-high. The base game's phone call after your pick is kept after the stage moment. GMs are unnamed (the game has no GM names). Swiftshader/headless screenshots were used for testing; a real GPU will be smoother. In headless screenshots the WebGL canvas under translucent overlays comes out transparent, so the delivered PNGs are flattened on the page colour.
- **Theme (v9):** headless Chrome at 1280×800 and 1920×1080 only. Web fonts (Barlow Condensed / DM Sans) aren't bundled, so Windows falls back to Arial Narrow / Arial. The draft-night hero keeps its gold spotlight art. Wide tables scroll inside their own panel. Page content scrolls under the sticky bottom bar by design.
- **Forced live events:** about 10% of live events are "forced": a player slides into a lane, or a line change swaps instantly.
- **Tactics:** "Shoot first" and "Possession" don't change live-game behavior yet; only "Crash the net" does.
- **Camera:** no replay camera; the camera follows the puck.
- **FA v2 testing:** headless only. It passed full-season runs (0 errors, cap and floor clean after FA, no stars unsigned), a losing Boston rebid, and the rebid penalty surviving save/reload. **Untested:** multi-season (2+ offseason) runs on v6; manual checks of the FA screen, the final-chance dialog and agent calls on real hardware; mobile layout; the quick-sim Stop button pressed mid-sim; and the live game with WebGL on a real GPU (only software rendering was tested).
- **Summer trades:** the 5-day FA market leaves little room for them (0–3 per summer in testing, down from about 5). Consider extra weekly evaluations after FA closes.
- **Deadline payroll:** in about half of the season runs, one AI club sat slightly under the floor at the trade deadline (e.g. SJS or NSH, about $80–84M against an $84M floor). After FA it is always clean.
- **Legacy code:** legacy `cpuTrade` and the V4FIX trade engine remain as dead code.
- **Hart winner:** it usually lands on the points leader.
- **Next:** the user plans a **video review of the live game** on their PC (WebGL runs much better on real hardware). Expect feedback on play realism, the camera and pacing.

## 6. User preferences
- Realism matters: real NHL systems (F1/F2/F3 forechecks, the umbrella PP, puck movement with one-timers), players who know their position (what a right wing does) and their tendencies. The stats engine stays authoritative; the live game plays real hockey to match it.
- Keep the user's own changes when merging.
- Always verify that the scoreboard matches the box score, that season sims run with 0 console errors, and that save/reload works.
- Plain-language summaries. Deliver a zipped build with top folder `Couch-To-Front-Office/`.

## 7. How to verify a change
- **v9.1 build:** `bash /workspace/codereview/patch14/build_v91.sh` (copy of sim-v9 → draft-show rebuild → scouting → apply14; checks idempotence, the app.js/inline mirror and syntax). Tests are in `/workspace/codereview/patch14/tests/`:
  - `v91_test.js BOS` runs the draft show, captions, call skip, reload and scouting boards;
  - `cpu_rates.js COL` simulates 2 drafts and reports CPU signing rates.
1. **Mirror check:** `app.js` must equal the inline game script in `index.html`. Also run a syntax check (e.g. `node --check app.js`).
2. **Load:** open the game and start a franchise as Boston. Watch for the red "The game could not start" banner and for console errors (F12).
3. **Live game:** press **Play next game**. Try 2x and **Sim to end of period**. At the end, the scoreboard, the goal times and the scorers must equal the box score. Watch a power play for the umbrella.
4. **Season:** use **Sim to end of week** a few times, then **Sim to end of season**.
   - Boston's record must equal the standings, and every team's W must equal total L + OTL.
   - Trades and AHL moves should appear in the news/transactions.
   - The deadline should stop the weekly sim.
5. **Offseason:** start the playoffs. The bracket must finish with a champion even if Boston misses. Then go through the draft and the 5-day FA market. After FA closes:
   - no AI club over the cap or under the floor (cap − $20M)
   - no club over 50 contracts
   - no 85+ player left unsigned
6. **Save:** press Save, reload the page. The home screen should show the gold Continue strip for your club, with Start new franchise as an outline button. Then press Continue career. The day, record, roster, FA state and penalty must all be the same.
7. **Console:** 0 console errors throughout.
