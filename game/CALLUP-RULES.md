# NHL call-up, send-down and waiver rules (plain terms)

These are the real rules as of the 2026-27 season. The 2012 CBA is still the base text. The 2020 MOU extended it, and the 2025 MOU changed a few things; that MOU took effect on Sep 16, 2026 and runs to Sep 15, 2030. Section numbers below refer to the 2012 CBA text unless the item is marked **(2026 CBA)**.

Each rule ends with a **Game:** line saying how `apply_status.py` makes the sim follow it.

Main sources:
- **CBA (2012 text).** NHL/NHLPA Collective Bargaining Agreement, https://media.nhl.com/site/asset/public/ext/CBA.pdf (local copy: `raw/docs/cba2012.pdf`, text in `raw/docs/cba2012.txt`).
- **2025 MOU summaries:**
  - Buffalo Sabres / NHL.com, "Details of the NHL's new collective bargaining agreement" (Jul 21, 2025): https://www.nhl.com/sabres/news/nhl-new-collective-bargaining-agreement-details
  - Sound of Hockey, "Key changes in the new NHL CBA" (Jul 16, 2025): https://soundofhockey.com/2025/07/16/kraken-contracts-corner-key-changes-in-the-new-nhl-cba/
  - PHR, "Post-deadline transaction restrictions" (Mar 2026): https://www.prohockeyrumors.com/2026/03/post-deadline-transaction-restrictions.html
- **Re-entry waivers removed:**
  - NHL/NHLPA 2013 Summary of Terms: https://www.nhl.com/nhl/en/v3/ext/CBA2012/NHL_NHLPA_Proposed_CBA_-_Summary_of_Terms_FINAL_-_Jan._12,_2013%20(1).pdf
  - Raw Charge, "Waivers & Entry-Level Contracts for Dummies": https://www.rawcharge.com/waivers-entry-level-contracts-for-dummies-national-hockey-league-american-hockey-league/
- **Waiver explainers:**
  - Flames Nation "CBA School: Article 13": https://flamesnation.ca/news/cba-school-article-13-waivers
  - PuckPedia "Players who must clear waivers for the first time in 2026-27": https://puckpedia.com/news/players-who-must-clear-waivers-first-time-2026-27

---

## 1. Roster size: 23 active, 20 dressed
- **Active roster (CBA 16.4).** A club may carry at most **23** players on its active roster. Players on injured reserve or LTIR don't count. To play a game it needs at least **18 skaters + 2 goalies**, which is the 20 dressed.
- **After the trade deadline** the 23-man limit no longer applies, and it stays lifted through the playoffs. Only the salary cap limits the roster then.
- **Game:**
  - The sim keeps lines' 23-active / 18-minimum checks before the deadline.
  - After the deadline and in the playoffs, the 23 limit is lifted (`csRosterMax`).

## 2. Regular recalls (call-ups)
- **Regular recalls are unlimited until the trade deadline.** A club can recall any signed player from its AHL affiliate as long as it has roster and cap room.
- **No more "paper transactions" (2026 CBA).**
  - A player sent to the AHL must actually play for the AHL club before he can be recalled. Clubs can no longer send a player down on paper overnight just to bank cap space or days.
  - Exception: moves on trade-deadline day that make players eligible for the AHL playoffs.
  - Sources: Sabres/NHL.com and Sound of Hockey above.
- **Game:**
  - A player you send down can't be recalled on the same game date. The sim doesn't play AHL games, so "after the next game day" stands in for "after one AHL game".
  - Deadline day is exempt from this.

## 3. Post-deadline recall limit: 5 (was 4)
- **The deadline (CBA 13.12(j)):** 3:00 p.m. New York time on the 40th day before the last day of the regular season.
- **After the deadline:**
  - **(2026 CBA)** a club gets **5** regular (non-emergency) recalls. The 2012 text, 13.12(l), allowed 4; the new deal adds one.
  - Emergency recalls are still unlimited.
  - Sources: PHR (Mar 2026); Sound of Hockey ("one additional post-trade-deadline player recall").
