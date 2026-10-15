/* Rate logged v10.3 deadline trades against ref/MARKET.md. Reads sims/raw/sim-*.json. */
const fs = require('fs');
const path = require('path');

const DIR = process.argv[2] ? path.resolve(process.argv[2]) : __dirname;
const RAW = path.join(DIR, 'raw');
const OUT = DIR;

function money(n) {
  n = Number(n) || 0;
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(2).replace(/\.00$/, '') + 'M';
  if (n >= 1e3) return '$' + Math.round(n / 1e3) + 'k';
  return '$' + n;
}
function csv(v) {
  const s = v == null ? '' : String(v);
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}
function assets(list) { return Array.isArray(list) ? list.filter(Boolean) : []; }
function isPick(a) { return a && (a.kind === 'pick' || a.round); }
function isPlayer(a) { return a && !isPick(a); }
function ovr(a) { return Number(a && a.ovr) || 0; }
function age(a) { return Number(a && a.age) || 0; }
function pot(a) { return Number(a && a.pot) || ovr(a); }
function years(a) { return Number(a && a.years) || 0; }
function firsts(list) { return assets(list).filter(a => isPick(a) && Number(a.round) === 1); }
function stars(list) { return assets(list).filter(a => isPlayer(a) && (a.star || a.franchise || ovr(a) >= 90)); }
function impact(a) {
  if (!isPlayer(a)) return false;
  if (a.star || a.franchise || ovr(a) >= 90) return true;
  if (a.pos === 'D' || a.pos === 'G') return ovr(a) >= 83;
  return ovr(a) >= 83;
}
function blueChip(a) {
  // Established young NHL piece, not an AHL flier. Market: Newhook / Peterka class.
  if (!isPlayer(a)) return false;
  if (impact(a)) return true;
  return age(a) <= 23 && ovr(a) >= 78 && pot(a) >= 86;
}
function depth(a) {
  if (!isPlayer(a)) return false;
  if (a.depth) return true;
  if (a.kind === 'prospect' || a.group === 'prospect' || a.group === 'reserve') return ovr(a) < 78 && pot(a) < 86;
  return ovr(a) < 81 && pot(a) < 86;
}
function rental(a) { return !!(a && (a.rental || String(a.fa || '').indexOf('pending UFA') >= 0)); }
function fmtAsset(a) {
  if (!a) return '';
  if (isPick(a)) {
    const cond = (a.conditions || []).filter(c => c && !c.resolved && c.text).map(c => c.text);
    const extra = cond.length ? ' [' + cond.join('; ') + ']' : (a.condition ? ' [' + a.condition + ']' : '');
    return a.year + ' R' + a.round + ' orig ' + (a.origin || '?') + extra;
  }
  const fa = a.fa ? ', ' + a.fa : '';
  const tag = a.franchise ? ' FRANCHISE' : a.star ? ' STAR' : a.depth ? ' depth' : '';
  return a.name + ' ' + (a.pos || '') + ' ' + ovr(a) + '/' + pot(a) + ' age ' + age(a) + ' ' + money(a.capHit) + ' x ' + years(a) + 'y' + fa + tag + (a.kind === 'prospect' || a.group === 'prospect' || a.group === 'reserve' ? ' (prospect)' : '');
}
function fmtList(list) { return assets(list).map(fmtAsset).join(' + ') || '(nothing)'; }

