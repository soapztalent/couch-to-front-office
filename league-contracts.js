/* League contracts for all 32 clubs.
   Loaded beside the game (one script tag). The inline game calls
   CTFO_LEAGUE_CONTRACTS.applyRows / applyPlayer / migrateGame.
   CapWages (window.NHL_CONTRACTS) and the opening roster are used first.
   Missing or impossible deals (an entry-level contract listed at a star AAV)
   are built from rating, age and position. Each club's active payroll is then
   held between the cap floor (ceiling minus $20M) and the ceiling, near the ceiling. */
(function () {
  'use strict';
  var CAP = 104000000;
  var FLOOR = CAP - 20000000;
  var MIN = 775000;
  var MAX = Math.floor(CAP * 0.2 / 25000) * 25000;
  var ELC_TOP = 1200000;
  var VERSION = 1;
  var ALIASES = {
    mattsavoie:'matthewsavoie', zacharybolduc:'zackbolduc', michaelmatheson:'mikematheson',
    samuelmontembeault:'sammontembeault', alexanderkerfoot:'alexkerfoot', arsenygritsyuk:'arsenigritsyuk',
    egorchinakhov:'yegorchinakhov', sergeimurashov:'sergeymurashov', nickrobertson:'nicholasrobertson',
    benkindel:'benjaminkindel', maxcrozier:'maxwellcrozier', benoitoliviergroulx:'bogroulx',
    daniilbut:'danilbut', dmitrisimashev:'dmitriysimashev', nickpaul:'nicholaspaul',
    alexanderwennberg:'alexwennberg', joshmahura:'joshuamahura'
  };

  function norm(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }
  function canon(name) {
    var n = norm(name);
    return ALIASES[n] || n;
  }
  function hash(seed) {
    var h = 2166136261, text = String(seed), i;
    for (i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function unit(seed) { return (hash(seed) % 10000) / 10000; }
  function round25(n) { return Math.round(Number(n) / 25000) * 25000; }
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
  function posGroup(pos) {
    pos = String(pos || 'C').toUpperCase();
    if (pos === 'G' || pos === 'GOALIE') return 'G';
    if (pos === 'D' || pos === 'LD' || pos === 'RD') return 'D';
    return 'F';
  }
  function isReserve(row) {
    return !!(row && (row.reserveList || row.unsigned || /reserve|non.roster|prospect rights|minor|loan/i.test(String(row.rosterStatus || ''))));
  }
  function rowMoney(row) {
    var s = row && row.salary != null && row.salary !== '' ? Number(row.salary) : NaN;
    if (isFinite(s)) return s;
    var c = row && row.capHit != null && row.capHit !== '' ? Number(row.capHit) : NaN;
    return isFinite(c) ? c : null;
  }
  function isGeneratedPlayer(p) {
    return !!p && (p.generated === true || /^draft-/.test(String(p.id || '')) || / Depth (C|LW|RW|D|G|F) \d{4}-\d+/.test(String(p.name || '')));
  }

  var ratings = null;
  function ratingIndex() {
    if (ratings) return ratings;
    var byName = {}, byClub = {};
    Object.keys(window.NHL_RATINGS || {}).forEach(function (club) {
      (window.NHL_RATINGS[club] || []).forEach(function (raw) {
        var parts = String(raw).split('|');
        var row = { name: parts[0], pos: parts[1] || '', ovr: Number(parts[2]), club: club, key: canon(parts[0]) };
        if (!isFinite(row.ovr)) return;
        (byClub[club] = byClub[club] || []).push(row);
        (byName[row.key] = byName[row.key] || []).push(row);
      });
    });
    ratings = { byName: byName, byClub: byClub };
    return ratings;
  }
  function lookupRating(club, name, pos) {
    var rows = ratingIndex().byName[canon(name)] || [];
    if (!rows.length) return null;
    var same = rows.filter(function (r) { return r.club === club; });
    var pool = same.length ? same : rows;
    var g = posGroup(pos);
    var matched = pool.filter(function (r) { return posGroup(r.pos) === g; });
    return (matched[0] || pool[0]).ovr;
  }
  function playerOvr(row, club) {
    var listed = row.overall != null ? Number(row.overall) : (row.ovr != null ? Number(row.ovr) : NaN);
    if (isFinite(listed) && listed >= 40) return listed;
    var rated = lookupRating(club || row.team, row.name, row.position || row.pos);
    if (isFinite(rated)) return rated;
    var age = Number(row.age) || 25;
    return age <= 20 ? 74 : age <= 23 ? 75 : 76;
  }

  function contractMap(club) {
    return (window.NHL_CONTRACTS && window.NHL_CONTRACTS[club]) || {};
  }
  function contractRecord(map, name) {
    if (!map) return null;
    var n = norm(name), c = canon(name);
    return map[c] || map[n] || (ALIASES[n] && map[ALIASES[n]]) || null;
  }
  function entryLevelClause(rec) { return /Entry-Level/i.test(String(rec && rec.clause || '')); }
  function dealClass(rec, age, ovr) {
    if (!rec) return 'reject';
    var hit = Number(rec.capHit);
    if (!isFinite(hit) || hit < 500000 || hit > MAX) return 'reject';
    if (!entryLevelClause(rec)) return hit <= ELC_TOP && (age == null || Number(age) <= 22) ? 'elc' : 'standard';
    if (hit <= ELC_TOP) return 'elc';
    // CapWages sometimes folds bonuses or a later extension into an entry-level row.
    if (hit > 12000000) return 'reject';
    if (hit >= 5000000 && ovr >= 84 && hit <= 12000000) return 'extension';
    if (Number(age) > 23 && hit <= 8000000) return 'standard';
    return 'reject';
  }
  function believable(rec, age, ovr) { return dealClass(rec, age, ovr) !== 'reject'; }
  function cleanClause(rec) {
    var c = String(rec && rec.clause || '');
    if (!c || /not yet (?:been )?confirmed|unconfirmed|not supplied/i.test(c)) return '';
    return c;
  }
  function expiryStatus(age, years, rec) {
    var raw = String(rec && rec.status || '').toUpperCase();
    if (raw === 'UFA' || raw === 'RFA') return raw;
    return (Number(age) || 25) + years - 1 >= 27 ? 'UFA' : 'RFA';
  }
  function shareFor(ovr) {
    var bands = [[68, 0.0085], [72, 0.011], [74, 0.014], [76, 0.02], [78, 0.028], [80, 0.036], [82, 0.046], [84, 0.056], [86, 0.068], [88, 0.082], [90, 0.096], [92, 0.112], [94, 0.128], [97, 0.148], [99, 0.16]];
    if (ovr <= bands[0][0]) return bands[0][1];
    if (ovr >= bands[bands.length - 1][0]) return bands[bands.length - 1][1];
    for (var i = 1; i < bands.length; i++) {
      if (ovr <= bands[i][0]) {
        var a = bands[i - 1], b = bands[i], t = (ovr - a[0]) / (b[0] - a[0]);
        return a[1] + (b[1] - a[1]) * t;
      }
    }
    return 0.16;
  }
  function fairAav(ovr, age, pos) {
    var base = CAP * shareFor(ovr);
    if (posGroup(pos) === 'G') base *= 0.92;
    else if (posGroup(pos) === 'D' && ovr < 90) base *= 0.95;
    if (age >= 36) base *= 0.68;
    else if (age >= 34) base *= 0.78;
    else if (age >= 32) base *= 0.88;
    else if (age >= 30) base *= 0.94;
    else if (age <= 23) base *= 0.9;
    return clamp(round25(base), MIN, MAX);
  }
  function elcHit(ovr) {
    if (ovr >= 88) return 975000;
    if (ovr >= 84) return 950000;
    if (ovr >= 80) return 925000;
    if (ovr >= 76) return 875000;
    if (ovr >= 72) return 825000;
    return 800000;
  }
  function elcYears(age, ovr) {
    if (age <= 19) return 3;
    if (age === 20) return ovr >= 80 ? 3 : 2;
    if (age <= 22) return 2;
    return 1;
  }
  function vetYears(age, ovr, seed) {
    var roll = unit(seed + '|term');
    var years;
    if (age >= 36) years = 1;
    else if (age >= 34) years = 1;
    else if (age >= 32) years = ovr >= 86 && roll > 0.55 ? 2 : 1;
    else if (age >= 29) years = ovr >= 90 ? 4 : ovr >= 86 ? 3 : 2;
    else if (age >= 26) years = ovr >= 92 ? 7 : ovr >= 88 ? 6 : ovr >= 84 ? 4 : 3;
    else if (age >= 23) years = ovr >= 90 ? 8 : ovr >= 86 ? 6 : ovr >= 82 ? 4 : 3;
    else years = ovr >= 86 ? 5 : 3;
    return clamp(years, 1, 8);
  }
  function wantsElc(age, ovr) {
    if (age <= 21) return true;
    if (age <= 22 && ovr < 83) return true;
    return false;
  }
  function raiseCeiling(ovr) {
    if (ovr >= 94) return MAX;
    if (ovr >= 91) return 15500000;
    if (ovr >= 88) return 12500000;
    if (ovr >= 85) return 9500000;
    if (ovr >= 82) return 7000000;
    if (ovr >= 79) return 4800000;
    if (ovr >= 76) return 3200000;
    return 2200000;
  }
  function teamTarget(id) {
    var pct = 0.945 + unit('ctfo-payroll|' + id) * 0.045;
    var raw = Math.round((CAP * pct) / 50000) * 50000;
    return clamp(raw, FLOOR, CAP);
  }
  function blankDeal(meta) {
    return {
      capHit: 0, years: 1, timeline: [], status: 'UFA', type: 'Standard', clause: '',
      source: '', dataStatus: 'generated', locked: false, elc: false, adjusted: false,
      fair: MIN, minHit: MIN, maxHit: MIN, hardMin: MIN, ovr: 75, age: 25, pos: 'C',
      name: '', key: '', id: '', baseHit: 0, baseTimeline: null
    };
  }
  function fillTimeline(hit, years, baseTimeline, baseHit) {
    var out = [], i, scale = baseHit ? hit / baseHit : 1;
    for (i = 0; i < years; i++) {
      var raw = baseTimeline && isFinite(Number(baseTimeline[i])) && Number(baseTimeline[i]) > 0 ? Number(baseTimeline[i]) * scale : hit;
      var v = Math.round(raw);
      if (v > MAX) v = MAX;
      if (v < MIN) v = hit;
      out.push(v);
    }
    if (out.length) out[0] = hit;
    return out;
  }
  function syncTimeline(d) {
    d.timeline = fillTimeline(d.capHit, d.years, d.adjusted ? d.baseTimeline : d.baseTimeline, d.adjusted ? d.baseHit : d.baseHit);
    if (!d.adjusted && d.baseTimeline && d.baseTimeline.length) {
      d.timeline = fillTimeline(d.capHit, d.years, d.baseTimeline, d.baseHit || d.capHit);
      d.timeline[0] = d.capHit;
    }
  }
  function fromSource(rec, row, club) {
    var age = Number(row.age) || 25;
    var pos = row.position || row.pos || 'C';
    var ovr = playerOvr(row, club);
    var kind = dealClass(rec, age, ovr);
    var hit = Number(rec.capHit);
    if (hit < MIN) hit = MIN;
    if (hit > MAX) hit = MAX;
    var elc = kind === 'elc';
    var years = clamp(Math.round(Number(rec.years) || vetYears(age, ovr, club + '|' + row.name)) || 1, 1, elc ? 3 : 8);
    if (elc) years = clamp(years, 1, 3);
    var nums = Array.isArray(rec.timeline) ? rec.timeline.map(Number).filter(function (n) { return isFinite(n) && n > 0; }) : [];
    var d = blankDeal();
    d.capHit = hit;
    d.years = years;
    d.status = elc ? 'RFA' : expiryStatus(age, years, rec);
    d.type = elc ? 'Entry-Level' : 'Standard';
    d.clause = kind === 'extension' ? '' : cleanClause(rec);
    d.source = 'CapWages 2026-27 snapshot · as of 2026-09-29';
    d.dataStatus = /not yet (?:been )?confirmed|unconfirmed/i.test(String(rec.clause || '')) ? 'unconfirmed' : 'matched';
    d.locked = true;
    d.elc = elc;
    d.fair = elc ? hit : fairAav(ovr, age, pos);
    d.minHit = hit;
    d.maxHit = elc ? hit : sourceCeiling(hit, d.fair, ovr);
    d.hardMin = elc ? hit : Math.max(MIN, Math.min(hit, round25((d.fair || hit) * 0.9)));
    d.ovr = ovr;
    d.age = age;
    d.pos = pos;
    d.name = row.name;
    d.key = canon(row.name);
    d.id = String(row.id || '');
    d.baseHit = hit;
    d.baseTimeline = nums.length ? nums : null;
    syncTimeline(d);
    return d;
  }
  function sourceCeiling(hit, fair, ovr) {
    var market = round25(Math.max(fair, MIN) * 1.08);
    var bump = hit + (ovr >= 85 ? 1500000 : ovr >= 80 ? 1000000 : 600000);
    var room = Math.min(raiseCeiling(ovr), Math.max(hit, Math.min(market, Math.max(bump, market))));
    if (hit >= fair) room = hit;
    return Math.max(hit, Math.min(room, raiseCeiling(ovr)));
  }
  function fromExisting(row, club) {
    var age = Number(row.age) || 25;
    var pos = row.position || row.pos || 'C';
    var ovr = playerOvr(row, club);
    var hit = rowMoney(row);
    var years = clamp(Math.round(Number(row.years) || Number(row.term) || 1), 1, 8);
    var elc = hit <= ELC_TOP && (age <= 22 || /entry/i.test(String(row.contractType || '')));
    var d = blankDeal();
    d.capHit = hit;
    d.years = years;
    d.status = expiryStatus(age, years, { status: row.freeAgencyStatus || row.expiry });
    d.type = elc ? 'Entry-Level' : (row.contractType || 'Standard');
    d.clause = /not yet|unconfirmed|not supplied/i.test(String(row.tradeProtection || '')) ? '' : (row.tradeProtection || '');
    d.source = row.contractSource && !/not imported/i.test(row.contractSource) ? row.contractSource : 'Starting roster contract';
    d.dataStatus = row.contractDataStatus || 'roster';
    d.locked = true;
    d.elc = elc;
    d.fair = elc ? hit : fairAav(ovr, age, pos);
    d.minHit = hit;
    d.maxHit = hit;
    d.hardMin = elc ? hit : Math.max(MIN, Math.min(hit, round25(d.fair * 0.85)));
    d.ovr = ovr;
    d.age = age;
    d.pos = pos;
    d.name = row.name;
    d.key = canon(row.name);
    d.id = String(row.id || '');
    d.baseHit = hit;
    var timeline = Array.isArray(row.contractTimeline) ? row.contractTimeline.map(Number).filter(function (n) { return isFinite(n) && n > 0; }) : [];
    d.baseTimeline = timeline.length ? timeline : null;
    syncTimeline(d);
    return d;
  }
  function fromGenerated(row, club, reserve) {
    var age = Number(row.age) || (reserve ? 21 : 26);
    var pos = row.position || row.pos || 'C';
    var ovr = playerOvr(row, club);
    var seed = 'ctfo-deal|' + club + '|' + canon(row.name) + '|' + (row.id || '');
    var elc = wantsElc(age, ovr) || (reserve && age <= 22);
    var hit, years, type;
    if (elc) {
      hit = elcHit(ovr);
      years = elcYears(age, ovr);
      type = 'Entry-Level';
    } else {
      var jitter = 0.94 + unit(seed) * 0.1;
      hit = clamp(round25(fairAav(ovr, age, pos) * jitter), MIN, MAX);
      if (reserve) hit = Math.min(hit, ovr >= 80 ? 2500000 : 1250000);
      years = vetYears(age, ovr, seed);
      type = 'Standard';
    }
    var d = blankDeal();
    d.capHit = hit;
    d.years = years;
    d.status = elc ? 'RFA' : expiryStatus(age, years, null);
    d.type = type;
    d.source = 'League contract model · rating, age and position';
    d.dataStatus = 'generated';
    d.locked = false;
    d.elc = elc;
    d.fair = elc ? hit : fairAav(ovr, age, pos);
    d.minHit = elc ? hit : Math.max(MIN, round25(d.fair * (ovr >= 88 ? 0.85 : ovr >= 82 ? 0.75 : 0.65)));
    d.maxHit = elc ? hit : Math.min(raiseCeiling(ovr), Math.max(hit, round25(d.fair * 1.12)));
    if (reserve && !elc) d.maxHit = Math.min(d.maxHit, ovr >= 82 ? 3000000 : 1500000);
    d.hardMin = elc ? hit : MIN;
    d.ovr = ovr;
    d.age = age;
    d.pos = pos;
    d.name = row.name;
    d.key = canon(row.name);
    d.id = String(row.id || '');
    d.baseHit = hit;
    syncTimeline(d);
    return d;
  }

  function payroll(deals) {
    return deals.reduce(function (sum, d) { return sum + (Number(d.capHit) || 0); }, 0);
  }
  function setHit(d, hit) {
    hit = Math.round(hit);
    if (hit === d.capHit) return;
    d.capHit = hit;
    d.adjusted = true;
    if (d.locked && d.dataStatus !== 'generated') d.dataStatus = 'adjusted';
    syncTimeline(d);
  }
  function cutPool(deals, goal, floorOf) {
    var left = payroll(deals) - goal;
    if (left <= 0) return;
    var pool = deals.filter(function (d) { return !d.elc && d.capHit > floorOf(d); });
    pool.sort(function (a, b) { return b.capHit - a.capHit; });
    pool.forEach(function (d) {
      if (left < 25000) return;
      var room = d.capHit - floorOf(d);
      var take = Math.min(room, Math.floor(left / 25000) * 25000);
      take = Math.floor(take / 25000) * 25000;
      if (take <= 0) return;
      setHit(d, d.capHit - take);
      left -= take;
    });
  }
  function raisePool(deals, goal, pred, maxOf) {
    var left = goal - payroll(deals);
    if (left < 25000) return;
    var pool = deals.filter(pred);
    var pass, i;
    for (pass = 0; pass < 8 && left >= 25000; pass++) {
      var rooms = pool.map(function (d) { return Math.max(0, maxOf(d) - d.capHit); });
      var total = rooms.reduce(function (s, n) { return s + n; }, 0);
      if (total <= 0) break;
      for (i = 0; i < pool.length; i++) {
        if (rooms[i] < 25000 || left < 25000) continue;
        var share = Math.floor((left * (rooms[i] / total)) / 25000) * 25000;
        share = Math.min(share, Math.floor(rooms[i] / 25000) * 25000);
        if (share <= 0) continue;
        setHit(pool[i], pool[i].capHit + share);
        left -= share;
      }
      pool.slice().sort(function (a, b) { return (maxOf(b) - b.capHit) - (maxOf(a) - a.capHit); }).forEach(function (d) {
        while (left >= 25000 && d.capHit + 25000 <= maxOf(d)) {
          setHit(d, d.capHit + 25000);
          left -= 25000;
        }
      });
    }
  }
  function balance(deals, teamId) {
    if (!deals.length) return;
    var target = Math.min(teamTarget(teamId), CAP);
    if (payroll(deals) > CAP) {
      cutPool(deals, CAP, function (d) { return d.minHit; });
      if (payroll(deals) > CAP) cutPool(deals, CAP, function (d) { return d.hardMin || MIN; });
      if (payroll(deals) > CAP) cutPool(deals, CAP, function () { return MIN; });
    }
    if (payroll(deals) < target) {
      raisePool(deals, Math.min(target, CAP), function (d) { return !d.locked && !d.elc; }, function (d) { return d.maxHit; });
    }
    if (payroll(deals) < target) {
      raisePool(deals, Math.min(target, CAP), function (d) { return d.locked && !d.elc; }, function (d) { return d.maxHit; });
    }
    if (payroll(deals) < FLOOR) {
      raisePool(deals, FLOOR, function (d) { return !d.elc; }, function (d) {
        return Math.min(raiseCeiling(d.ovr), Math.max(d.maxHit, round25(Math.max(d.fair, d.capHit) * 1.2)));
      });
    }
    var guard = 0;
    while (payroll(deals) > CAP && guard++ < 400) {
      var rich = deals.filter(function (d) { return !d.elc && d.capHit > MIN; }).sort(function (a, b) { return b.capHit - a.capHit; })[0];
      if (!rich) break;
      setHit(rich, rich.capHit - 25000);
    }
    guard = 0;
    while (payroll(deals) < FLOOR && guard++ < 800) {
      var lean = deals.filter(function (d) { return !d.elc && d.capHit < MAX; }).sort(function (a, b) { return b.ovr - a.ovr || a.capHit - b.capHit; })[0];
      if (!lean) break;
      setHit(lean, lean.capHit + 25000);
    }
  }

  var book = { byId: {}, byName: {}, ready: false };
  function remember(d) {
    if (d.id) book.byId[d.id] = d;
    var k = (d.club || '') + '|' + d.key;
    (book.byName[k] = book.byName[k] || []).push(d);
  }
  function writeRow(row, d) {
    row.salary = d.capHit;
    row.capHit = d.capHit;
    row.years = d.years;
    row.term = d.years;
    row.contractTimeline = d.timeline.slice();
    row.freeAgencyStatus = d.status;
    row.expiry = d.status;
    row.contractType = d.type;
    row.contractSource = d.source;
    row.contractDataStatus = d.dataStatus === 'generated' ? 'league-contract' : d.dataStatus;
    if (d.clause) row.tradeProtection = d.clause;
    row.unsigned = false;
  }
  function writePlayer(p, d) {
    p.salary = d.capHit;
    p.capHit = d.capHit;
    p.years = d.years;
    p.term = d.years;
    p.contractTimeline = d.timeline.slice();
    p.freeAgencyStatus = d.status;
    p.expiry = d.status;
    p.contractType = d.type;
    p.contractSource = d.source;
    p.contractDataStatus = d.dataStatus;
    if (d.clause) p.tradeProtection = d.clause;
    p.unsigned = false;
    p.contractExpired = false;
    p.leagueContractVersion = VERSION;
    p.leagueContractLocked = !!d.locked && !d.adjusted;
  }
  function existingUsable(row) {
    if (row && row.contractDataStatus === 'corrected' && rowMoney(row) >= MIN) return true;
    var hit = rowMoney(row);
    var years = Number(row && row.years);
    if (!(hit >= MIN && hit <= MAX && years >= 1)) return false;
    var src = String(row.contractSource || '');
    if (/not imported|missing/i.test(src)) return false;
    return true;
  }
  function assignClub(rows, club, rosterNames) {
    var map = contractMap(club);
    var groups = {};
    rows.forEach(function (row, index) {
      var k = canon(row.name);
      (groups[k] = groups[k] || []).push(index);
    });
      var chosen = {};
      Object.keys(groups).forEach(function (k) {
        var rec = contractRecord(map, rows[groups[k][0]].name);
        if (!rec) rec = foreignRecord(rows[groups[k][0]].name, club, rosterNames);
        if (!rec) return;
        var pool = groups[k].filter(function (i) { return !(rows[i].contractDataStatus === 'corrected' && rowMoney(rows[i]) >= MIN); });
        if (!pool.length) return;
      var elc = entryLevelClause(rec) && Number(rec.capHit) <= ELC_TOP;
      pool.sort(function (a, b) { return (Number(rows[a].age) || 30) - (Number(rows[b].age) || 30); });
      var pick = elc ? pool[0] : pool[pool.length - 1];
      if (believable(rec, rows[pick].age, playerOvr(rows[pick], club))) chosen[pick] = rec;
    });
    return chosen;
  }
  function foreignRecord(name, club, rosterNames) {
    var key = canon(name);
    var found = null, n = 0;
    Object.keys(window.NHL_CONTRACTS || {}).forEach(function (other) {
      if (other === club) return;
      var rec = contractRecord(window.NHL_CONTRACTS[other], name);
      if (!rec) return;
      var owners = rosterNames[other + '|' + key];
      if (owners) return;
      found = rec;
      n++;
    });
    return n === 1 ? found : null;
  }
  function buildDeals(rows) {
    var rosterNames = {};
    rows.forEach(function (row) {
      rosterNames[(row.team || '') + '|' + canon(row.name)] = true;
    });
    var byClub = {};
    rows.forEach(function (row) {
      var club = String(row.team || '').toUpperCase();
      (byClub[club] = byClub[club] || []).push(row);
    });
    var deals = [];
    Object.keys(byClub).forEach(function (club) {
      var list = byClub[club];
      var chosen = assignClub(list, club, rosterNames);
      list.forEach(function (row, index) {
        if (row.unsigned && !(Number(row.years) > 0)) return;
        var reserve = isReserve(row);
        var deal;
        if (row.contractDataStatus === 'corrected' && rowMoney(row) >= MIN) deal = fromExisting(row, club);
        else if (chosen[index]) deal = fromSource(chosen[index], row, club);
        else if (existingUsable(row)) deal = fromExisting(row, club);
        else deal = fromGenerated(row, club, reserve);
        deal.club = club;
        deal.reserve = reserve;
        deal.row = row;
        deals.push(deal);
      });
    });
    return deals;
  }

  function applyRows(rows) {
    if (!rows || book.ready) return rows;
    var deals = buildDeals(rows);
    var active = {};
    deals.forEach(function (d) {
      if (!d.reserve) (active[d.club] = active[d.club] || []).push(d);
    });
    Object.keys(active).forEach(function (club) { balance(active[club], club); });
    book.byId = {};
    book.byName = {};
    deals.forEach(function (d) {
      if (d.adjusted && d.locked && !/adjusted to the/i.test(d.source)) d.source += ' · adjusted to the 2026-27 cap band';
      writeRow(d.row, d);
      remember(d);
    });
    book.ready = true;
    return rows;
  }
  function ensureBook() {
    if (book.ready) return book;
    var starter = window.NHL_STARTER && window.NHL_STARTER.players;
    if (starter && starter.length) applyRows(starter.map(function (row) {
      var copy = {};
      Object.keys(row).forEach(function (k) { copy[k] = row[k]; });
      if (copy.salary == null && copy.capHit != null) copy.salary = copy.capHit;
      return copy;
    }));
    book.ready = true;
    return book;
  }
  function lookup(club, player) {
    ensureBook();
    if (player && player.id && book.byId[player.id]) return book.byId[player.id];
    var list = book.byName[String(club || player.club || '').toUpperCase() + '|' + canon(player.name)] || [];
    if (!list.length) {
      var key = canon(player.name), clubs = Object.keys(book.byName), i, hit = [];
      for (i = 0; i < clubs.length; i++) if (book.byName[clubs[i]][0] && clubs[i].slice(-key.length - 1) === '|' + key) hit = hit.concat(book.byName[clubs[i]]);
      list = hit;
    }
    if (!list.length) return null;
    if (list.length === 1) return list[0];
    var age = Number(player.age) || 0;
    return list.slice().sort(function (a, b) {
      return Math.abs((a.age || 0) - age) - Math.abs((b.age || 0) - age);
    })[0];
  }
  function synthesize(player, reserve, club) {
    return fromGenerated({
      id: player.id, name: player.name, age: player.age, position: player.pos || player.position,
      ovr: player.ovr, overall: player.ovr, team: club
    }, club, reserve);
  }
  function applyPlayer(player, club, opts) {
    if (!player || isGeneratedPlayer(player)) return player;
    if (player.unsigned && !(Number(player.years) > 0)) return player;
    ensureBook();
    club = String(club || player.club || '').toUpperCase();
    if (opts && opts.opening) {
      var deal = lookup(club, player);
      if (!deal) {
        var rec = contractRecord(contractMap(club), player.name);
        var named = book.byName[club + '|' + canon(player.name)];
        if (rec && believable(rec, player.age, Number(player.ovr) || playerOvr(player, club)) && !named) deal = fromSource(rec, player, club);
        else deal = synthesize(player, !!player.reserveList, club);
      }
      writePlayer(player, deal);
      return player;
    }
    if (needsFill(player)) writePlayer(player, lookup(club, player) || synthesize(player, !!player.reserveList, club));
    return player;
  }
  function needsFill(p) {
    if (!p || isGeneratedPlayer(p)) return false;
    if (p.unsigned && !(Number(p.years) > 0)) return false;
    if (p.contractExpired && !(Number(p.years) > 0)) return false;
    // Years and money both empty means rights were left unsigned on purpose.
    if (!(Number(p.years) > 0) && !((Number(p.capHit || p.salary) || 0) > 0)) return false;
    if (p.leagueContractVersion === VERSION && Number(p.capHit || p.salary) >= MIN && Number(p.years) > 0) return false;
    var src = String(p.contractSource || '');
    if (/signing|re-signed|qualifying|extension|free agent/i.test(src) && Number(p.years) > 0 && Number(p.capHit || p.salary) > 0) return false;
    var hit = Number(p.capHit || p.salary) || 0;
    var years = Number(p.years) || 0;
    if (/CapWages|League contract model|Data correction/i.test(src) && years > 0 && hit >= MIN) return false;
    if (years > 0 && hit >= MIN && hit !== 925000 && !/not imported|Simulation estimate/i.test(src)) return false;
    return years <= 0 || hit < MIN || hit === 925000 || /not imported|Simulation estimate|unknown/i.test(src);
  }
  function hitOf(p) {
    if (!p || (p.contractExpired && !(Number(p.years) > 0))) return 0;
    return Math.max(0, Math.round((Number(p.capHit || p.salary) || 0) * (1 - (Number(p.retainedPercent) || 0))));
  }
  function dealsFromPlayers(players) {
    return (players || []).filter(Boolean).map(function (p) {
      var hit = Number(p.capHit || p.salary) || 0;
      var ovr = Number(p.ovr) || 75;
      var age = Number(p.age) || 26;
      var elc = /entry/i.test(String(p.contractType || '')) || (hit > 0 && hit <= ELC_TOP && age <= 22);
      var negotiated = /signing|re-signed|qualifying|extension|free agent/i.test(String(p.contractSource || ''));
      var d = fromGenerated(p, p.club || '', false);
      d.capHit = hit || d.capHit;
      d.years = clamp(Number(p.years) || d.years, 1, 8);
      d.elc = elc;
      d.locked = negotiated || (!!p.leagueContractLocked && !needsFill(p));
      d.ovr = ovr;
      d.fair = elc ? d.capHit : fairAav(ovr, age, p.pos);
      d.minHit = d.locked || elc ? d.capHit : d.minHit;
      d.maxHit = d.locked || elc ? d.capHit : d.maxHit;
      d.hardMin = elc ? d.capHit : (d.locked ? Math.max(MIN, Math.min(d.capHit, round25(d.fair * 0.85))) : MIN);
      d.baseHit = d.capHit;
      d.player = p;
      d.source = p.contractSource || d.source;
      d.status = p.freeAgencyStatus || d.status;
      d.type = p.contractType || d.type;
      d.clause = p.tradeProtection || '';
      syncTimeline(d);
      return d;
    });
  }
  function balancePlayers(players, club) {
    var deals = dealsFromPlayers(players);
    var before = deals.map(function (d) { return d.capHit; });
    balance(deals, club);
    deals.forEach(function (d, i) {
      if (d.capHit !== before[i] && d.player && !/signing|re-signed|qualifying|extension/i.test(String(d.player.contractSource || ''))) {
        if (d.adjusted && !/adjusted to the/i.test(d.source)) d.source = (d.player.contractSource || d.source) + ' · adjusted to the 2026-27 cap band';
        writePlayer(d.player, d);
      }
    });
    return payroll(deals);
  }
  function migrateGame(g) {
    if (!g || !g.roster) return g;
    ensureBook();
    var changed = 0;
    function walk(list, club, reserve) {
      (list || []).forEach(function (p) {
        if (!needsFill(p)) return;
        var deal = lookup(club, p) || synthesize(p, reserve || !!p.reserveList, club);
        writePlayer(p, deal);
        changed++;
      });
    }
    function clubPayroll(list) {
      return (list || []).reduce(function (sum, p) { return sum + hitOf(p); }, 0);
    }
    function finish(list, club) {
      var pay = clubPayroll(list);
      if (pay < FLOOR || pay > CAP) balancePlayers(list, club);
    }
    walk(g.roster, g.team, false);
    walk(g.reserveRoster, g.team, true);
    walk(g.orgProspects, g.team, true);
    finish(g.roster, g.team);
    Object.keys(g.leagueTeams || {}).forEach(function (id) {
      var c = g.leagueTeams[id];
      if (!c) return;
      walk(c.roster, id, false);
      walk(c.reserveRoster, id, true);
      walk(c.orgProspects, id, true);
      finish(c.roster, id);
    });
    if (changed && Number(g.season) === 1 && !(Number(g.day) > 0) && g.payrollOn) {
      g.payrollRef = clubPayroll(g.roster);
    }
    g.leagueContractsVersion = VERSION;
    return g;
  }
  function summarize(rows) {
    var buckets = {};
    (rows || []).forEach(function (row) {
      if (isReserve(row)) return;
      var club = String(row.team || '').toUpperCase();
      var b = buckets[club] || (buckets[club] = { team: club, players: 0, payroll: 0, generated: 0, matched: 0 });
      b.players++;
      b.payroll += Number(row.salary || row.capHit) || 0;
      if (row.contractDataStatus === 'league-contract' || row.contractDataStatus === 'generated') b.generated++;
      else b.matched++;
    });
    return Object.keys(buckets).sort().map(function (k) { return buckets[k]; });
  }

  window.CTFO_LEAGUE_CONTRACTS = {
    version: VERSION,
    cap: CAP,
    floor: FLOOR,
    minimum: MIN,
    maximum: MAX,
    applyRows: applyRows,
    applyPlayer: applyPlayer,
    migrateGame: migrateGame,
    balancePlayers: balancePlayers,
    summarize: summarize,
    ensureBook: ensureBook
  };
})();