- **After the regular season (13.12(n)):** unlimited regular recalls are allowed. But at most 3 players recalled after the deadline may be on the active roster (4 if the club used all its post-deadline recalls). That text is from 2012; the 2026 summaries don't restate the playoff number.
- **No loans after the deadline (13.12(j)).** After the deadline a player can't be loaned to the minors. The exceptions:
  - a player recalled after the deadline can go back to the club he came from;
  - LTIR conditioning loans;
  - a few injury cases.
- **AHL playoff eligibility.** A player must have been on an AHL roster at the deadline to be eligible for the AHL playoffs.
- **Game:**
  - `LV2.PD_RECALLS` is 5, and the 6th regular recall after the deadline is refused.
  - After the deadline you can only send down players who were recalled after the deadline. Anyone on the NHL roster at the deadline stays up.

## 4. Emergency recalls (skaters and goalies)
- **When (13.12(m)):** injury, illness or league suspension drops a club below **2 goalies, 6 defensemen and 12 forwards** fit to play. The club may then recall players "for the duration of the emergency only". When it ends, they must be sent back promptly.
- **Allowed any time,** including after the deadline. They don't use up one of the 5 post-deadline recalls.
- **Cap:**
  - Emergency recalls count against the cap (50.10(b)).
  - **Roster Emergency exception (50.10(e)):** a club so tight that it can't fit a replacement at minimum + $100K may, from the second short-handed game on, add replacements with AAV ≤ minimum + $100K at no cap charge for the length of the emergency.
- **Goalie emergencies:**
  - The same rule covers goalies: a club with fewer than 2 healthy goalies can recall one.
  - If no goalie can get there in time, the club uses an emergency backup goalie (EBUG). **(2026 CBA)** EBUGs become club employees.
  - A club may also sign an amateur goalie to an amateur tryout (ATO) under emergency conditions (11.1(b)), or sign a goalie to a professional tryout (PTO) (11.1(c)).
- **Waivers on the way back down:** see section 7. Games played on emergency recall count toward a separate 10-game limit (13.5(ii)).
- **Game:**
  - Lines' automatic emergency recalls are kept.
  - Returning an emergency recall is free if the player is waiver exempt, or if he cleared waivers and has played fewer than 10 NHL games on emergency recall. Otherwise he goes on waivers, as the CBA requires.

## 5. The 50-contract limit
- **Limits:** a club may hold at most **50 standard player contracts (SPCs)**, NHL and AHL combined, and at most 90 players on its reserve list (signed plus unsigned draft rights).
- **Exempt from the 50:** an 18- or 19-year-old signed player who is returned to junior and hasn't played 11 NHL games that season (the "slide" players).
- **Game:**
  - The existing `AHL.CONTRACT_LIMIT` (50) is unchanged.
  - Each player's CapWages `termsSPCExempt` flag is in `status.json`.

## 6. Waiver exemption (CBA 13.4): who can be sent down freely
A player is exempt until he reaches **either** the years limit **or** the NHL-games limit, whichever comes first:

| Age when signing first SPC | Skater: years / NHL GP | Goalie: years / NHL GP |
|---|---|---|
| 18 | 5 / 160 | 6 / 80 |
| 19 | 4 / 160 | 5 / 80 |
| 20 | 3 / 160 | 4 / 80 |
| 21 | 3 / 80 | 4 / 60 |
| 22 | 3 / 70 | 4 / 60 |
| 23 | 3 / 60 | 3 / 60 |
| 24 | 2 / 60 | 2 / 60 |
| 25+ | 1 / – | 1 / – |

- **Age** is set by the calendar year (13.4 Note 2):
  - "age 19/20/21" means the player reaches that birthday in the calendar year of the Entry Draft in which he signs;
  - "age 18" means he turns 18 between Jan 1 and Sep 15 around the draft.

  In practice this is the signing-season start year minus the birth year. It matches CapWages' `waivers_age`, which we use when it's available.
