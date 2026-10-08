# Scouting v2: merge notes (re-anchored on final v9)

Target: final v9 (`/workspace/sim-v9`). Tested on the copy `/workspace/scouting/test-v9`; sim-v9 itself was never touched (the guard refuses it).
The v8-era notes are kept in `MERGE-NOTES-v8.md`. The v8 code path still works and was re-tested.

## What ships
| File | Purpose |
|---|---|
| `apply-scouting.sh <game-dir>` → `patch_scouting.py` | Idempotent patcher. Refuses `/workspace/sim-v4..v9`, `trades-fix` and `fa-redesign`. Runs `node --check` on app.js and the inline script and prints the app.js/index.html parity result. |
| `src/00-core.js … 40-hooks.js` | The module, concatenated into one marked block: `/* ===== SCOUTING V2 … */` … `/* ===== END SCOUTING V2 ===== */` (735 lines, 132 KB in v9). |
| `scouting.src.css` → `build_css.py` → `scouting.css` | Every rule is scoped `body[data-view] .sc2 …` with `!important`. Colours come from v9 theme-core tokens (`--t-bg, --t-panel/2/3, --t-line/2/3, --t-text, --t-soft, --t-muted, --t-dim, --t-gold/2, --t-goldbg, --t-green/red/amber(+bg), --t-blue, --t-display, --t-sans`), with the old values as fallbacks. The page background now uses `var(--t-bg)`. |
| `tools/build_depth.py` → `data/depth.json` | **New.** 56 real late-round depth players per class (ranks 225–280) from `/workspace/prospects` caches. Read-only on that folder; mtimes were checked before and after. |
| `build_classes.py` → `data/draft-classes.js` | 2027–2030 classes in Build Bot's `CTFO_DRAFT_CLASSES` format: **280 per class** (the 224-man board plus 56 depth players). Extras: `ovr, potential, potentialSD, projection, attributes, scoutingConfidence, boardFlag`. |

Re-running swaps the block for the current `src/` and refreshes the CSS and data. Two consecutive runs give byte-identical app.js, index.html, scouting.css and data (md5 checked).

## Markup/text anchors (the only text edits)
1. **app.js and index.html's inline script.** The block goes right before `  try{init();}catch(e){var box=$('fatal-message')`. That needle appears exactly once in each file, after the `CTFO DRAFT (draft.js)` install block, so when scouting runs `CTFODraft.install()` has already rebound the app's draft functions to the draft.js versions.
2. **Class data.** v9 already has `<script src="data/draft-classes.js">` (line 9). Its file is an empty stub (no `"players"`), so ours replaces it. If a future build ships a real class file, the patcher keeps it and writes ours to `data/draft-classes.prospects.js` with its own tag, so it never overwrites Build Bot's data.
3. **CSS.** `<link rel="stylesheet" href="./scouting.css">` goes after `draft-show.css`, the last stylesheet link.

Outside the block, app.js is byte-identical to sim-v9. index.html differs only by the CSS link.

## v9 draft wiring (function-level hooks only, no markup edits, no draft.js/draft-show edits)
v9's CPU pick (`cpuScore`) ranks on `p.projection` plus need and noise. v9's auto-pick (`userChoose`) ranks on the midpoint of `p.scoutReport` plus need and the watchlist. Scouting swaps those two inputs **for exactly one pick at a time**:
- **When a CPU club is on the clock,** every available prospect's `projection` becomes that club's perceived value, `scAiValue`: 35% truth and 65% the public board, plus the club's own bias and noise, plus your leaks. v9's own `cpuScore` then adds need and noise and picks.
- **When you are on the clock,** `scoutReport` becomes `{low:v,high:v}`:
  - `v = 1000 − 5·boardIndex` for your locked war-room board;
  - `−1000` for do-not-draft players;
  - your fogged board value (under 60) for anyone not on the board.
  
  v9's `userChoose` therefore follows the board (need is at most +0.8 and the watchlist +1.5, so neither can overturn a 5-point gap). Once the board runs out, it falls back to your fogged reads.