function sideFlags(role, gave, got, capTrouble) {
  const flags = [];
  const g1 = firsts(gave), r1 = firsts(got);
  const net1 = g1.length - r1.length;
  const gotPlayers = assets(got).filter(isPlayer);
  const gavePlayers = assets(gave).filter(isPlayer);
  const bestGot = gotPlayers.reduce((m, a) => Math.max(m, ovr(a)), 0);
  const gotStar = stars(got).length;
  const gaveStar = stars(gave);
  const gotImpact = gotPlayers.some(impact) || gotPlayers.some(blueChip);
  const gotOnlyDepth = gotPlayers.length > 0 && gotPlayers.every(depth) && g1.length > 0 && !gotImpact;
  const buyer = role === 'WIN_NOW' || role === 'CONTENDER' || role === 'BUBBLE';
  const seller = role === 'REBUILD' || role === 'YOUTH_MOVEMENT' || role === 'RETOOL';

  if (net1 >= 1 && !gotImpact && !gotStar) {
    const young = gotPlayers.some(a => age(a) <= 24 && pot(a) >= 86 && ovr(a) >= 76);
    if (!young) flags.push({ level: 'absurd', code: 'first-for-non-impact', text: role + ' gave ' + net1 + ' first-round pick' + (net1 > 1 ? 's' : '') + ' without getting a top-6/top-4 player or a real young NHL piece back (best player ' + (bestGot || 'none') + ' OVR)' });
  } else if (net1 >= 2 && !gotStar && bestGot < 88) {
    flags.push({ level: 'absurd', code: 'two-firsts-no-star', text: role + ' gave two 1sts without a star coming back' });
  } else if (net1 >= 1 && gotPlayers.some(depth) && !gotPlayers.some(a => ovr(a) >= 83)) {
    flags.push({ level: 'questionable', code: 'first-for-borderline', text: role + ' spent a 1st on a player short of a top-6/top-4' });
  }
  if (gotOnlyDepth) flags.push({ level: 'absurd', code: 'first-for-depth', text: role + ' moved a 1st for depth' });

  gaveStar.forEach(p => {
    const haul1 = g1.length === 0 && r1.length;
    const coming = stars(got).length;
    const firstsBack = r1.length;
    const realBack = gotPlayers.filter(a => ovr(a) >= 80).length;
    if (p.franchise && !rental(p) && years(p) >= 2 && coming === 0 && firstsBack < 2) {
      flags.push({ level: 'absurd', code: 'franchise-cheap', text: role + ' moved franchise player ' + p.name + ' (' + ovr(p) + ' OVR, age ' + age(p) + ', ' + years(p) + 'y) without two 1sts or a star coming back' });
    } else if ((p.star || ovr(p) >= 90) && !rental(p) && coming === 0 && firstsBack < 1 && realBack === 0) {
      flags.push({ level: 'absurd', code: 'star-cheap', text: role + ' moved ' + p.name + ' (' + ovr(p) + ') for a package with no 1st and no real NHL player' });
    } else if ((p.star || ovr(p) >= 90) && rental(p) && firstsBack === 0 && bestGot < 84) {
      flags.push({ level: 'questionable', code: 'rental-star-cheap', text: 'Star rental ' + p.name + ' moved without a 1st' });
    }
    if (buyer && (p.star || p.franchise) && !capTrouble && !rental(p) && coming === 0) {
      flags.push({ level: 'questionable', code: 'contender-sells-star', text: role + ' sold ' + p.name + ' for futures while trying to win' });
    }
  });

  // Depth-for-depth (a 78 for an 82) is normal deadline churn. A rebuilder or youth club
  // is acting against its role only when it spends a 1st, a real young NHLer, or a blue-chip
  // to take on a 30-year-old.
  if (role === 'REBUILD' || role === 'YOUTH_MOVEMENT') {
    const boughtVet = gotPlayers.filter(a => age(a) >= 30 && years(a) >= 2 && ovr(a) >= 83 && !rental(a));
    boughtVet.forEach(vet => {
      const close = gavePlayers.some(a => ovr(a) >= 78 && Math.abs(ovr(a) - ovr(vet)) <= 3);
      if (close) return;
      const spentChip = gavePlayers.some(a => age(a) <= 23 && ovr(a) >= 78 && pot(a) >= 86);
      const spentYoungNhl = gavePlayers.some(a => ovr(a) >= 83 && age(a) <= age(vet) - 4);
      if (net1 > 0 || spentChip || spentYoungNhl) {
        flags.push({ level: 'questionable', code: 'rebuilder-buys-vet', text: role + ' spent a 1st or a real young player on ' + vet.name + ' (' + age(vet) + ', ' + years(vet) + 'y, ' + ovr(vet) + ' OVR)' });
      }
    });
  }
  if (role === 'REBUILD' && net1 > 0 && !capTrouble) {
    flags.push({ level: 'absurd', code: 'rebuild-spends-first', text: 'REBUILD spent a 1st at the deadline' });
  }
  if (role === 'YOUTH_MOVEMENT' && net1 > 0) {
    flags.push({ level: 'questionable', code: 'youth-spends-first', text: 'YOUTH_MOVEMENT spent a 1st (the engine is supposed to keep 1sts and 2nds)' });
  }
  if (role === 'BUBBLE' && net1 > 0 && !gotImpact) {
    flags.push({ level: 'absurd', code: 'bubble-first-depth', text: 'BUBBLE gave a 1st and did not get an impact player' });
  }
  if ((role === 'WIN_NOW' || role === 'CONTENDER') && net1 > 0 && gotPlayers.length && gotPlayers.every(a => ovr(a) < 81 && pot(a) < 86)) {
    flags.push({ level: 'absurd', code: 'contender-first-depth', text: role + ' gave a 1st for a depth player' });
  }
  return flags;
}