- **Years for 18-19 signers:** counted from the first season of the contract. If such a player plays **11+ NHL games (regular season + playoffs)** in a season, his years limit drops to **3 (skater) / 4 (goalie)**, counting from that season.
- **Years for 20+ signers:** start in the first season he plays a professional game (NHL, AHL/ECHL, or Europe on loan) while signed to an NHL SPC.
- **NHL games** include regular season and playoffs.
- **25+ signers** are exempt only for the rest of their first pro season.
- **Game:**
  - Every real player carries his real status (CapWages flag, cross-checked with CapSpace and the 13.4 calculation).
  - In-sim NHL games and seasons are added on top, so the exemption expires on schedule: by GP during a season, or by years at rollover, including the 11-GP reduction.
  - Players with no data (generated or in-game signings) get the 13.4 calculation from their age at signing.

## 7. Waivers: period, priority and expiry
- **Who needs waivers:** any non-exempt player being loaned to the minors needs **regular waivers**.
- **Period (13.18):**
  - Waiver requests are processed at **noon New York time**, and the waiver period is **24 hours**.
  - The playing-season waiver period starts 12 days before the regular season.
- **Claim priority (13.19):**
  - The club with the **lowest points percentage at the time of the request** gets priority.
  - **Before November 1** (and outside the season), the **previous season's final standings** decide.
- **After a claim (13.20):**
  - The claiming club takes over the contract as is.
  - A claimed player **can't be traded until the end of that season's playoffs** unless he is first offered on the same terms to the other clubs that claimed him.
- **Waiver expiry (13.2(b), 13.5).** A player who cleared waivers can be loaned again **without** new waivers until either of these happens:
  - he plays **10 NHL games** (cumulative) or spends **30 days** (cumulative) on the NHL roster since clearing;
  - **or** he plays **10 NHL games on emergency recall**, which is counted separately.

  After that he must clear again. Clearance during the playing-season waiver period counts, which is why players who cleared in training camp can shuttle early in the season.
- **Re-entry waivers are abolished.** Under the old rules, a claim on a player being recalled cost the claiming club half his salary. The 2013 CBA removed them; see the Summary of Terms and Raw Charge.
- **Game:**
  - `lv2SendDown`, `ahlSendDown` and the recall prompt now use real exemption plus the 30-day / 10-GP window.
  - Waiver-required players who start a season in the AHL are treated as having cleared in camp.
  - Before Nov 1, claim priority uses the previous season's points %: the real 2025-26 final standings in season 1, and a stored snapshot afterwards.
  - Tags read **EXEMPT**, **CLEARED** (no re-waivers needed) or **WAIVERS**.

## 8. Conditioning loans
- **13.8:** with the player's consent, a club may loan a player to the minors for conditioning for up to **14 days**, with no waivers. He stays on the NHL roster for cap purposes.
- **13.9:** a player coming off LTIR can go on a conditioning loan of up to **6 days / 3 games**.
- **Game:** not modelled as a separate move. Injured players return directly, as before.

## 9. Buried contracts: cap charge when a player is in the AHL (CBA 50.5(d)(i)(B))
- **One-way contract (B)(6):** the cap charge that stays is the **cap hit minus (league minimum + $375,000)**. In 2026-27 the minimum is $850K, so anything above **$1,225,000** stays on the NHL cap.
  - Example: Alex Steeves, $1.625M one-way, leaves **$400K** on Boston's cap. CapSpace shows exactly that.
- **Two-way contract (B)(7):** only the **minor-league salary (or the guaranteed amount, if higher) above minimum + $375K** counts. That is almost always **$0**.
- **35+ contract (B)(5):** for a multi-year deal signed at 35 or older, from year 2 on, everything above **$100,000** stays on the cap even when he is in the minors.
- **Minimum salary (2026 CBA):** $850K (26-27), $900K (27-28), $950K (28-29), $1.0M (29-30). The buried allowance moves with it.
- **Game:**
  - `lv2SetBuried` now applies the rule for the player's contract type.
  - AI clubs' AHL players get their buried charge each season.
  - Your club's season-1 real payroll reference isn't charged twice.

## 10. Other 2026 CBA changes that touch rosters
- **LTIR:** relief for the replacement is capped at the previous season's league-average salary, unless the injured player is out for the rest of the season and playoffs.
- **Playoffs:** a salary cap applies in the playoffs to the 20 dressed players.
- **Schedule:** the regular season goes to 84 games, starting 2026-27.
- **Unchanged:** the waiver exemption table and claim rules.
