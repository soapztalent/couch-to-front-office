# SIM-TASK: v10.3 deadline-day simulation report

Game: `game/` (v10.3 of Couch To Front Office, an NHL franchise sim, Boston default). `index.html` inlines `app.js`, so you can drive the game with puppeteer (open game/index.html headless) or run the engine in node.
Reference: `ref/tv_test.js` (existing trade-value test harness, shows how to load the engine), `ref/MARKET.md` (real NHL deadline market norms).

## Job (NO code changes, only sims and report)
1. Run at least 30 headless deadline-day simulations from fresh Boston saves. Use a mix of RNG seeds and a mix of seasons played up to the trade deadline (first season and later seasons).
2. Log EVERY AI-to-AI deadline trade with:
   - both teams, and each team's role (rebuild / contender / bubble...)
   - each side's assets: players (name, pos, OVR, POT, age, cap hit, years, UFA/RFA status); picks (year, round, original owner, conditions/protections)
   - each side's engine trade value, the grades, and the AI's stated reason/banner
3. Log every incoming phone-call offer to Boston, with the value-meter %.
4. Outputs, committed to this branch under `sims/`:
   - `deadline-trades.csv` (one row per trade)
   - `deadline-trades.md` (readable list + analysis)
   - analysis: lopsided deals, how often stars and first-round picks move, repeated patterns, teams acting against their role. Rate each trade **realistic / questionable / absurd** against real NHL deadline norms (ref/MARKET.md). List the 10 worst trades and point to likely root-cause functions in the trade code (trade value / AI trade logic in app.js).
   - totals: sims run, trades, counts per rating, calls to Boston and their meter % distribution.

## Skipped files (too large/binary for this push; visual only, not needed by the trade engine)
Images (assets/*.webp, assets/bars/*.jpg, models/*.png, skaters/*.png), 3D models (models/*.glb), and base64 GLB/sprite bundles: goalie-glb.js, skater-glb.js, player-glb-data.js, player-sprites.js, live-assets/arena-home-glb.js, live-assets/arena-neutral-glb.js. Missing-asset 404s in the browser console are expected and can be ignored; stub `window.PLAYER_GLB` etc. if something throws.

## index.html is split
`game/index.html` (5.1 MB) was too large for one push, so it is stored as `game/index.html.part-00` .. `part-NN` (split on line boundaries). Rebuild it first:

```
cd game && cat index.html.part-* > index.html
```
(sha256 of the rebuilt file should equal the one in `game/index.html.sha256`.)
