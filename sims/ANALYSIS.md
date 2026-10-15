# Deadline-day analysis — Couch To Front Office v10.3

32 fresh Boston franchises were played to a trade deadline. The engine made **436 AI-to-AI deadline trades** and placed **188 phone calls** to Boston. Rated against the completed NHL deals in `ref/MARKET.md`:

| Rating | Trades | Share |
|---|---:|---:|
| Realistic | 390 | 89% |
| Questionable | 42 | 10% |
| Absurd | 4 | 1% |

Stars moved in 3 trades. A first-round pick moved in 17. Two firsts moved in 1. Every phone call was in the calling club's favor, from +15% to +40% on the meter (average +28%). 187 calls were tagged RIPOFF and 1 was tagged OVERPAY. None were fair, and none favored Boston.

The per-trade log is `sims/deadline-trades.csv` (one row per trade) and `sims/deadline-trades.md` (the same trades in sentences, plus every Boston call). Boston calls are also in `sims/deadline-calls.csv`.

## How the sims were run

`game/index.html` was rebuilt from `index.html.part-*` and matched `game/index.html.sha256`. The sim does not edit game logic. `sims/deadline-sim.js` serves a temp copy of the game, inserts `sims/page-hook.js` inside the engine closure, and drives a headless Chrome.

Each run starts a new franchise on Boston with payroll on, then replaces `Math.random` with a seeded generator so the opening roster stays the same and only the sim rolls change. Season 1 uses the official 2026–27 schedule and stops on the deadline date after 66 games (2027-03-05). Later seasons use the game's estimated calendar and stop on the first Friday of March (66 or 67 games). When Boston's active roster goes over 23, the harness calls the game's own send-down (`moveRosterPlayer`) on the lowest-OVR skater and continues. That is the click a user has to make; the trade code is untouched.

The mix:

| Seasons played to the deadline | Seeds | Sims | Deadline trades logged |
|---|---|---:|---:|
| 1 (2026–27 only) | 101–114 | 14 | 61 |
| 2 | 201–208 | 8 | 108 |
| 3 | 301–306 | 6 | 144 |
| 4 | 401–404 | 4 | 123 |

All 32 runs finished with a clean page. Multi-year franchises also log the AI deadline that fires while the season is played through, so a four-year run contributes up to four deadline days. The phone calls are only on the final day, the one Boston actually sits on. Every call was declined, so Boston is never a side in the AI-to-AI log.

## What the ratings mean

The comparison is the sourced deadline market in `ref/MARKET.md`:

- One first, usually late and often conditional, buys one top-6 forward or top-4 defenseman rental (Carlson, Faulk, Hanifin, Bertuzzi). Two firsts show up for a star (Rantanen, Meier) or for two real NHL players in one deal (Gourde and Bjorkstrand).
- A lesser rental (Tanev, Coyle) goes for seconds and thirds. No contender in that sample gave a first for a depth player.
- A signed young top-6 costs about two firsts (Peterka, McTavish, Dorofeyev). An 80-ish young RFA with a real NHL résumé is in the Newhook range: a late first plus an early second.
- On the game's own scale a late first is about 246 and a mid first about 286. Two mid firsts (~570) are a star. A depth player under 81 without a top-6 ceiling is capped near 215, so a first should not be spent on him.

**Realistic** means the shape matches that market, or it is an ordinary vet-for-vet / depth-for-depth swap whose neutral values sit inside the engine's own 0.75–1.33 band. **Questionable** means a real gap (neutral values 1.30× or worse), an A+ grade against a C or worse, an elite rental moving with no first, or a signed top-of-roster player whose return is a bit short of two premium assets. **Absurd** means a franchise player or a high-80s player with years left changed hands for a package a real deadline would not print, or a useful NHL defenseman was dumped with a pick attached for a 70.

Like-for-like veteran swaps (an 81-overall third-liner for an 80-overall third-liner, both players in their 30s, both clubs rebuilding) are rated realistic. Those deals are common on a real deadline.

## Stars and first-round picks

**Stars almost never move, and the two-first cap holds.** Three trades in 436 moved a player the engine marks as a star or a 90-plus:

