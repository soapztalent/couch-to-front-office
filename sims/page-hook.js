/* Sim harness only. Inserted into a temporary copy of index.html inside the game closure.
   Observes trades and drives existing functions. Does not change accept/value decisions. */
var simOrigExec = aiExecute;
function simAsset(g, a) {
  if (!a) return null;
  if (a.round) {
    return {
      kind: 'pick',
      year: Number(a.year) || 0,
      round: Number(a.round) || 0,
      origin: a.origin || a.team || '',
      holder: a.team || '',
      id: a.id || '',
      condition: a.condition || '',
      conditions: (a.conditions || []).map(function (c) {
        return { kind: c.kind || '', top: c.top || 0, text: c.text || '', keeper: c.keeper || '', resolved: !!c.resolved };
      }),
      label: aiAssetLabel(a),
      market: Math.round(aiMarket(g, a) || 0)
    };
  }
  var si = null;
  try { si = aiStatusInfo(g, a); } catch (e) { si = null; }
  var fa = 'signed';
  if (si && si.rental) fa = 'UFA';
  else if (si && si.pending && si.status === 'RFA') fa = 'RFA';
  else if (si && si.pending && si.status === 'UFA') fa = 'UFA';
  else if (si && si.status) fa = si.status;
  else if (Number(a.years) <= 1) fa = 'UFA';
  var star = false, franchise = false, depth = false;
  try { star = tvIsStar(g, a); } catch (e1) {}
  try { franchise = tvIsFranchise(g, a); } catch (e2) {}
  try { depth = tvDepth(a); } catch (e3) {}
  return {
    kind: (a.__group && a.__group !== 'active') ? 'prospect' : 'player',
    group: a.__group || 'active',
    name: a.name,
    pos: a.pos,
    ovr: Number(a.ovr) || 0,
    pot: Number(a.potential) || Number(a.ovr) || 0,
    age: Number(a.age) || 0,
    capHit: contractHit(a),
    years: Number(a.years) || 0,
    fa: fa,
    statusLabel: si ? (si.label || '') : '',
    rental: !!(si && si.rental),
    star: !!star,
    franchise: !!franchise,
    depth: !!depth,
    label: aiAssetLabel(a),
    market: Math.round(aiMarket(g, a) || 0)
  };
}
function simWhy(found) {
  var A = found.A, B = found.B, recv = found.receiver, other = recv === A ? B : A;
  if (found.type === 'cap dump') return team(A.id).name + ' needed cap relief and paid a sweetener; ' + team(B.id).name + ' had room to absorb salary for assets.';
  if (found.type === 'floor salary') return team(B.id).name + ' was under the cap floor and took on salary from a capped-out ' + team(A.id).name + '.';
  if (found.type === 'hockey trade') return 'Both clubs swapped from a position of surplus into a position of need.';
  return team(recv.id).name + ' filled a lineup need; ' + team(other.id).name + ' converted the asset into value that fits its org state.';
}
aiExecute = function (g, found, kind, date) {
  var snap = null;
  try {
    var d = found.deal;
    snap = {
      type: found.type,
      banner: (typeof AI_TYPE_LABEL !== 'undefined' && AI_TYPE_LABEL[found.type]) || found.type,
      why: simWhy(found),
      teamA: found.A && found.A.id,
      roleA: found.A && found.A.role,
      capA: !!(found.A && found.A.capTrouble),
      teamB: found.B && found.B.id,
      roleB: found.B && found.B.role,
      capB: !!(found.B && found.B.capTrouble),
      giveA: (d.giveA || []).map(function (a) { return simAsset(g, a); }),
      giveB: (d.giveB || []).map(function (a) { return simAsset(g, a); })
    };
  } catch (e) { snap = { error: String(e && e.message || e) }; }
  var res = simOrigExec.apply(this, arguments);
  try {
    var log = g.aiTradeLog, e2 = log && log[log.length - 1];
    if (e2 && snap) e2.simSnap = snap;
  } catch (err) {}
  return res;
};
function simInstallSeed(seed) {
  var a = (Number(seed) || 1) >>> 0;
  Math.random = function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function simCalendar(g) {
  var calendar = g.calendarGames || [];
  if (calendar.length !== seasonGameCount(g)) {
    calendar = officeEstimatedSchedule(g);
    g.calendarGames = calendar;
  }
  g.schedule = g.schedule || calendar.map(function (x) { return x.opponent; });
  return calendar;
}
function simUnstick(g) {
  var act = 0, max = 23, over = 0;
  try { act = lv2ActiveCount(g); } catch (e) { act = (g.roster || []).length; }
  try { max = csRosterMax(g); } catch (e2) {}
  try { over = lv2Payroll(g, g.team, g) - (g.cap + lv2LtirRelief(g, g)); } catch (e3) {}
  var needRoster = act > max;
  var needCap = !!(g.lv2CapCheck && over > 0);
  if (!needRoster && !needCap) return { ok: false, reason: 'unknown', act: act, max: max, over: Math.round(over), capCheck: !!g.lv2CapCheck, day: g.day, roster: (g.roster || []).length };
  var cands = (g.roster || []).filter(function (p) { try { return !lv2OnIR(p); } catch (e) { return true; } }).slice().sort(function (a, b) {
    if (needCap && !needRoster) return contractHit(b) - contractHit(a);
    return (Number(a.ovr) || 0) - (Number(b.ovr) || 0);
  });
  for (var i = 0; i < cands.length; i++) {
    var p = cands[i];
    var moved = false;
    try { moved = moveRosterPlayer(g, p.id, 'down', { quiet: true }); } catch (e4) { moved = false; }
    if (moved) return { ok: true, action: needCap && !needRoster ? 'cap-down' : 'send-down', name: p.name, pos: p.pos, ovr: p.ovr, act: act, over: Math.round(over) };
  }
  return { ok: false, reason: needCap ? 'cap' : 'roster', act: act, max: max, over: Math.round(over) };
}
function simPlayRegular(through) {
  var g = current.game;
  var deadline = tradeDeadlineISO(g);
  var count = seasonGameCount(g);
  var calendar = simCalendar(g);
  var fixes = [];
  var guard = 0;
  var year = Number(g.startYear) + Number(g.season);
  while (g.stage === 'regular' && g.day < count && guard++ < 160) {
    var game = calendar[g.day];
    if (through === 'deadline' && game && game.date >= deadline) break;
    if (through !== 'deadline' && game && game.date >= deadline && (!g.tradeDeadline || g.tradeDeadline.year !== year)) {
      try { runTradeDeadline(g); } catch (e) {}
    }
    var before = g.day;
    try { simulateGame(g, false, true); } catch (e2) { fixes.push({ ok: false, reason: 'throw', message: String(e2 && e2.message || e2) }); break; }
    if (g.day !== before) continue;
    var fix = simUnstick(g);
    fixes.push(fix);
    if (!fix.ok) break;
    if (fixes.length > 12) break;
  }
  var next = calendar[g.day] || null;
  return {
    day: g.day,
    games: ((g.record && g.record.w) || 0) + ((g.record && g.record.l) || 0) + ((g.record && g.record.otl) || 0),
    record: g.record,
    nextDate: next && next.date,
    deadline: deadline,
    source: g.scheduleSource || '',
    fixes: fixes
  };
}
function simFinishSeason() {
  var g = current.game;
  if (!g) throw new Error('no game');
  var played = simPlayRegular('end');
  simulateToPlayoffs();
  var guard = 0, last = '';
  while (g.stage === 'playoffs' && guard++ < 8) {
    var key = (g.playoff && g.playoff.round) + '|' + (g.playoff && g.playoff.complete);
    simulatePlayoffRound(g);
    if (g.playoff && g.playoff.complete) break;
    if (key === last && g.stage === 'playoffs') break;
    last = (g.playoff && g.playoff.round) + '|' + (g.playoff && g.playoff.complete);
  }
  if (g.stage !== 'offseason') return { ok: false, stage: g.stage, season: g.season, note: 'did not reach offseason', played: played };
  g.offseason.phase = 'draft';
  try { aiDraftTradeWindow(g); } catch (e) {}
  initializeDraftOrder(g);
  try { advanceDraftOnePick(g); } catch (e2) {}
  finishDraft(g);
  var rights = (g.offseason.draftRights || []).slice();
  rights.forEach(function (r) { if (r.status === 'pending') resolveDraftProspect(g, r.playerId); });
  g.offseason.phase = 'free-agency';
  g.drafted = true;
  var days = 0;
  while (g.offseason && g.offseason.phase === 'free-agency' && days++ < 120) advanceFreeAgencyDay(g);
  if (!g.offseason || g.offseason.phase !== 'ready') return { ok: false, stage: g.stage, phase: g.offseason && g.offseason.phase, season: g.season, faDays: days };
  advanceSeason(g);
  return { ok: true, season: g.season, stage: g.stage, day: g.day, label: seasonLabel(g), played: played };
}
function simMeter(c) {
  if (!(c && c.nu > 0 && c.na > 0)) return null;
  var r = c.nu / c.na, pct = Math.round((r - 1) * 100);
  var tag = r < 0.95 ? 'STEAL' : r <= 1.05 ? 'FAIR' : r <= 1.15 ? 'OVERPAY' : 'RIPOFF';
  return {
    ratio: Math.round(r * 1000) / 1000,
    pct: pct,
    tag: tag,
    youSend: Math.round(c.nu),
    youGet: Math.round(c.na),
    phrase: pct > 0 ? ('they win +' + pct + '%') : pct < 0 ? ('you win +' + (-pct) + '%') : 'even'
  };
}
function simCallAssetList(g, refs) {
  var resolved = null;
  try { resolved = dlResolve(g, refs || []); } catch (e) { resolved = null; }
  if (!resolved) return (refs || []).map(function (r) { return { label: r.txt || '', kind: r.k || '' }; });
  return resolved.map(function (a) { return simAsset(g, a); });
}
function simPlayDeadlineDay() {
  var g = current.game;
  if (!g) throw new Error('no game');
  var before = (g.aiTradeLog || []).length;
  var played = simPlayRegular('deadline');
  simulateToTradeDeadline();
  var dl = g.deadlineDay;
  if (!dl) return { ok: false, note: 'deadline day did not start', season: g.season, stage: g.stage, day: g.day };
  dl.opened = true;
  var seen = {}, calls = [];
  for (var i = 0; i < 420; i++) {
    dlTick();
    var c = dlActive(dl);
    if (c && !seen[c.id]) {
      seen[c.id] = 1;
      var role = '';
      try { role = aiTeamCtx(g, c.team, 'deadline').role; } catch (e) {}
      calls.push({
        id: c.id,
        type: c.type,
        team: c.team,
        teamName: team(c.team).name,
        role: role,
        clock: c.at || dlClockText(dl),
        player: c.player || '',
        line: c.line || '',
        dealType: c.dealType || '',
        give: simCallAssetList(g, c.give),
        get: simCallAssetList(g, c.get),
        giveTxt: (c.give || []).map(function (r) { return r.txt; }),
        getTxt: (c.get || []).map(function (r) { return r.txt; }),
        meter: simMeter(c)
      });
      c.state = 'declined';
      c.note = 'Sim passed.';
    }
  }
  try { dlFinish(g); } catch (e) { return { ok: false, note: 'finish failed: ' + (e && e.message || e), calls: calls }; }
  var trades = (g.aiTradeLog || []).slice(before).filter(function (e) { return e.window === 'deadline' && !e.userCall; });
  // also include deadline trades from earlier seasons of this save (already in the log before `before`)
  var earlier = (g.aiTradeLog || []).slice(0, before).filter(function (e) { return e.window === 'deadline' && !e.userCall; });
  return {
    ok: true,
    season: g.season,
    label: seasonLabel(g),
    day: g.day,
    date: dl.date,
    played: played,
    callsMade: dl.callsMade,
    callCount: (dl.calls || []).length,
    calls: calls,
    trades: trades,
    earlierTrades: earlier,
    bosRecord: g.record || null,
    bosRole: (g.philosophy === 'win-now' ? 'CONTENDER' : g.philosophy === 'youth' ? 'REBUILD' : 'RETOOL')
  };
}
function simPackTrade(e) {
  var sa = dlScore(e, 'A'), sb = dlScore(e, 'B');
  return {
    id: e.id,
    season: e.season,
    seasonIndex: e.seasonIndex,
    date: e.date,
    type: e.type,
    banner: (e.simSnap && e.simSnap.banner) || e.type,
    why: (e.simSnap && e.simSnap.why) || '',
    text: e.text || '',
    teamA: e.teamA,
    teamAName: team(e.teamA).name,
    roleA: e.stateA,
    capA: !!e.capTroubleA,
    teamB: e.teamB,
    teamBName: team(e.teamB).name,
    roleB: e.stateB,
    capB: !!e.capTroubleB,
    valueA: e.valueA,
    valueB: e.valueB,
    marketA: e.marketA,
    marketB: e.marketB,
    scoreA: Math.round(sa * 1000) / 1000,
    scoreB: Math.round(sb * 1000) / 1000,
    gradeA: dlGrade(sa),
    gradeB: dlGrade(sb),
    aReceives: e.aReceives,
    bReceives: e.bReceives,
    giveA: e.simSnap && e.simSnap.giveA,
    giveB: e.simSnap && e.simSnap.giveB,
    players: e.players || []
  };
}
window.__SIM = {
  start: function (seed) {
    selectTeam('BOS');
    start('franchise', true);
    simInstallSeed(seed);
    return { team: current.game.team, season: current.game.season, label: seasonLabel(current.game), cap: current.game.cap };
  },
  finishSeason: simFinishSeason,
  deadline: function () {
    var raw = simPlayDeadlineDay();
    if (!raw.ok) return raw;
    raw.trades = (raw.trades || []).map(simPackTrade);
    raw.earlierTrades = (raw.earlierTrades || []).map(simPackTrade);
    return raw;
  }
};