function rateTrade(t) {
  const gaveA = assets(t.giveA), gaveB = assets(t.giveB);
  const flags = [];
  flags.push.apply(flags, sideFlags(t.roleA, gaveA, gaveB, t.capA).map(f => Object.assign({ side: t.teamA }, f)));
  flags.push.apply(flags, sideFlags(t.roleB, gaveB, gaveA, t.capB).map(f => Object.assign({ side: t.teamB }, f)));
  const mA = Number(t.marketA) || 0, mB = Number(t.marketB) || 0;
  const ratio = mA > 0 ? mB / mA : (mB > 0 ? 99 : 1);
  const skew = Math.max(ratio, 1 / Math.max(ratio, 0.01));
  const dump = t.type === 'cap dump' || t.type === 'floor salary';
  // The engine's own accept band is 0.75–1.33, stretched further for loyalty. A gap past ~1.30
  // is already a bad deadline swap; past 1.70 it is no longer a hockey trade.
  if (!dump && skew >= 1.70) flags.push({ level: 'absurd', code: 'neutral-gap', side: '', text: 'Neutral values ' + mA + ' vs ' + mB + ' (ratio ' + ratio.toFixed(2) + '), past what a deadline swap should clear' });
  else if (!dump && skew >= 1.30) flags.push({ level: 'questionable', code: 'neutral-gap', side: '', text: 'Neutral values ' + mA + ' vs ' + mB + ' (ratio ' + ratio.toFixed(2) + ')' });
  // In a dump the cap-troubled club is the one shedding the contract. That package is
  // usually the higher neutral value; the player coming back is the cheap contract.
  const shed = (t.capA && !t.capB) ? gaveA : (t.capB && !t.capA) ? gaveB : (mA >= mB ? gaveA : gaveB);
  const back = shed === gaveA ? gaveB : gaveA;
  const shedPlayers = assets(shed).filter(isPlayer);
  const backBest = assets(back).filter(isPlayer).reduce((m, a) => Math.max(m, ovr(a)), 0);
  const usefulDump = shedPlayers.filter(a => !rental(a) && ovr(a) >= 84 && years(a) >= 2);
  if (dump && usefulDump.length && backBest < 78) {
    const attached = assets(shed).some(isPick);
    flags.push({ level: (attached || skew >= 2) ? 'absurd' : 'questionable', code: 'dump-useful', side: '', text: 'Cap dump of ' + usefulDump.map(p => p.name + ' (' + ovr(p) + ' OVR, ' + years(p) + 'y)').join(', ') + ' for a best player of ' + (backBest || 'none') + ' OVR' + (attached ? ', with a pick attached' : '') });
  } else if (dump && shedPlayers.some(a => !rental(a) && ovr(a) >= 82 && years(a) >= 2) && backBest < 76) {
    flags.push({ level: 'questionable', code: 'dump-nhler', side: '', text: 'Cap dump sent a real NHL player (' + shedPlayers.filter(a => ovr(a) >= 82).map(p => p.name + ' ' + ovr(p)).join(', ') + ') for ' + (backBest || 'nothing') + ' OVR' });
  } else if (dump && skew >= 1.55 && shedPlayers.some(a => years(a) >= 4 && ovr(a) >= 78)) {
    flags.push({ level: 'questionable', code: 'dump-gap', side: '', text: 'Multi-year contract dumped at ' + ratio.toFixed(2) + 'x neutral value (' + mA + ' vs ' + mB + ')' });
  } else if (dump && assets(shed).some(isPick) && shedPlayers.some(a => rental(a) && ovr(a) >= 80) && backBest < 75) {
    flags.push({ level: 'questionable', code: 'sweetener-on-rental', side: '', text: 'A pick was attached to dump a pending UFA (' + shedPlayers.filter(a => rental(a) && ovr(a) >= 80).map(p => p.name).join(', ') + ') whose contract was about to end' });
  }
  function gradePoor(g) {
    if (!g) return false;
    const c = String(g).charAt(0);
    return c === 'C' && g !== 'C+' || c === 'D' || c === 'F';
  }
  if ((t.gradeA === 'A+' && gradePoor(t.gradeB)) || (t.gradeB === 'A+' && gradePoor(t.gradeA))) {
    flags.push({ level: 'questionable', code: 'grade-split', side: '', text: 'Grades ' + t.gradeA + ' / ' + t.gradeB });
  }

  // Hockey-shape checks that are not role-specific.
  // A premium asset is a 1st, or any 84+ NHL player (Nelson at 35 still counts; Armia at 81 does not).
  function premiums(list) {
    let n = firsts(list).length;
    assets(list).filter(isPlayer).forEach(a => {
      if (ovr(a) >= 84) n++;
    });
    return n;
  }
  const all1 = firsts(gaveA).length + firsts(gaveB).length;
  const allStars = stars(gaveA).concat(stars(gaveB));
  const allPlayers = assets(gaveA).concat(assets(gaveB)).filter(isPlayer);
  if (all1 >= 3) flags.push({ level: 'absurd', code: 'three-firsts', side: '', text: all1 + ' first-round picks in one deadline deal (the engine claims a two-1st cap)' });
  allPlayers.forEach(p => {
    const leavingA = assets(gaveA).indexOf(p) >= 0;
    const coming = leavingA ? gaveB : gaveA;
    const backStars = stars(coming).length;
    const back1 = firsts(coming).length;
    const backPlayers = assets(coming).filter(isPlayer);
    const backReal = backPlayers.filter(a => ovr(a) >= 82).length;
    const best = backPlayers.reduce((m, a) => Math.max(m, ovr(a)), 0);
    const youngTop = backPlayers.some(a => ovr(a) >= 84 && age(a) <= 30);
    const prem = premiums(coming);
    if ((p.star || p.franchise || ovr(p) >= 90) && !rental(p) && years(p) >= 3 && backStars === 0 && back1 < 2 && ovr(p) >= 93) {
      flags.push({ level: 'absurd', code: 'elite-term-cheap', side: '', text: p.name + ' (' + ovr(p) + ' OVR, ' + years(p) + ' years left) moved without a star or two 1sts' });
    } else if ((p.star || p.franchise || ovr(p) >= 90) && !rental(p) && backStars === 0 && back1 === 0 && backReal === 0 && ovr(p) >= 90) {
      flags.push({ level: 'absurd', code: 'star-for-scraps', side: '', text: p.name + ' moved for scraps' });
    }
    // High-80s player with term is a Meier/Rantanen price, not a rental price.
    // A same-age 84+ coming back is a real hockey return; an 82 and a flier is only light.
    if (!rental(p) && years(p) >= 3 && ovr(p) >= 87 && backStars === 0 && prem < 2 && !youngTop && !(p.franchise && years(p) >= 2 && back1 < 2)) {
      const established = backPlayers.some(a => ovr(a) >= 80 && age(a) <= 28 && pot(a) >= 88 && a.kind !== 'prospect' && a.group !== 'prospect');
      flags.push({
        level: established ? 'questionable' : 'absurd',
        code: established ? 'term-light' : 'term-priced-like-rental',
        side: '',
        text: p.name + ' (' + ovr(p) + ' OVR, age ' + age(p) + ', ' + years(p) + 'y' + (rental(p) ? ', rental' : '') + ') moved for ' + (prem === 0 ? 'no premium asset' : 'one premium asset') + ' (best player back ' + (best || 'none') + ' OVR)'
      });
    }
    if (!rental(p) && age(p) <= 29 && years(p) >= 4 && ovr(p) >= 87 && backStars === 0 && prem < 2 && best <= ovr(p) - 3) {
      flags.push({ level: 'questionable', code: 'young-core-light', side: '', text: p.name + ' (' + ovr(p) + ' OVR, age ' + age(p) + ', ' + years(p) + 'y) is a young core piece and the best player back is ' + best + ' OVR' });
    }
    if ((rental(p) || years(p) <= 1) && ovr(p) >= 87 && back1 === 0 && best < 85 && backStars === 0) {
      flags.push({ level: 'questionable', code: 'elite-rental-no-first', side: '', text: 'Elite rental ' + p.name + ' (' + ovr(p) + ' OVR) moved without a 1st (best player back ' + (best || 'none') + ' OVR). A 2026 Carlson-type rental cost a 1st.' });
    }
    if (!rental(p) && years(p) >= 2 && years(p) <= 2 && age(p) >= 33 && ovr(p) >= 87 && back1 === 0 && best < 82 && backStars === 0) {
      flags.push({ level: 'questionable', code: 'short-term-star-cheap', side: '', text: p.name + ' (' + ovr(p) + ' OVR, age ' + age(p) + ', ' + years(p) + 'y) moved without a 1st or an 82+ player' });
    }
    const role = leavingA ? t.roleA : t.roleB;
    const cap = leavingA ? t.capA : t.capB;
    const buyer = role === 'WIN_NOW' || role === 'CONTENDER' || role === 'BUBBLE';
    const seller = role === 'REBUILD' || role === 'RETOOL' || role === 'YOUTH_MOVEMENT';
    if (buyer && !cap && age(p) <= 25 && ovr(p) >= 85 && years(p) >= 4 && backStars === 0 && back1 === 0) {
      const head = backPlayers.slice().sort((a, b) => ovr(b) - ovr(a))[0];
      if (head && (rental(head) || years(head) <= 1 || age(head) >= 36)) {
        flags.push({ level: 'absurd', code: 'contender-rents-with-youth', side: '', text: role + ' traded ' + p.name + ' (' + ovr(p) + ' OVR, age ' + age(p) + ', ' + years(p) + 'y) for ' + head.name + ' (' + ovr(head) + ' OVR, age ' + age(head) + ', ' + years(head) + 'y)' });
      } else if (head && years(head) <= 2 && ovr(head) <= ovr(p) + 1 && age(head) > age(p)) {
        flags.push({ level: 'questionable', code: 'sold-term-for-shorter', side: '', text: role + ' traded ' + p.name + ' (' + age(p) + ', ' + years(p) + ' years left) for ' + head.name + ' (' + age(head) + ', ' + years(head) + ' years left)' });
      }
    }
    const seconds = assets(coming).filter(a => isPick(a) && Number(a.round) <= 2).length;
    if (seller && !rental(p) && age(p) <= 32 && ovr(p) >= 85 && years(p) >= 3 && backStars === 0 && back1 === 0 && best > 0 && best <= ovr(p) - 4 && seconds === 0) {
      flags.push({ level: 'questionable', code: 'retool-light', side: '', text: role + ' moved ' + p.name + ' (' + ovr(p) + ' OVR, age ' + age(p) + ', ' + years(p) + 'y) and the best player back is ' + best + ' OVR, with no 1st or 2nd' });
    }
  });

  let rating = 'realistic';
  if (flags.some(f => f.level === 'absurd')) rating = 'absurd';
  else if (flags.some(f => f.level === 'questionable')) rating = 'questionable';
  const maxOvr = allPlayers.reduce((m, a) => Math.max(m, ovr(a)), 0);
  const franchiseOut = allPlayers.some(p => p.franchise);
  const weight = flags.reduce((n, f) => n + (f.level === 'absurd' ? 5 : 2), 0)
    + (rating === 'absurd' ? Math.max(0, maxOvr - 84) : 0)
    + (rating === 'absurd' && franchiseOut ? 6 : 0)
    + Math.round(skew * 10) / 50;
  return { rating, flags, ratio, weight, firsts: all1, stars: allStars.map(p => p.name + ' ' + ovr(p)) };
}