- Edmonton (RETOOL, cap trouble) sent Leon Draisaitl, 96 OVR, age 30, $14M for 7 years, to Minnesota (WIN_NOW, cap trouble) for Quinn Hughes, 95, age 26, walk year, plus Minnesota's 2027 and 2028 firsts. Neutral value 856 vs 844, grades B+ / A−. This is the only two-first deal in the sample, and the price is a real king's ransom. The odd part is that Edmonton shopped him at all: he is 30 with seven years left. See root causes.
- Tampa Bay (RETOOL) sent Andrei Vasilevskiy, 94, age 33, walk year, to New Jersey (CONTENDER) for a 2030 first and Arseny Gritsyuk, 81, age 26. Neutral 342 vs 431, grades A+ / C+, ratio 1.26. An elite rental for a first plus a young NHL winger is inside the Carlson/Rantanen range. Rated realistic.
- New York (RETOOL) sent Igor Shesterkin, 92, age 33, $11.57M for 4 years, to Carolina (WIN_NOW) for Ben Geiger, 80, age 20, and a 19-year-old prospect. No picks. Rated absurd. Written out below.

**Firsts are rare, and most of them are hedged.** 17 trades included a first. Eight of those picks were top-10 protected or owed only if another first is protected. The clean ones are mostly 2029–2031 picks, not this year's pick. No deal carried three firsts. No contender gave a first for a sub-80 depth player.

The firsts that did move fall into three piles, all of which the market recognizes:

- A protected or owed first, often plus a roster player, for a young 80-OVR RFA with a high ceiling (Brindley, Laba, Ritchie, Sundström, Privalov). That is the aggressive end of the Newhook price, and the engine's young-player ceiling is what makes an 80 look like a first.
- A first plus a real NHL player for a signed 84–87 veteran (Chytil, Garland, Hertl, Gostisbehere, Parayko, Montembeault, Tavares).
- The Draisaitl deal, two firsts plus a star rental.

## Lopsided deals

Neutral value (the engine's `marketA` / `marketB`, before either club's own bias) is the cleanest "who won" number. The median trade is 1.13×, which is a normal deadline tilt. The tail:

| Neutral gap | Trades |
|---|---:|
| 1.30× or worse | 38 |
| 1.50× or worse | 4 |
| 1.70× or worse | 1 |

The four past 1.50× are all cap dumps: Jamie Oleksiak plus a third for a 70 (2.08×), Christian Dvorak for a 73 (1.63×), Nate Schmidt for a 73 (1.60×), Alex Lyon plus a third for a 70 (1.57×). The engine's accept rule lets a dump through as long as the cheap side is at least 45% of the other side when an 80-plus player is involved. Oleksiak cleared that bar. The published grades on these dumps are honest and ugly: the club that receives the useful player is an A+, and the club that sheds him is a D or a C−. The trade still goes through, because the dumper's private valuation adds cap relief onto the package he receives. On the Oleksiak dump, Vancouver's own books said 199 given and 243 received, while the neutral numbers were 268 against 129.

Outside dumps, the widest hockey gaps are Tampa Bay's buys of Mikey Anderson (1.47×, A+ / C) and Neal Pionk (1.42×, A+ / C−). In both, the engine's own numbers say Tampa overpaid. Eleven trades graded A+ on one side and C or worse on the other.

## Teams acting against their role

Role counts on the 436 deals (each trade counts both clubs): CONTENDER 214, RETOOL 192, BUBBLE 127, YOUTH_MOVEMENT 125, REBUILD 111, WIN_NOW 103. Contender-buy is the most common banner (125), then young-RFA targets (71), retool sells (55). That mix is what a deadline should look like.

The role breaks that matter are specific deals, not the banners:

- A RETOOL club sold a franchise goalie with four years left (Shesterkin) because the engine treats age 30 on a retool as "aging star, shop him."
- A REBUILD club sold an 88-OVR winger with four years left for one protected first and a 34-year-old (Ehlers).
- A CONTENDER sold a 24-year-old 86 with five years left for a 38-year-old rental (Slafkovsky for Doughty).
- A REBUILD in cap trouble attached a third to an 85-OVR defenseman to dump him for a 70 (Oleksiak). Cap trouble explains shopping the contract. It does not explain paying a pick to do it.
- Ottawa (RETOOL) moved Quinton Byfield, 87, age 27, six years at $13.65M, for Alex Laferriere, 84, the same age, plus a 19-year-old at 66 OVR. The neutral values are close (402 vs 427), so the engine is happy. A 27-year-old at that cap hit is a young core piece, and the return is a sideways winger. Rated questionable.
- Youth and rebuild clubs are the landing spot for other teams' third-line veterans (Tanev, Blueger, Stecher, Schmidt). The assets they give back are other depth players, so those swaps are rated realistic. The pattern is still wrong for a youth club: `YOUTH_VET_MAX_YEARS` is 2 and `YOUTH_VET_MAX_HIT` is $3.5M, and a lot of what they absorb sits right on that line.

