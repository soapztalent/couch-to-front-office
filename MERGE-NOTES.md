# v9 merge notes (draft overhaul + full theme)

Built Thu Oct 8, 2026 (ET) on top of **v8** (unchanged). Rebuild with `/workspace/codereview/patch13/build_v9.sh` (copies sim-v8, applies every step, re-runs every step to prove they are no-ops, checks the `app.js` mirror and parses `app.js`, `draft.js`, `draft-data.js`, `draft-questions.js` and `draft-show.js`). Then `python3 /workspace/codereview/patch13/package13.py` writes these docs and zips the build.

| # | Step | Result |
|---|---|---|
| 1 | Copy sim-v8 → sim-v9 | clean |
| 2 | `draft/apply-draft-v9.py` (copy of Build Bot's `apply-draft.py`, his files kept pristine in `draft/upstream/`) | Re-anchored: the three draft `<script>` tags now go before `<script src="skater-models.js?v=ctfo2">`, the first external script in `<head>` (the old `skater-glb.js?v=mesh` anchor no longer exists), so they load before the inline game script. The install hook goes before `try{init();}` in both `index.html` and `app.js`. |
| 3 | `draft/fix_draft.py` | D1 NHL order for picks 17–28; D2 fewer top-15 goalies in generated classes; D3 rights expiry + re-entry; D4 ELC slide and off-roster ELC burn; A1 (`app.js` + inline) the main button in the `signings` phase opens Draft Rights. |
| 4 | `theme/apply_theme.py` | Generates `theme-core.css` (`theme/build_theme.py`: 1,000+ auto recolor rules from the legacy CSS + the core layer), links it last, removes the `bruins-theme.css` link and file (plus `garden.jpg` / `bar-collage.jpg`, only used by it), copies the theme source into `theme-src/`. Script edits (inline + `app.js`): T1 GM-screen payroll TBD for clubs without snapshot contracts; T2 the Captain button label; T3 playoff series notices use your club's name. |
| 5 | `show/apply_show.py` | Builds `draft-questions.js` from `show/questions.dsl` (`show/build_questions.py`, validates 4 typed answers per question and every weight/tag), assembles `draft-show.js` from `show/src/*.js`, copies `draft-show.css`, adds their tags after `draft.js` / `theme-core.css`, copies the sources to `theme-src/draft-show/`, and patches `draft.js`: `picked()` hook at the end of `makeSelection`, `cpuDecide()` for CPU rights, `acceptChance` → `adjustAccept()` wrapper, `summerTick()` after a season advance, `CTFODraft.api` / `CTFODraft.X`, stage-outcome note on the Draft Rights cards. No `app.js` change. |

**Compatibility checks (draft):** AHL / 50-contract code (unsigned rights stay off the 50; `ahlContractCount` used for ELC signings; max 33–39 contracts per club after the draft, none over 50); playoff fixes (`v4fixFinishBracket` still completes the bracket before the order is built); FA v2 (draft → rights → 5-day market → season 2 ran clean twice).

**Theme notes:** the legacy CSS files stay (they carry the layout). `theme-core.css` wins by loading last with `!important`; the recolor layer is not `!important` (prefixed with `html` so it beats the original rule but loses to the core layer, FA2, home and setup CSS).

**Tests** (headless Chrome, port 8784, stopped afterwards; the optional NHL API requests are blocked by CORS on localhost, which shows as network messages, not script errors):
- **Page tours** (every office page + modals; Boston and Colorado at 1280x800, Boston at 1920x1080): 0 console errors, no horizontal scroll. Final-build Boston tour re-run: 0 errors (one "overlap" flag is the fixed bottom bar over scrolled content, by design).
- **State runs** (home, GM style, live game, box score, mid-season, playoffs, bracket, awards, draft, FA, reload; Boston + Colorado 1280, Colorado 1920): 0 console errors. Live game scoreboard matches the box score every time (BOS 4-0 ANA, COL 5-2 ANA, final-build COL 5-0 ANA). GM-screen payroll: BOS "$95,132,083", COL "TBD". Save / reload after FA lands on the same phase and club.
- **Draft tests** (`tests/draft_test.js`, two full seasons, Boston and Colorado, final build): 0 errors; 224/224 picks both drafts, all unique, wrong owner 0; sim-to-my-pick stops on the right slot; manual pick honored; mid-draft and after-draft reload identical; ELC offer works (BOS declined, COL signed 3 yr $1.0675M, slidesLeft 2); season 2 reached; 7 rights carried; 0 duplicate players.
- **Question pool** (`tests/questions_test.js`, node): ALL PASS. 150 questions (75 player / 75 GM), 13 categories, 53 eligibility-tagged, 600 unique answers, exactly 4 typed answers each (strong / moderate / risky / negative), every answer moves the odds (mean swing >= 0.3), strong > moderate > negative, risky flips with personality (icetime-01: ambitious -1.43, patient +0.96). No repeats across 27 user picks over 3 seasons, used ids survive save JSON. Best answer vs worst answer outcomes: signs now 22% vs 3%, unhappy 0.9% vs 8.5%.
- **Draft broadcast** (`tests/show_test.js`, Boston and Colorado, final build, 1280x800, WebGL via SwiftShader): 0 console errors. 3D stage loads; every CPU scene captured (on the clock, podium, card, walk-up, jersey, handshake, photo, board); user pick plays the full show, then the conversation. Reload mid-question resumes the same question (BOS pressure-05, COL pro-04). Debriefs: BOS Good 44% -> 63% signs ELC on the spot, BOS Great 5% -> 18% later this summer, COL Wrong 8% -> 3% returning to college, COL Great 20% -> 59% returning to junior. Outcomes persist after reload; Skip jumps to the question; no repeat between picks; Presentation setting saved; Round-1-only mode uses the ticker; 2D fallback works without WebGL; finish draft works; whole-draft outcomes (BOS) now 30 / later 23 / return 166 / unhappy 5, max 35-36 contracts per club; stage notes on the Draft Rights cards.

---

# v7 merge notes (home redesign)

Built Thu Oct 8, 2026 (ET) on top of **v6** (unchanged; v6 is not modified). Rebuild with `/workspace/codereview/patch11/build_v7.sh`, then `python3 /workspace/codereview/patch11/package11.py` (writes the docs into the build and zips it).

| # | Step | Result |
|---|---|---|
| 1 | Copy sim-v6 → sim-v7 | clean |
| 2 | `patch_home.py sim-v7` | 5 exact-anchor script edits + `renderTeams` replacement, applied to `app.js` and to the inline script in `index.html` (the script checks the mirror before and after); `#team-screen` section replaced from `src/home-markup.html`; `home-redesign.css` link added after `free-agency.css` |
| 3 | `src/build_home_css.py` | generates `home-redesign.css` from `src/home-redesign.src.css` |
| 4 | `patch_home.py` run a second time | no-op (idempotent), then `app.js` parse check |

**Conflicts:** none. Notes:
- `bruins-theme.css` styles the start screen with `!important` at `(1,1,1)` specificity (e.g. `body:not([data-view="office"]) #to-modes`). The generated CSS is scoped to `body[data-view] #team-screen.home7` (`(1,2,1)`+) with `!important`, and it loads last.
- The old `.screen-footer`, `.start-layout`, `.identity-card`, `.offline-banner` and `.team-pick-head` blocks are gone from the home markup. No script referenced those classes (checked); every element ID the script uses was kept.
- A later override in the script (`selectTeam=function(id){originalSelectTeam(id);...officeMark...}`) still draws the selected crest, so the patch doesn't touch `selectTeam`.

**Tests** (headless Chrome, port 8780, stopped afterwards):
- 0 page errors and 0 script console errors at 1280×800 and 1920×1080, and through the whole flow. (The game's optional NHL API requests are blocked by CORS when served from localhost: 95 network messages, the same 95 on v6. They aren't script errors.)
- No horizontal overflow at either size.
- Picked **Seattle**: tile selected (`aria-pressed=true`), panel updated (23 players, TBD payroll and cap, roster preview), focus ring visible (2px solid #ffcd5a). Start new franchise → setup → Start franchise opened the office as SEATTLE KRAKEN.
- Roster, Lines, Schedule and League pages loaded (same output sizes as v6).
- Saved, reloaded: the Continue strip showed "Seattle Kraken · Season 2026–27 · 0-0-0" with a gold Continue button and an outline Start button. **Continue career** loaded the Seattle office, and the game pages loaded again.
- Screenshots: `sim-v7-out/screens/before-*.png` (v6) and `after-*.png` (v7), including `after-withsave-*` and `after-selected-SEA-1280x800.png`.

---

# v6 merge notes

Built Thu Oct 8, 2026 (ET). Base is **v5**: v4 plus the rebuilt live 3D game (live-game.js, the TD Garden arena in live-assets/, and the animated skater and goalie models). Rebuild it with `/workspace/codereview/patch10/build_v6.sh`. That script copies sim-v5 and runs every step below in order. It rehearses the whole chain on a throwaway copy before touching sim-v6, and runs `--check` dry runs where a script supports them. Every step uses exact anchors and is idempotent. `index.html` inlines all the code, and `app.js` stays a byte-exact copy of the inline script (the build verifies this).

## Apply order
| # | Patch | Owner | Result on v5 |
|---|---|---|---|
| 1 | `/workspace/sim-v4-fixes-out/apply-fixes.sh` (V4FIX: 40 birth dates and the age fallback, vet/RFA contract sanity, playoffs that finish when Boston misses, Calder/Hart/Vezina rules, year-1 cap floor, trade windows) | Sim Bot | `--check` passed, then applied cleanly: 37/37 edits in each file, plus 40 birth dates in both rosters |
| 2 | `/workspace/sim-v4-fixes-out/apply-loyalty.sh` (V4LOYAL: tenure, hometown discount, loyalty helpers) | Sim Bot | `--check` passed, then applied cleanly: 19/19 edits |
| 3 | `python3 /workspace/trades-fix/patch_trades.py` (AI trade market v5: weekly org-role GM evaluations, six org roles, loyalty soft no-trade) | New Bot | Applied cleanly. This deliberately replaces Sim Bot's trade engine. `runAiTradeWindow` is now an inert stub, and `v4fixSeasonTradeTick`/`v4fixOffseasonTrades` return 0 |
| 4 | `python3 /workspace/trades-fix/patch_ahl.py` (AHL affiliates, call-ups and send-downs, waivers, 50-contract limit, playing-time development) | New Bot | Applied cleanly |
| 5 | `/workspace/fa-redesign/patch/apply-fa.sh` (FA v2: 5-day market, decision days, agent calls, Boston final-chance rebid + penalty, 50-contract limit in FA, G/D/F fill at close; adds `free-agency.css`) | Sim Bot | Applied cleanly, **last** among the teammate patches (as instructed). Note: its `build_css.py` regenerates `free-agency.css` inside its own patch folder every time it runs |
| 6 | `patch10/fix_01_weekly_tick_after_box.py` | v6 merge | Conflict fix, see below |
| 7 | `patch10/fix_02_livespec_lookup.py` | v6 merge | Conflict fix, see below |
| 8 | `patch10/fix_03_floor_trade_tenure.py` | v6 merge | Known gap: tenure is now reset in cap-floor trades |
| 9 | `patch10/fix_04_confirm3.py` | v6 merge | Verifies `AI_ORG.CONFIRM:3` |
| 10 | `patch10/fix_05_resource_error_banner.py` | v6 merge | Fixes a false "game could not start" banner that existed before v6 |
| 11 | `patch10/quicksim.py` (+ `src/quick-sim.js`) | v6 feature | Adds Sim to end of week and Sim to end of season |

Not included: Build Bot's draft patch (`/workspace/draft-fix/tools/apply-draft.py`). I tried it on a scratch copy of v6 and it failed: its `index.html` anchor `<script src="skater-glb.js?v=mesh">` was removed in v5. Per instructions it was skipped and is listed as pending in AI-HANDOFF.md.

## Conflicts and how they were resolved
None of the teammate patches failed to apply: v5 only changed the live game, and none of their anchors touch it. Two interactions between the patches and v5's live game showed up on review, and I fixed both while keeping both sides:

1. **Weekly AI tick vs. the box score and live game** (`fix_01`).
   - **What happened:** New Bot's patch runs `aiWeeklyGmTick` (trades and AHL moves) inside `simulateGame`, right after `g.day++`. That is before `gameStatDelta` builds the box score and before `liveGameLog` is stored.
   - **Why it mattered:** v5's live game (`watchNextGameNow` → `liveGameSpec`) and the box score both read the opponent's *current* roster. An opponent player traded or sent to the AHL that same night would vanish from the box score and the live game. An incoming player would show his whole season as one game.
   - **Fix:** the tick now runs immediately after `g.latestBoxScore`/`liveGameLog` are set, still inside `simulateGame` and before persist/render. The cadence (every 7 calendar days) and everything else are unchanged.
2. **Deadline trades between the sim and the live game** (`fix_02`). V4FIX's `simulateGame` wrapper runs `v4fixDeadlineCheck` after the game, so deadline-day trades can move a dressed player before the live game opens. `liveGameSpec` now falls back to a league-wide lookup (`allGamePlayers`) for any dressed id that is no longer on the club's roster.

## Requested additions
- **Tenure in cap-floor trades** (`fix_03`): `faFloorCapDumps` (the preseason season-open floor pass and the Sept 1 FA close) now calls `v4loyalEnsure(g, player, newTeam)` right after the move. It is guarded with `typeof`. Verified: Malinski, Killorn, Carlson and Anders Lee read `orgTeam` = new club and `yearsWithOrg` 0 at the deadline. Before, they kept their old tenure until the rollover.
- **Role-change threshold:** New Bot's current `src/trade-market.js` already ships `T_LOW:28,BUFFER:3,CONFIRM:3,`. `fix_04` replaces `CONFIRM:2` if it is ever found, and fails unless `CONFIRM:3` appears exactly once per file. Verified: once in `index.html` and once in `app.js`, with no `CONFIRM:2` left.
- **Quick sim buttons** (`quicksim.py`): see CHANGES.md.

## Extra fix
- **False error banner** (`fix_05`, existed before v6): the window `error` listener is registered in the capture phase. Any failed image load, such as a team logo while offline, showed the red "The game could not start … Unknown script error" banner over the dashboard even though nothing was broken. Resource-load errors are now ignored. Real script errors still show the banner.

## Files
- **Build:** `/workspace/codereview/patch10/build_v6.sh`
- **Packaging:** `package10.py`
- **Tests:** `/workspace/codereview/patch10/tests/`
  - `season_simbot.js`: Sim Bot's season harness (dup checks, playoffs, awards, cap)
  - `season_trades.js`: New Bot's trade and AHL harness
  - `fa_test.js`: FA v2 losing rebid, penalty across save/reload, market close
  - `v6_ui.js`: live games, quick sim, save/reload
  - `analyze_v6.py`
  - `make_www.py`: builds the hooked test copy, which is test-only