function loadSims() {
  return fs.readdirSync(RAW).filter(f => /^sim-\d+\.json$/.test(f)).sort().map(f => JSON.parse(fs.readFileSync(path.join(RAW, f), 'utf8')));
}

function flatten(sims) {
  const trades = [], calls = [];
  sims.forEach(sim => {
    const dl = sim.deadline || {};
    const pack = (t, interactive) => {
      const rated = rateTrade(t);
      trades.push(Object.assign({
        sim: sim.n, seed: sim.seed, seasons: sim.seasons, interactive: interactive ? 'yes' : 'no',
        games: interactive ? (dl.played && dl.played.games) : '',
        schedule: interactive ? (dl.played && dl.played.source) : ''
      }, t, rated));
    };
    (dl.earlierTrades || []).forEach(t => pack(t, false));
    (dl.trades || []).forEach(t => pack(t, true));
    (dl.calls || []).forEach(c => calls.push(Object.assign({ sim: sim.n, seed: sim.seed, seasons: sim.seasons, season: dl.label, date: dl.date }, c)));
  });
  return { trades, calls };
}

function hist(calls) {
  const buckets = { 'you win 10%+': 0, 'you win 1-9%': 0, 'even': 0, 'they win 1-14%': 0, 'they win 15-24%': 0, 'they win 25-34%': 0, 'they win 35%+': 0, 'no meter': 0 };
  const tags = {};
  calls.forEach(c => {
    const m = c.meter;
    if (!m) { buckets['no meter']++; return; }
    tags[m.tag] = (tags[m.tag] || 0) + 1;
    const p = m.pct;
    if (p <= -10) buckets['you win 10%+']++;
    else if (p < 0) buckets['you win 1-9%']++;
    else if (p === 0) buckets['even']++;
    else if (p < 15) buckets['they win 1-14%']++;
    else if (p < 25) buckets['they win 15-24%']++;
    else if (p < 35) buckets['they win 25-34%']++;
    else buckets['they win 35%+']++;
  });
  return { buckets, tags };
}