Bubble clubs did not spend their own firsts on depth. The two bubble firsts in the log (Philadelphia for Sundström, St. Louis for Privalov) bought 18- and 19-year-olds already at 80 OVR with 91 and 96 potential. That is a prospect bet, and the market values on those players (about 400) sit above a mid first.

## Repeated patterns

- **The reason line is a template.** Almost every banner ends with "filled a lineup need; converted the asset into value that fits its org state." Cap dumps and hockey trades have their own one-liners. The sentence does not describe the package.
- **J.J. Moser is Tampa's trade chip.** He moved five times, usually a 26-year-old 84 with eight years and 92 potential, sometimes with a conditional first attached, for an older top-4 (Pionk, Skjei, Matheson). Tampa is in WIN_NOW and cap trouble in most of those sims, so the engine keeps offering the same contract.
- **Juraj Slafkovsky moved five times**, including the Doughty rental and a two-year 84 (Kesselring) for six years of Slafkovsky. Montreal's role flips between contender and bubble across sims, and the 23-year-old keeps getting used as the price of a defenseman.
- **Wyatt Johnston moved three times**, each time from a Dallas club trying to win, for an older defenseman of about the same OVR (Hronek, Provorov, Trouba). The Hronek swap is a fair 86-for-86. Provorov and Trouba are the club getting older for no upgrade. Cap hits are almost identical, so cap trouble is not what forces it.
- **Jamie Oleksiak moved four times.** One of those is the absurd dump. The others are his age-34 walk year, which is a normal rental.
- **Same third-line names recycle:** Teddy Blueger, Troy Stecher, Brandon Tanev, Pavol Regenda, Nico Myatovic. The deadline is busy, and a lot of the volume is 78–82 OVR players changing clubs at a 1.10–1.20 neutral gap. That volume is realistic. The failures are concentrated in the star, term, and dump tails.
- **Boston's phone is a one-way market.** See the call section. Matthew Poitras (80 OVR, 92 potential, age 22, cheap) is a favorite ask.

## The 10 worst trades

1. **Shesterkin for two young defensemen and no picks.** Sim 30, seed 402, 2029–30. The Rangers are in a retool and send Igor Shesterkin, 92 OVR, age 33, $11.57M for four more years. Carolina, trying to win now, sends Ben Geiger (80 OVR, age 20) and Easton Dozark (19, 81 OVR / 88 potential, still a prospect). Neutral value is 458 vs 444 and the grades are A− and A, so the engine thinks this is even. A franchise goalie with four years left is a Rantanen-class piece. The return is not a king's ransom. **Absurd.**

2. **Slafkovsky for a 38-year-old rental.** Sim 26, seed 304, 2028–29. Montreal is a contender and sends Juraj Slafkovsky, 86 OVR, age 24, $7.60M for five years. Vancouver, in a youth movement, sends Drew Doughty, 86, age 38, one year, pending UFA. Grades A+ / C, neutral 245 vs 324. A club trying to win traded five years of a 24-year-old for a rental of the same overall. **Absurd.**

