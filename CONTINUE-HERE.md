# Continue Here · September 30, 2026

## Current update
- Future pick inventory is repaired for every NHL club: the next three draft years have one standard pick per round (224 per draft, 672 total), stale prior-year picks are removed, and acquired picks stay with their current owning club. In-save trades continue to update ownership. This is a simulation inventory; imported real-world pick conditions and ownership should be source-checked before being described as fully verified.
- “Sim all remaining picks” completes all 224 selections in order, including automatic selections for the user club and all AI clubs.
- Expiring active-roster contracts lose one year at the completed-season offseason transition. At zero years their cap hit becomes zero and the player is marked UFA/RFA; no silent random renewal occurs. UFA/RFA status is exposed in the free-agent window, and RFAs can be offered a qualifying deal by their rights-holding club.
- Added an offseason development curve for ages 18–32, based on potential, age band, training focus, development boost and youth philosophy. Growth is capped at potential; decline risk increases in the early 30s. Progression runs for all 32 clubs.
- Free-agent salary asks use cap-era tiers calibrated to current NHL contracts. The model uses the announced $104M 2026–27 and $113.5M 2027–28 upper limits, then a labeled 6.5% annual simulation projection beyond the announced years.

## Checks completed
- JavaScript syntax.
- Position choices: forwards LW/C/RW, defense LD/RD, goalies Starter/Backup.
- Full 224-pick draft: 217 AI selections and 7 user selections; no prospects left.
- Future asset ledger: 32 clubs × 7 rounds × 3 years, duplicate/stale-pick checks, and a traded pick remains with its current owner.
- Contract year countdown and 24-year-old RFA / 29-year-old UFA classification; expired cap hit becomes zero.
- Offseason progression across ages 18, 20, 23, 26, 29 and 32; no player exceeds potential.
- Free-agency daily window through September 1, nonlinear draft-pick values and pick ownership transfers.

## Next session
1. Open the delivered project and visually inspect roster, future assets, draft room, contracts and free-agency screens.
2. Play through a complete franchise season into offseason and verify a one-year contract expires exactly once; check how unsigned players are handled at the September 1 close.
3. Verify the imported starting pick ledger and conditional pick clauses against an authoritative current source; the generated standard inventory fills gaps but does not invent conditional terms.
4. Continue the broader simulation review: game box scores, trade deadline offers, playoffs, draft rights choices and one-to-three-year development.

The project is a local HTML app. Open `index.html` in a browser. Source data provenance and any unverified ratings/pick holdings should remain clearly labeled.