function writeCsv(trades) {
  const cols = ['sim','seed','seasons','season','seasonIndex','date','interactive','games','type','banner','why','teamA','teamAName','roleA','capA','teamB','teamBName','roleB','capB','a_sends','b_sends','valueA_give','valueA_get','valueB_give','valueB_get','marketA','marketB','neutral_ratio_B_over_A','gradeA','gradeB','scoreA','scoreB','stars','firsts','rating','flags'];
  const lines = [cols.join(',')];
  trades.forEach(t => {
    const row = {
      sim: t.sim, seed: t.seed, seasons: t.seasons, season: t.season, seasonIndex: t.seasonIndex, date: t.date,
      interactive: t.interactive, games: t.games, type: t.type, banner: t.banner, why: t.why,
      teamA: t.teamA, teamAName: t.teamAName, roleA: t.roleA, capA: t.capA ? 'yes' : 'no',
      teamB: t.teamB, teamBName: t.teamBName, roleB: t.roleB, capB: t.capB ? 'yes' : 'no',
      a_sends: fmtList(t.giveA), b_sends: fmtList(t.giveB),
      valueA_give: t.valueA && t.valueA.give, valueA_get: t.valueA && t.valueA.get,
      valueB_give: t.valueB && t.valueB.give, valueB_get: t.valueB && t.valueB.get,
      marketA: t.marketA, marketB: t.marketB, neutral_ratio_B_over_A: t.ratio.toFixed(3),
      gradeA: t.gradeA, gradeB: t.gradeB, scoreA: t.scoreA, scoreB: t.scoreB,
      stars: (t.stars || []).join('; '), firsts: t.firsts, rating: t.rating,
      flags: (t.flags || []).map(f => f.text).join(' | ')
    };
    lines.push(cols.map(c => csv(row[c])).join(','));
  });
  fs.writeFileSync(path.join(OUT, 'deadline-trades.csv'), lines.join('\n') + '\n');
}