3. **Ehlers priced like a rental.** Sim 32, seed 404, 2027–28. Carolina is rebuilding and sends Nikolaj Ehlers, 88 OVR, age 31, $8.50M for four years. Ottawa, a contender, sends a 2029 Florida first (top-10 protected, otherwise Florida's 2030 first) and Joel Armia, 81, age 34. Neutral 339 vs 356, grades A / B+. Meier, a top-line winger with term, cost two firsts and a pile of players. One hedged first and a 34-year-old is a rental price. **Absurd.**

4. **An 85 defenseman, plus a third, for a 70.** Sim 9, seed 109, 2026–27. Vancouver is rebuilding and over the cap. They send Jamie Oleksiak, 85 OVR, age 33, $5.83M for two years, and a 2028 third. San Jose, a youth club, sends Mattias Havelid, 70 OVR, age 22. Neutral 268 vs 129 (2.08×). Vancouver is graded D and San Jose is graded A+. Shedding salary can cost a pick. Attaching the pick to a player who is still an 85, and getting a 70 back, is a giveaway. **Absurd.**

5. **Five years of Dvorak for a 73.** Sim 6, seed 106, 2026–27. Philadelphia (youth, cap trouble) sends Christian Dvorak, 80 OVR, age 30, $5.15M for five years, to San Jose (rebuild) for Marc Gatcomb, 73. Neutral 179 vs 110. Philadelphia is graded D and San Jose is graded A+. A $5M fourth-line contract is a legal dump. The gap is the problem, and Philadelphia's cap-relief math is what let a D-grade deal through. **Questionable.**

6. **Schmidt for Woo.** Sim 23, seed 301, 2026–27. Utah (retool, cap trouble) sends Nate Schmidt, 82 OVR, age 35, two years, to Anaheim (youth) for Jett Woo, 73. Neutral 176 vs 110. Utah is graded C− and Anaheim is graded A+. An aging 82 is a dump candidate. The youth club is the one taking him, and the return is a 73. **Questionable.**

7. **A first and filler for four years of Mikey Anderson, and the engine says Tampa overpaid.** Sim 31, seed 403, 2027–28. Los Angeles is rebuilding and sends Mikey Anderson, 85, age 28, $4.97M for four years. Tampa, win-now, sends its 2030 first, Benson Hirst (18, 66 OVR / 79 potential), and Connor Dewar (79, walk year). Neutral 293 vs 432. Los Angeles is graded A+ and Tampa is graded C. A first for a signed top-4 is a real deadline shape. The other two pieces are scraps, and the engine still has Tampa giving almost half again as much value as it gets. **Questionable.**

8. **Moser plus a first for Pionk.** Sim 13, seed 113, 2026–27. Winnipeg (retool) sends Neal Pionk, 87, age 31, $7M for five years. Tampa (win-now, cap trouble) sends J.J. Moser, 84 / 92 potential, age 26, eight years, plus a 2028 first that is owed only if Tampa's 2027 first is protected. Neutral 340 vs 484. Winnipeg is graded A+ and Tampa is graded C−. Moser alone is a serious return for a 31-year-old. Adding a first on top is the overpay, and the grades say so. **Questionable.**

9. **A 22-year-old RFA winger for a goalie two points higher.** Sim 27, seed 305, 2027–28. The Islanders (bubble) send Arvid Soderblom, 82, age 28, cheap, two years. Colorado (contender, cap trouble) sends Gavin Brindley, 80 / 92 potential, age 22, pending RFA. Neutral 205 vs 271, grades A+ / C. Brindley is the better asset on the engine's own scale, and he is the young player. Colorado paid him for a goalie who is an 82. **Questionable.**

10. **The other Ehlers deal.** Sim 29, seed 401, 2028–29. Carolina (retool) sends Nikolaj Ehlers, 87, age 32, three years at $8.50M. Minnesota (contender) sends Nils Hoglander, 82, age 27, and Filip Kovalcik, a 19-year-old at 79 / 85. No pick. Grades A+ / C+. Three years of an 87 for an 82 and a mid prospect is light for a player who still has term. **Questionable.**

Just off that list: in sim 29 (seed 401, the 2026–27 deadline of a four-year franchise) Buffalo attached a 2029 third to Alex Lyon, an 83 goalie on a walk year, to dump him for Jakub Dobes, 70. Neutral value 146 vs 93. Letting a pending UFA walk is free. Paying a third to do it is the miss. And Jonas Brodin, 88, walk year, went from Washington to Tampa for Oskar Sundqvist, 82, and a 65-OVR prospect, with no first (sim 23). A 2026 Carlson rental of a lesser defenseman cost a first and a third.

## Root causes in the trade code

All of these are in `game/app.js`. The same functions are inlined in `game/index.html`. Nothing below was changed for this report.

**The phone is built to be a ripoff.** `P19.LOP_MIN` / `LOP_MAX` are 1.15 and 1.40 (`app.js` around line 4613). `p19Target` (around 4675) draws a target in that band. A later wrap (around 5421) forces the target back up to 1.15 even when the inner function would have eased off late in the day. `p19Pack` (around 4673) then searches the AI club's assets for a package that hits that ratio. The meter is user-value divided by AI-value, so every completed call lands between +15% and +40%. The comment above that block calls the calls "lopsided deadline calls." Counters, which these sims declined, are the path aimed at 95–105%.

**Age 30 on a retool unlocks a franchise player.** `tvTrigger` (around 5385) returns "aging star" when the club is REBUILD, YOUTH_MOVEMENT, or RETOOL and the player is at least `TVS.AGING_AGE` (30). It does not look at years remaining. Shesterkin is 33 with four years. Draisaitl is 30 with seven. Ehlers is 31 with four. Once the trigger fires, the king's-ransom test in the wrapped `aiSideScore` (around 5416) is skipped, and `aiBuild` can pay with whatever clears `aiAccept`. For Shesterkin the two young defensemen's ceilings add up to his neutral number (458 vs 444), so the grades print A− and A. The ceiling math is `tvImpactOvr` (around 5350) and the prospect value path: a 19-year-old at 81 / 88 is allowed to stand in for a large piece of a 92.

**A single first is enough for anyone the impact check calls a top-6.** `tvFirstsBlock` (around 5352) blocks a net first only when the best player coming back is under `TV.IMPACT_F` (83), and it blocks two firsts only under `TV.STAR` (87). Ehlers at 88 sails through on one protected first. There is no extra charge for term. That is why a four-year 88 and a walk-year 87 can carry the same kind of package. `tvDepth` (around 5342) does cap sub-81 players whose ceiling is under 84, which is why this sample did not spend a first on a pure depth skater. Players at 80 with a high ceiling escape that cap, which is the Brindley / Privalov pattern.

**Cap dumps skip the fairness band.** `aiAccept` (around 1768) only requires the receiver to clear a 3% margin. The neutral band is `NEUTRAL_MIN` 0.75 to `NEUTRAL_MAX` 1.33, stretched by `LOYAL_KEEP_MULT` 1.40 when a loyal player is leaving (`aiBuild`, around 1793). Dumps skip the band. The only floor is `DUMP_NEUTRAL_MIN` 0.45, and only if someone in the package has a market value of at least 80 (around 1514 and 1794). Oleksiak's 0.48 ratio still passes. `aiSideScore` (around 1767) then adds cap relief (`CAP_RELIEF_PER_M` is 9 per million) onto the dumper's "value received," so the dumper's private total can show a gain (Vancouver: 199 given, 243 received) while the hockey is a loss. `dlScore` (around 5360) is 70% neutral and 30% that own value, clamped. Neutral is lopsided enough that the published grade still says D for Vancouver and A+ for San Jose. The grade sees the problem. `aiAccept` does not use the grade.

**Everybody is allowed to shop.** `P_DEADLINE` (around 1509) is 1.0 for win-now, contender, rebuild, and cap-troubled clubs, 0.9 for retool, 0.75 for bubble, 0.35 for youth. Youth clubs still take the other side of dumps and vet swaps. `BUBBLE_KEEPS_FIRSTS` only removes a bubble club's own firsts from its pick pool (around 1764). It does not stop a bubble club from trading a young scorer for a goalie.

**The grade table rewards the winner of a 1.30× gap with an A+.** `TV.GRADES` starts at 1.30 for A+ (around 5306). A club on the good side of a 1.30–1.47 neutral gap, with its own valuation clamped into the score, prints A+ while the other side prints C or C−. That is the eleven grade-splits. The grade is reporting the gap. It is not catching it.

## Phone calls to Boston

188 calls across 32 deadline days (most days produced the engine's maximum of 6; two days ended at 5 and 3). Every call was an offer or a pitch the AI club built. Boston declined all of them.

| Meter | Calls |
|---|---:|
| Boston wins, or even | 0 |
| They win 1–14% | 0 |
| They win 15–24% | 63 |
| They win 25–34% | 74 |
| They win 35% or more | 51 |

The minimum is +15% and the maximum is +40%, which is `LOP_MIN` and `LOP_MAX` printed on the meter. The average is +28%. Tags: RIPOFF 187, OVERPAY 1 (the single call that landed on the +15% line). Call types were contender buys (51), retool buys (46), cap dumps (38), retool sells (25), hockey trades (13), rebuild sells (12), youth sells (3).

A typical low-end call, +15%, Anaheim (youth movement): Boston sends Matthew Poitras (80 / 92, age 22, cheap RFA) and receives Nick Jensen (83, age 36) plus two low prospects. A mid call, +29%, Vancouver (retool): Poitras again, for a San Jose 2027 second and Luke Schenn (84, age 36, walk year). A top-end call, +40%, Utah (contender): Boston sends a conditional 2028 first and a 79-OVR forward for Milan Sundström, 80 / 91, age 18. The asset on Boston's side is the one the AI wanted; the return is built to leave Boston 15 to 40 percent short.