- **After each selection,** draft.js calls `CTFODraftShow.picked(g,row,p,how)`. That is wrapped to:
  1. restore the swap;
  2. file the pick (`scRecordPick`, which carries `p.scFile`);
  3. call the original show (the broadcast sees true data, not the swap);
  4. load the next row's board.
  
  So per-club boards also apply inside v9's internal loops (`simAll`, `advanceDraftToUserPick`). Every original value is restored exactly when the outer call returns. Fields that didn't exist before are deleted again.

| Anchor (both `CTFODraft.X` and the app closure var where v9 rebinds it) | What scouting does |
|---|---|
| `makeProspects(seasonNo,id,g)` | v9 builds the class: ids, consensus order, the 280-man slot, rights fields. Afterwards our board's `ovr, potential, projection, potentialSD, attributes` are applied by id. v9's `realClass` ignores those fields and re-derives them from rank. Any generated filler in a real class is capped below the board's tail POT (OVR ≤ 62). |
| `initializeDraftOrder(g)` | The first time in phase `draft`: run the scouting clock to draft week, build and lock the board if you never did, and snapshot the public board for grades. |
| `advanceDraftOnePick`, `advanceDraftToUserPick`, `finishDraft`, `draftBest`, `draftProspect`, `acceptDraftTrade`, `CTFODraft.simAll` | Entry wrappers: outermost call only. They start the draft (see above), apply the swap for the row on the clock, call the original, then restore and reconcile. |
| `CTFODraft.completeDraft`, `renderDraftSigning`, `renderProspects` | `scReconcile`: files any done row that slipped past (e.g. "open rights" ends the draft through the local `completeDraft`) and grades once the draft is `completed`. |
| `aiDraftPickScore(g,club,p)` | Calls outside a pick (e.g. draft-trade evaluation) also use that club's perceived value. |
| `CTFODraftShow.picked` | Per-pick restore, file, present, and next-row swap (see above). If draft-show is missing, a stub object is created; draft.js checks method presence. |
| always-on (unchanged from v8) | `aiWeeklyGmTick`, `simulatePlayoffRound`, `renderProspects` (mount), `rehydrateSavedGame` (old saves), `advanceSeason` (redraft after 3 seasons), `progressPlayerOffseason`, `officeOpenModal` (player-card file), `gmAssetValue` (your valuation of others' prospects uses your file or the public read). |

v8 path (no `window.CTFODraft`): the old wrappers (`makeProspects` → `scBuildRealClass`, `aiDraftPickScore`, `advanceDraftOnePick`, `finishDraft`, `draftBest`, `draftProspect`, `applyAIDraftPlayerChoice`) still apply and were re-tested on test-v8.

## Personality / interviews
- Traits are draft-show's own. In v9, `scTraits(g,p)` makes exactly the call draft-show's `S.resolve` / `S.context` makes: `CTFODraftShow.traits(CTFODraft.api.seedOf(g), p, CTFODraftShow.leagueClass(p), api.ageAt(p.ctfoDob, api.iso(draftYear,9,15)) || p.age)`. The result is cached on `p.ctfoTraits`, so the show, the on-stage question, the AI's draft-day talk and scouting all read the same object.
- Keys and labels are exactly `amb Ambitious, loy Loyal, pat Patient, col School-first, cmp Competitive, fam Family-first, con Confident, coa Coachable`. Bands are ≥65 high and ≤35 low (the same as `traitLine`).
- The text revealed in an interview comes from `CTFODraftShow.traitLine(k, value)`. The fallback table is a verbatim copy of the model's `[low, mid, high]` lines from `patch13/show/src/01-model.js`. A mid value reveals nothing ("Wrong question for this kid").

## Classes (2027–2030 at v9's 280)
- Ranks 1–224 are the prospect boards, as before.
- Ranks 225–280 are real depth from `/workspace/prospects` caches:
  - **2027–29:** `build/pools.json` + `people.json`. Draft-eligible DOB window, not on the board, ordered by the pool's merit score.
  - **2030:** the leftover pool from `build30.py` (the U14/U15 lists).
- Depth ratings come from the same slot curves, class shrink and goalie offsets as the boards. They are capped below the board tail: POT 2027 71–73, 2028 73–75, 2029 74–76, 2030 75–77, with every depth player `scoutingConfidence: very low`, `bustRisk: High`.
- Scouting's existing hidden-gem roll (6–8% of depth) can still raise a depth player's true POT by 6–12. That is intended; the public board never shows it.
- Later years (2031+) fall back to v9's generator.
- **Old saves:** an unscouted, all-generated class is rebuilt through v9's own (wrapped) `makeProspects` when the real data exists.

## Draft-show pick card (display fix, draft-show source untouched)
draft-show's card printed `p.scoutReport.low–high` under **SCOUT OVR**. In v9's report schema `low/high` is the **POT** range (`currentLow/currentHigh` is OVR), and its **POTENTIAL** slot showed a grade of the *true* potential. A MutationObserver on `#ctfo-show` rewrites the card's right column once it renders (`data-sc-fixed`):
- **Your department's read is tier ≥2:** `SCOUT OVR olo–ohi` and `SCOUT POT lo–hi`.
- **Tier 1:** OVR `?` and POT shown as a letter grade.
- **No read:** OVR `?` and `PUBLIC POT` as a letter grade.

The stat line is relabelled with its real season and league (e.g. `STATS 2025-26 · … · MHL`).
Suggested one-line fix for draft-show's owner, in `04-engine.js` `card()`: use `sr.currentLow+'–'+sr.currentHigh` for OVR and `sr.low+'–'+sr.high` (not `S.grade(p.potential)`) for POT.

## Bio data on the card
- **Stats** come only from the class data: EliteProspects season lines (2025-26, or 2026-27 when 2025-26 is missing) parsed from `/workspace/prospects/prospects-YYYY.csv`, plus the EP cache for depth players. v9's `realClass` never generates stats for real players. A player without data shows `—`. Coverage:

  | Class | Players with stats (of 280) |
  |---|---|
  | 2027 | 280 |
  | 2028 | 106 |
  | 2029 | 58 |
  | 2030 | 114 |

  Generated 2031+ classes get v9's generated stats, as before.
- **Birthplace:** draft-show invents one from nationality unless `p.birthplace` is set. The data now carries the real EP birthplace where it was fetched (2027: 275, 2028: 99, 2029: 50, 2030: 4); the rest still use draft-show's generated city.

## "Generated prospect class" label
In v9 that string survives only in app.js's original `renderDraftNight`, which draft.js replaces. v9's draft night already prints `p.dataSource`, which now reads "Real 2027 draft class: CTFO prospect boards 2027-2030 (Elite Prospects bios + public rankings, Oct 2026; slots 225-280 real depth) · NHL order with lottery · 7 rounds." The patch also carries a guarded text-node fix (`scFixLabel`) that rewrites the old string if it ever renders with a real class, which covers v8. Neither touches markup source.

## Known quirk (not changed, as asked)
v9's `renderHomeDashboard` still uses `transactionLog.slice(-5).reverse()`. The log is newest-first, so Home shows the **oldest** five items. That is the same as v8. Scouting notes appear in the Roster overview feed (`slice(0,5)`, newest first) and in history. A one-word fix (`slice(0,5)`) would change Home.

## Proposals (not implemented)
- AI trade valuation of YOUR prospects through their fog (`CTFOScouting.aiValue`), plus class-strength-aware pick values.
- A "scouting file" column in the trade UI (`CTFOScouting.read`).