function writeCalls(calls) {
  const cols = ['sim','seed','seasons','season','date','clock','type','team','teamName','role','player','line','dealType','bos_sends','bos_gets','youSend','youGet','ratio','meter_pct','meter_phrase','tag'];
  const lines = [cols.join(',')];
  calls.forEach(c => {
    const m = c.meter || {};
    const row = {
      sim: c.sim, seed: c.seed, seasons: c.seasons, season: c.season, date: c.date, clock: c.clock,
      type: c.type, team: c.team, teamName: c.teamName, role: c.role, player: c.player, line: c.line, dealType: c.dealType,
      bos_sends: fmtList(c.give), bos_gets: fmtList(c.get),
      youSend: m.youSend, youGet: m.youGet, ratio: m.ratio, meter_pct: m.pct, meter_phrase: m.phrase, tag: m.tag
    };
    lines.push(cols.map(k => csv(row[k])).join(','));
  });
  fs.writeFileSync(path.join(OUT, 'deadline-calls.csv'), lines.join('\n') + '\n');
}

function mdTrade(t, i) {
  const lines = [];
  lines.push('### ' + (i + 1) + '. ' + t.teamA + ' (' + t.roleA + (t.capA ? ', cap trouble' : '') + ') — ' + t.teamB + ' (' + t.roleB + (t.capB ? ', cap trouble' : '') + ')');
  lines.push('');
  lines.push('Sim ' + t.sim + ' · seed ' + t.seed + ' · franchise played to year ' + t.seasons + ' · ' + t.season + ' · ' + t.date + (t.interactive === 'yes' ? ' · deadline day Boston stopped on' : ' · deadline crossed on the way there') + ' · **' + t.rating + '**');
  lines.push('');
  lines.push('- **' + t.teamAName + ' sends:** ' + fmtList(t.giveA));
  lines.push('- **' + t.teamBName + ' sends:** ' + fmtList(t.giveB));
  lines.push('- Engine value (own give/get): ' + t.teamA + ' ' + (t.valueA && t.valueA.give) + '/' + (t.valueA && t.valueA.get) + ', ' + t.teamB + ' ' + (t.valueB && t.valueB.give) + '/' + (t.valueB && t.valueB.get));
  lines.push('- Neutral market: ' + t.marketA + ' vs ' + t.marketB + ' (B/A ' + t.ratio.toFixed(2) + ')');
  lines.push('- Grades: ' + t.teamA + ' **' + t.gradeA + '** (' + t.scoreA + '), ' + t.teamB + ' **' + t.gradeB + '** (' + t.scoreB + ')');
  lines.push('- Banner: ' + t.banner);
  lines.push('- AI reason: ' + t.why);
  lines.push('- Wire: ' + t.text);
  if (t.flags && t.flags.length) lines.push('- Flags: ' + t.flags.map(f => f.level + ' — ' + f.text).join('; '));
  lines.push('');
  return lines.join('\n');
}

