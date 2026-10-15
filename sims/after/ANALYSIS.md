# Deadline trades after the sanity pass

Same 32 Boston franchises, same seeds (101–114 for one season, 201–208 for two, 301–306 for three, 401–404 for four). The rater is the same one that scored the before log against `ref/MARKET.md`.

## Before / after

| | Before | After |
|---|---:|---:|
| AI-to-AI deadline trades | 436 | 366 |
| Realistic | 390 | 366 |
| Questionable | 42 | 0 |
| Absurd | 4 | 0 |
| Trades that move a star (engine star, or 90+ OVR) | 3 | 2 |
| Trades that move a 1st | 17 | 14 |
| Trades that move two 1sts | 1 | 1 |
| Lopsided deals (neutral skew 1.30 or worse) | 38 | 2 |
| Same-season repeat of a player | (flips inside one deadline) | 0 |
| Incoming calls to Boston | 188 | 192 |

Phone calls stayed in the calling club's favour all day: after the change the meter runs from +15% to +40% (mean +27%). 191 calls are tagged RIPOFF and 1 is tagged OVERPAY, and that OVERPAY call is exactly +15% (ratio 1.15), which is the floor. None favour Boston.

The two deals still past a 1.30 neutral skew are cap dumps. In both, the club shedding the contract also sends a prospect, and the club taking the salary is the side graded higher.

Cross-sim name counts (a player can still show up in different franchises):

| Player | Before | After |
|---|---:|---:|
| J.J. Moser | 5 | 1 |
| Juraj Slafkovsky | 5 | 0 |
| Jamie Oleksiak | 4 | 0 |
| Wyatt Johnston | 3 | 1 |
| Nikolaj Ehlers | 2 | 0 |
| Teddy Blueger | 8 | 4 |
| Troy Stecher | 5 | 4 |
| Brandon Tanev | 5 | 1 |
| Igor Shesterkin | 1 | 0 |
| Leon Draisaitl | 1 | 0 |

No player who was traded or acquired in a season was moved again in that same season.

## What still moves

Two stars moved, both at a price the market recognizes.

- New Jersey (win-now) acquired Artemi Panarin, 92 OVR, age 35, walk year, from the Rangers for a 2030 first and Anthony Mantha, 82, also a walk year. An elite rental for about one first.
- Minnesota (win-now) acquired Sam Reinhart, 92 OVR, age 31, five years at $8.65M, franchise tag, for Minnesota's 2029 and 2030 firsts plus Sam Poulin. That is the only two-first package in the sample, and it is a king's ransom for a signed 92.

Shesterkin (four years left, no cap trouble), Slafkovsky-for-Doughty, both Ehlers term deals, and the Oleksiak dump for Havelid are gone.

## Closest five that remain

All five are rated realistic. They are the widest neutral gaps left in the log.

1. **Sourdif dump.** Sim 28, seed 306, 2027–28. Washington (contender, cap trouble) sends Justin Sourdif, 68 OVR, age 25, $6.35M for two years, and prospect Bryson Roberts (67/76) to Vancouver (rebuild). Vancouver sends Casey Cizikas, 81, age 36, walk year. Neutral 135 vs 91, grades C+ / A+. The taker receives the prospect and the better grade. Washington is paying a real piece to get out of a buried contract.

2. **Greaves dump.** Sim 29, seed 401, 2027–28. St. Louis (win-now, cap trouble) sends Jet Greaves, 73 OVR, age 26, $5M for two years, and prospect Adam Jecho (70/84) to San Jose (rebuild). San Jose sends Laurent Brossoit, 82, age 34, two years. Neutral 224 vs 170, grades B / A+. Same shape: the sweetener goes to the club absorbing the salary.

3. **Johnston for Barron.** Sim 30, seed 402, 2027–28. Dallas (bubble, cap trouble) sends Wyatt Johnston, 83/94, age 24, three years, to Anaheim (youth) for Justin Barron, 81/89, age 25, one year, and a 2029 fourth. Neutral 292 vs 230, grades B / A. Dallas is a bubble club in cap trouble, so the young-core hold on contenders and retool clubs does not cover him. The return is a similar-age defenseman, and the gap sits on the 1.27 line.

4. **Gaudette package for Samuelsson.** Sim 16, seed 202, 2026–27. San Jose (retool) sends Adam Gaudette, 81, walk year, plus a second, a third and a fourth, to Buffalo (youth, cap trouble) for Mattias Samuelsson, 82/90, age 26, four years. Neutral 288 vs 227, grades C+ / A. Buffalo is the capped club moving the longer contract; San Jose is paying picks to get the younger defenseman.

5. **Roslovic for Soderblom.** Sim 25, seed 303, 2027–28. Toronto sends Jack Roslovic, 83, walk year, plus two depth prospects, to Montreal for Arvid Soderblom, 82, age 28, two years. Neutral values sit at 1.27, grades B− / A. A walk-year winger and spare prospects for a signed goalie, inside the band.

## What the block changes

The new rules live in one wrapper block at the end of the trade-value section in `game/app.js` (`DEADLINE SANITY v10.3.1`). `index.html` inlines that file once. Boston's phone target is still drawn from 115–140% and floored at 115% for the whole day. Counters, the two-first cap, the Center bonus, and pick values are unchanged.