function summarize(trades, calls, sims) {
  const by = { realistic: 0, questionable: 0, absurd: 0 };
  trades.forEach(t => { by[t.rating] = (by[t.rating] || 0) + 1; });
  const with1 = trades.filter(t => t.firsts > 0);
  const withStar = trades.filter(t => t.stars && t.stars.length);
  const two1 = trades.filter(t => t.firsts >= 2);
  const codes = {};
  trades.forEach(t => (t.flags || []).forEach(f => { codes[f.code] = (codes[f.code] || 0) + 1; }));
  const roles = {};
  trades.forEach(t => { roles[t.roleA] = (roles[t.roleA] || 0) + 1; roles[t.roleB] = (roles[t.roleB] || 0) + 1; });
  return { by, with1, withStar, two1, codes, roles, nSims: sims.length, nOk: sims.filter(s => s.deadline && s.deadline.ok).length, calls: hist(calls) };
}

function main() {
  const sims = loadSims();
  const { trades, calls } = flatten(sims);
  trades.sort((a, b) => a.sim - b.sim || a.seasonIndex - b.seasonIndex || a.id - b.id);
  writeCsv(trades);
  writeCalls(calls);
  const sum = summarize(trades, calls, sims);
  const worst = trades.slice().sort((a, b) => b.weight - a.weight || b.firsts - a.firsts).slice(0, 10);
  const payload = { sum, worst: worst.map(t => ({ sim: t.sim, text: t.text, rating: t.rating, weight: t.weight, flags: t.flags, gradeA: t.gradeA, gradeB: t.gradeB, marketA: t.marketA, marketB: t.marketB, type: t.type, roleA: t.roleA, roleB: t.roleB })), nTrades: trades.length, nCalls: calls.length };
  fs.writeFileSync(path.join(OUT, 'raw-summary.json'), JSON.stringify(payload, null, 1));
  const md = [];
  md.push('# Deadline trades — Couch To Front Office v10.3');
  md.push('');
  md.push(sims.length + ' fresh Boston franchises. ' + trades.length + ' AI-to-AI deadline trades. ' + calls.length + ' incoming calls to Boston.');
  md.push('');
  md.push('Ratings against real NHL deadline prices in `ref/MARKET.md`: **realistic ' + sum.by.realistic + '**, **questionable ' + sum.by.questionable + '**, **absurd ' + sum.by.absurd + '**. The write-up of totals, patterns, and the worst deals is in `ANALYSIS.md` next to this file.');
  md.push('');
  md.push('Trades that include a 1st: ' + sum.with1.length + '. Trades that include two or more 1sts: ' + sum.two1.length + '. Trades that move a star (engine star, or 90+ OVR): ' + sum.withStar.length + '.');
  md.push('');
  md.push('## Every trade');
  md.push('');
  trades.forEach((t, i) => md.push(mdTrade(t, i)));
  md.push('## Incoming calls to Boston');
  md.push('');
  calls.forEach(c => {
    const m = c.meter || {};
    md.push('- Sim ' + c.sim + ' seed ' + c.seed + ' · ' + (c.season || '') + ' · ' + (c.clock || '') + ' · ' + c.team + ' (' + c.role + ', ' + c.type + ') · Boston sends ' + fmtList(c.give) + ' · Boston gets ' + fmtList(c.get) + ' · meter ' + (m.phrase || 'n/a') + ' (' + (m.tag || '') + ', ratio ' + (m.ratio || '') + ') · “' + (c.line || '') + '”');
  });
  md.push('');
  fs.writeFileSync(path.join(OUT, 'deadline-trades.md'), md.join('\n'));
  console.log(JSON.stringify({ sims: sims.length, trades: trades.length, calls: calls.length, by: sum.by, firsts: sum.with1.length, stars: sum.withStar.length, two1: sum.two1.length, codes: sum.codes, callTags: sum.calls.tags, buckets: sum.calls.buckets }, null, 1));
}

main();
