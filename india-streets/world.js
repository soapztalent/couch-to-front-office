/* Street sim for Arre, Left!
   Pure logic: no DOM, no canvas. The driver never receives the route.
   A junction is cleared by steering the way the passenger called. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.ArreWorld = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const STEP = 1;

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  function turnOf(name) {
    if (name === "left") return -1.08;
    if (name === "right") return 1.08;
    return 0;
  }

  function P(len, extra) {
    return Object.assign({ len: len }, extra || {});
  }

  const STAGES = [
    {
      id: "keys",
      name: "Duplicate Keys",
      place: "Gali No. 7, Nukkadpur",
      brief:
        "Sharma Stores drops its shutter at sunset. Chotu has the tablet. You have the horn. The cow has opinions.",
      sky: "gold",
      mudRate: 0.012,
      width: 7.4,
      seed: 11,
      pieces: [
        P(28),
        P(26, { hazards: [{ type: "pothole", at: 0.55, lane: 0.05 }] }),
        P(34, { kind: "junction", options: ["left", "right"], correct: "left" }),
        P(30, { hazards: [{ type: "cow", at: 0.62, lane: -0.22 }] }),
        P(22, { powerup: { type: "chai", at: 0.45, lane: 0.35 } }),
        P(36, {
          kind: "junction",
          options: ["left", "straight", "right"],
          correct: "straight",
        }),
        P(28, { hazards: [{ type: "cricket", at: 0.5, lane: 0.05 }] }),
        P(24, { curve: -0.28 }),
        P(34, { kind: "junction", options: ["left", "right"], correct: "right" }),
        P(26, { hazards: [{ type: "oncoming", at: 0.2, lane: 0 }] }),
        P(32, { kind: "junction", options: ["left", "straight"], correct: "left" }),
        P(24, { powerup: { type: "ladoo", at: 0.4, lane: -0.2 } }),
        P(22, { kind: "finish" }),
      ],
    },
    {
      id: "cricket",
      name: "Over the Wall",
      place: "School Wall Ground",
      brief:
        "A six cleared the school wall. The kid is in the back. The stumps stay where they are. Door stays shut, ideally.",
      sky: "dusk",
      mudRate: 0.02,
      width: 6.5,
      seed: 29,
      pieces: [
        P(22),
        P(30, { kind: "junction", options: ["left", "right"], correct: "right", door: true }),
        P(24, { curve: 0.32, hazards: [{ type: "cricket", at: 0.7, lane: 0 }] }),
        P(20, { hazards: [{ type: "pothole", at: 0.4, lane: -0.1 }] }),
        P(34, {
          kind: "junction",
          options: ["left", "straight", "right"],
          correct: "left",
        }),
        P(26, { hazards: [{ type: "band", at: 0.35, lane: 0 }] }),
        P(28, { powerup: { type: "dhol", at: 0.5, lane: 0.15 } }),
        P(32, { kind: "junction", options: ["left", "right"], correct: "left" }),
        P(22, { hazards: [{ type: "cow", at: 0.55, lane: 0.28 }] }),
        P(30, { kind: "junction", options: ["straight", "right"], correct: "right" }),
        P(20, { kind: "finish" }),
      ],
    },
    {
      id: "monsoon",
      name: "Monsoon Nukkad",
      place: "The Flyover That Is Just a Bridge",
      brief:
        "The glass is a rumor. The tablet is slippery. Somebody is still honking with their whole heart.",
      sky: "rain",
      mudRate: 0.055,
      width: 6.8,
      seed: 47,
      pieces: [
        P(20, { puddle: true }),
        P(24, { powerup: { type: "chai", at: 0.55, lane: 0 } }),
        P(32, { kind: "junction", options: ["left", "right"], correct: "right", puddle: true }),
        P(22, { hazards: [{ type: "oncoming", at: 0.3, lane: 0.1 }], puddle: true }),
        P(26, { hazards: [{ type: "cow", at: 0.6, lane: -0.18 }] }),
        P(34, {
          kind: "junction",
          options: ["left", "straight", "right"],
          correct: "left",
        }),
        P(22, { puddle: true, hazards: [{ type: "pothole", at: 0.5, lane: 0 }] }),
        P(30, { kind: "junction", options: ["left", "right"], correct: "left" }),
        P(24, { powerup: { type: "ladoo", at: 0.4, lane: 0.25 }, hazards: [{ type: "cricket", at: 0.8, lane: -0.1 }] }),
        P(28, { kind: "junction", options: ["straight", "right"], correct: "straight" }),
        P(18, { kind: "finish" }),
      ],
    },
  ];

  function branchPoints(x, z, h, turn, len) {
    const pts = [];
    const n = Math.max(2, Math.round(len));
    const dh = turn / n;
    let cx = x;
    let cz = z;
    let ch = h;
    for (let i = 0; i <= n; i++) {
      pts.push({ x: cx, z: cz, h: ch });
      ch += dh;
      cx += Math.sin(ch) * STEP;
      cz += Math.cos(ch) * STEP;
    }
    return pts;
  }

  function buildStage(def) {
    const rng = mulberry32(def.seed || 1);
    const pieces = def.pieces.map(function (raw, index) {
      const kind = raw.kind || "road";
      let curve = raw.curve || 0;
      if (kind === "junction") curve = turnOf(raw.correct);
      return {
        len: raw.len,
        curve: curve,
        width: raw.width || def.width || 7.2,
        kind: kind,
        options: raw.options ? raw.options.slice() : null,
        correct: raw.correct || null,
        hazards: raw.hazards ? raw.hazards.map(function (h) { return Object.assign({}, h); }) : [],
        powerup: raw.powerup ? Object.assign({}, raw.powerup) : null,
        door: !!raw.door,
        puddle: !!raw.puddle,
        index: index,
        start: 0,
        end: 0,
        branches: [],
      };
    });

    const samples = [];
    let x = 0;
    let z = 0;
    let h = 0;
    let dist = 0;
    const hazardList = [];
    const powerups = [];

    pieces.forEach(function (piece) {
      piece.start = dist;
      const n = Math.max(1, Math.round(piece.len));
      const dh = piece.curve / n;
      if (piece.kind === "junction") {
        const poseH = h;
        const poseX = x;
        const poseZ = z;
        piece.options.forEach(function (opt) {
          if (opt === piece.correct) return;
          piece.branches.push({
            name: opt,
            pts: branchPoints(poseX, poseZ, poseH, turnOf(opt), piece.len),
          });
        });
      }
      for (let i = 0; i < n; i++) {
        samples.push({
          dist: dist,
          x: x,
          z: z,
          heading: h,
          width: piece.width,
          pieceIndex: piece.index,
          curvature: dh / STEP,
        });
        h += dh;
        x += Math.sin(h) * STEP;
        z += Math.cos(h) * STEP;
        dist += STEP;
      }
      piece.end = dist;
      piece.hazards.forEach(function (hz, hi) {
        const abs = piece.start + hz.at * (piece.end - piece.start);
        const lateral = (hz.lane || 0) * piece.width * 0.38;
        const type = hz.type;
        const item = {
          id: piece.index + ":" + hi + ":" + type,
          abs: abs,
          type: type,
          lane: hz.lane || 0,
          lateral: lateral,
          len: type === "band" ? 9 : type === "oncoming" ? 2.4 : type === "cricket" ? 2.8 : 1.5,
          radius: type === "band" ? 2.4 : type === "cow" ? 1.05 : type === "oncoming" ? 1.15 : type === "cricket" ? 1.25 : 0.72,
          pieceIndex: piece.index,
          vel: type === "oncoming" ? -(9 + (hz.lane || 0)) : 0,
        };
        hazardList.push(item);
      });
      if (piece.powerup) {
        const abs = piece.start + piece.powerup.at * (piece.end - piece.start);
        powerups.push({
          id: "pu-" + piece.index,
          abs: abs,
          type: piece.powerup.type,
          lateral: (piece.powerup.lane || 0) * piece.width * 0.38,
        });
      }
    });

    if (samples.length) {
      const last = samples[samples.length - 1];
      samples.push({
        dist: dist,
        x: x,
        z: z,
        heading: h,
        width: last.width,
        pieceIndex: last.pieceIndex,
        curvature: 0,
      });
    }

    const props = garnish(samples, pieces, rng);

    return {
      id: def.id,
      name: def.name,
      place: def.place,
      brief: def.brief,
      sky: def.sky || "gold",
      mudRate: def.mudRate || 0,
      seed: def.seed || 1,
      pieces: pieces,
      samples: samples,
      total: dist,
      step: STEP,
      hazards: hazardList,
      powerups: powerups,
      props: props,
    };
  }

  function garnish(samples, pieces, rng) {
    const props = [];
    const colors = ["#e07a5f", "#f2cc8f", "#81b29a", "#3d5a80", "#ee9b00", "#2a9d8f", "#c44536", "#6d597a", "#e9c46a", "#f4a261"];
    for (let i = 4; i < samples.length; i += 7) {
      const s = samples[i];
      const piece = pieces[s.pieceIndex];
      if (piece && piece.kind === "finish" && i > samples.length - 12) continue;
      const side = i % 14 === 0 ? 0 : (props.length % 2 === 0 ? -1 : 1);
      if (side === 0) continue;
      const roll = rng();
      let type = "building";
      if (roll > 0.82) type = "neem";
      else if (roll > 0.72) type = "palm";
      else if (roll > 0.6) type = "stall";
      else if (roll > 0.5) type = "lamp";
      else if (roll > 0.44) type = "tank";
      const half = s.width / 2;
      const push = half + 1.6 + rng() * 2.4;
      const rx = Math.cos(s.heading);
      const rz = -Math.sin(s.heading);
      props.push({
        x: s.x + rx * side * push,
        z: s.z + rz * side * push,
        heading: s.heading,
        type: type,
        side: side,
        color: colors[Math.floor(rng() * colors.length)],
        w: 2.2 + rng() * 2.4,
        h: type === "building" ? 4 + rng() * 7 : 2.5,
        seed: rng(),
        dist: s.dist,
      });
    }
    const finish = pieces[pieces.length - 1];
    if (finish && samples.length) {
      const s = samples[Math.min(samples.length - 1, Math.floor(finish.start))];
      props.push({
        x: s.x,
        z: s.z,
        heading: s.heading,
        type: "shutter",
        side: 1,
        color: "#f4d35e",
        w: 3.2,
        h: 3,
        seed: 0.2,
        dist: finish.start,
      });
    }
    return props;
  }

  function buildEndless(seed) {
    const rng = mulberry32(seed);
    const pieces = [P(18 + Math.floor(rng() * 8))];
    const skies = ["gold", "dusk", "rain"];
    for (let i = 0; i < 6; i++) {
      if (rng() < 0.55) {
        const pool = [
          { type: "cow", at: 0.5, lane: rng() < 0.5 ? -0.2 : 0.22 },
          { type: "pothole", at: 0.45, lane: (rng() - 0.5) * 0.3 },
          { type: "cricket", at: 0.6, lane: 0 },
          { type: "oncoming", at: 0.25, lane: 0 },
          { type: "band", at: 0.4, lane: 0 },
        ];
        pieces.push(P(20 + Math.floor(rng() * 10), { hazards: [pool[Math.floor(rng() * pool.length)]] }));
      } else {
        pieces.push(P(16 + Math.floor(rng() * 8), { curve: (rng() - 0.5) * 0.36 }));
      }
      const options = rng() < 0.45 ? ["left", "right"] : ["left", "straight", "right"];
      const correct = options[Math.floor(rng() * options.length)];
      const puRoll = rng();
      const powerup = puRoll > 0.72 ? { type: puRoll > 0.88 ? "ladoo" : "chai", at: 0.5, lane: (rng() - 0.5) * 0.4 } : null;
      pieces.push(P(28 + Math.floor(rng() * 8), {
        kind: "junction",
        options: options,
        correct: correct,
        powerup: powerup,
        puddle: rng() > 0.7,
      }));
    }
    pieces.push(P(16, { kind: "finish" }));
    return buildStage({
      id: "endless-" + seed,
      name: "One More Gali",
      place: "Somewhere after the neem tree",
      brief: "Chotu flipped the tablet around and said he knows a shortcut. He does not.",
      sky: skies[seed % 3],
      mudRate: 0.02 + (seed % 5) * 0.008,
      width: 6.4 + (seed % 3) * 0.35,
      seed: seed,
      pieces: pieces,
    });
  }

  function sampleAt(stage, dist) {
    const samples = stage.samples;
    if (!samples.length) return { dist: 0, x: 0, z: 0, heading: 0, width: 7, pieceIndex: 0, curvature: 0 };
    const d = clamp(dist, 0, stage.total);
    let i = Math.floor(d / stage.step);
    if (i >= samples.length - 1) return samples[samples.length - 1];
    if (i < 0) i = 0;
    const a = samples[i];
    const b = samples[i + 1];
    const span = b.dist - a.dist || 1;
    const t = clamp((d - a.dist) / span, 0, 1);
    return {
      dist: d,
      x: a.x + (b.x - a.x) * t,
      z: a.z + (b.z - a.z) * t,
      heading: a.heading + (b.heading - a.heading) * t,
      width: a.width + (b.width - a.width) * t,
      pieceIndex: t < 0.5 ? a.pieceIndex : b.pieceIndex,
      curvature: a.curvature + (b.curvature - a.curvature) * t,
    };
  }

  function pieceAt(stage, dist) {
    const pieces = stage.pieces;
    for (let i = 0; i < pieces.length; i++) {
      if (dist < pieces[i].end || i === pieces.length - 1) return pieces[i];
    }
    return pieces[pieces.length - 1];
  }

  function poseAt(stage, state) {
    const s = sampleAt(stage, state.dist);
    const rx = Math.cos(s.heading);
    const rz = -Math.sin(s.heading);
    return {
      x: s.x + rx * state.lateral,
      z: s.z + rz * state.lateral,
      heading: s.heading,
      width: s.width,
      curvature: s.curvature,
      pieceIndex: s.pieceIndex,
    };
  }

  function nextJunction(stage, dist) {
    for (let i = 0; i < stage.pieces.length; i++) {
      const p = stage.pieces[i];
      if (p.kind === "junction" && p.end > dist + 0.4) return p;
    }
    return null;
  }

  function hazardsAhead(stage, state, range) {
    const out = [];
    stage.hazards.forEach(function (h) {
      if (h.type === "oncoming") return;
      const gap = h.abs - state.dist;
      if (gap > -2 && gap < range) out.push(h);
    });
    (state.movers || []).forEach(function (h) {
      const gap = h.abs - state.dist;
      if (gap > -3 && gap < range) out.push(h);
    });
    out.sort(function (a, b) { return a.abs - b.abs; });
    return out;
  }

  function choiceFromAim(aim, options) {
    if (!options || !options.length) return "straight";
    if (Math.abs(aim) < 0.22) {
      if (options.indexOf("straight") >= 0) return "straight";
      return "none";
    }
    const want = aim < 0 ? "left" : "right";
    if (options.indexOf(want) >= 0) return want;
    if (options.indexOf("straight") >= 0 && Math.abs(aim) < 0.55) return "straight";
    return "none";
  }

  function createRun(stage) {
    const movers = [];
    stage.hazards.forEach(function (h) {
      if (h.type === "oncoming") movers.push(Object.assign({}, h));
    });
    return {
      dist: 0,
      lateral: 0,
      latVel: 0,
      speed: 0,
      steer: 0,
      health: 100,
      mud: stage.sky === "rain" ? 0.18 : 0.04,
      door: 0,
      tabletTilt: 0,
      tabletVel: 0,
      tabletDropped: false,
      dropAge: 0,
      grip: 1,
      wrongs: 0,
      time: 0,
      hornT: 0,
      hornPush: 0,
      phase: "play",
      crashT: 0,
      rewindDist: 0,
      shake: 0,
      spin: 0,
      slowMo: 0,
      boost: 0,
      aimAccum: 0,
      aimDur: 0,
      pieceIndex: 0,
      resolved: {},
      hit: {},
      got: {},
      call: null,
      banner: null,
      bannerT: 0,
      seed: (stage.seed || 1) * 9973,
      movers: movers,
      stats: { horns: 0, cows: 0, junctions: 0, wrongs: 0, powerups: 0, bands: 0 },
      invuln: 0,
      cheer: null,
    };
  }

  function unitRand(state) {
    state.seed = (Math.imul(state.seed, 1664525) + 1013904223) >>> 0;
    return state.seed / 4294967296;
  }

  function hurt(state, amount, events, kind) {
    if (state.invuln > 0 && kind !== "wreck") return;
    state.health -= amount;
    state.shake = Math.max(state.shake, clamp(amount / 22, 0.25, 1));
    state.invuln = 0.35;
    events.push({ type: "hurt", kind: kind, amount: amount });
    if (state.health <= 0) {
      state.health = 0;
      state.phase = "dead";
      state.banner = "ARRE BABA";
      state.bannerT = 3;
      events.push({ type: "dead", kind: kind });
    }
  }

  function banner(state, text, life) {
    state.banner = text;
    state.bannerT = life || 1.3;
  }

  function step(stage, state, raw, dt) {
    const events = [];
    dt = clamp(dt, 0, 0.05);
    const input = raw || {};
    const throttle = input.throttle ? 1 : 0;
    const brake = input.brake ? 1 : 0;
    const steerIn = clamp(input.steer || 0, -1, 1);
    const grip = input.grip == null ? 1 : input.grip;

    state.time += dt;
    state.shake = Math.max(0, state.shake - dt * 1.5);
    state.hornT = Math.max(0, state.hornT - dt);
    state.hornPush = Math.max(0, state.hornPush - dt);
    state.invuln = Math.max(0, state.invuln - dt);
    state.slowMo = Math.max(0, state.slowMo - dt);
    state.boost = Math.max(0, state.boost - dt);
    state.bannerT = Math.max(0, state.bannerT - dt);
    if (state.bannerT <= 0) state.banner = null;
    if (state.call) {
      state.call.age += dt;
      if (state.call.age > state.call.life) state.call = null;
    }
    state.grip = grip;

    if (state.phase === "crash") {
      state.crashT += dt;
      state.spin += dt * 9;
      state.speed *= 1 - Math.min(1, dt * 3);
      if (state.crashT > 0.85) {
        state.dist = state.rewindDist;
        state.lateral = 0;
        state.latVel = 0;
        state.speed = 6;
        state.spin = 0;
        state.phase = state.health <= 0 ? "dead" : "play";
        if (state.phase === "dead") {
          banner(state, "ARRE BABA", 3);
          events.push({ type: "dead", kind: "junction" });
        }
      }
      return events;
    }

    if (state.phase !== "play") return events;

    const mdt = dt * (state.slowMo > 0 ? 0.6 : 1);

    state.steer += (steerIn - state.steer) * Math.min(1, dt * 7.5);

    let maxSpeed = 17.5 + (state.boost > 0 ? 5 : 0);
    if (state.door > 0.55) maxSpeed -= 2;
    if (throttle) state.speed += mdt * (state.boost > 0 ? 13 : 9.5);
    if (brake) state.speed -= mdt * 18;
    state.speed -= state.speed * mdt * 0.22;
    state.speed = clamp(state.speed, 0, maxSpeed);

    const samp = sampleAt(stage, state.dist);
    const curvePush = -samp.curvature * state.speed * state.speed * 0.2;
    const targetLat = state.steer * (2.5 + state.speed * 0.15);
    state.latVel += (targetLat - state.latVel) * Math.min(1, mdt * 3.4);
    state.latVel += curvePush * mdt;
    if (state.door > 0.45) state.latVel += mdt * 2.1;
    state.lateral += state.latVel * mdt;

    if (input.horn && state.hornT <= 0) {
      state.hornT = 0.28;
      state.hornPush = 1.15;
      state.stats.horns += 1;
      events.push({ type: "horn" });
    }

    state.movers.forEach(function (m) {
      if (m.done) return;
      m.abs += (m.vel || -10) * dt;
      const gap = m.abs - state.dist;
      if (state.hornPush > 0 && gap > 0 && gap < 26) {
        const away = state.lateral >= m.lateral ? -1 : 1;
        m.lateral += away * dt * 7.5;
      }
      if (gap < -8) m.done = true;
    });

    const piece = pieceAt(stage, state.dist);
    if (piece.index !== state.pieceIndex) {
      const prev = stage.pieces[state.pieceIndex];
      if (prev && prev.kind === "junction" && !state.resolved[prev.index] && state.phase === "play") {
        resolveJunction(stage, state, prev, events);
      }
      state.pieceIndex = piece.index;
      state.aimAccum = 0;
      state.aimDur = 0;
      if (piece.door && state.door < 0.2) {
        state.door = 0.25;
        events.push({ type: "door" });
        banner(state, "DOOR!", 1.1);
      }
    }

    if (piece.kind === "junction" && !state.resolved[piece.index]) {
      const t = (state.dist - piece.start) / Math.max(1, piece.end - piece.start);
      if (t > 0.12) {
        state.aimAccum += state.steer * dt;
        state.aimDur += dt;
      }
    }

    state.dist += state.speed * mdt;

    if (piece.kind === "junction" && !state.resolved[piece.index] && state.dist >= piece.end - 0.05 && state.phase === "play") {
      resolveJunction(stage, state, piece, events);
    }

    const half = samp.width / 2;
    if (Math.abs(state.lateral) > half && state.phase === "play") {
      const pen = Math.abs(state.lateral) - half;
      const sign = Math.sign(state.lateral);
      state.speed *= 1 - Math.min(0.28, mdt * (0.35 + pen * 0.25));
      state.mud = clamp(state.mud + mdt * 0.18, 0, 1);
      state.latVel -= sign * mdt * (8 + pen * 5);
      state.lateral -= sign * mdt * (2.4 + pen * 1.6);
      if (state.speed > 3 && state.invuln <= 0) {
        hurt(state, mdt * state.speed * (0.55 + pen * 0.35), events, "scrape");
      }
      events.push({ type: "scrape" });
      if (pen > 1.5 && state.door < 0.2 && state.speed > 8 && unitRand(state) < dt * 0.35) {
        state.door = Math.max(state.door, 0.45);
        events.push({ type: "door" });
      }
    }

    if (state.phase !== "play") return events;

    stage.hazards.forEach(function (h) {
      if (h.type === "oncoming") return;
      considerHazard(stage, state, h, events);
    });
    state.movers.forEach(function (h) {
      if (!h.done) considerHazard(stage, state, h, events);
    });

    stage.powerups.forEach(function (p) {
      if (state.got[p.id]) return;
      if (Math.abs(p.abs - state.dist) < 1.4 && Math.abs(p.lateral - state.lateral) < 1.45) {
        state.got[p.id] = true;
        state.stats.powerups += 1;
        if (p.type === "chai") {
          state.slowMo = Math.max(state.slowMo, 4);
          state.mud = Math.max(0, state.mud - 0.35);
          banner(state, "CUTTING CHAI", 1.2);
        } else if (p.type === "ladoo") {
          state.health = Math.min(100, state.health + 36);
          banner(state, "LADOO", 1.2);
        } else if (p.type === "dhol") {
          state.boost = Math.max(state.boost, 2.6);
          banner(state, "DHOL BOOST", 1.2);
        }
        events.push({ type: "powerup", kind: p.type });
      }
    });

    if (piece.puddle && Math.abs((piece.start + piece.end) / 2 - state.dist) < 2.2) {
      if (!state.hit["puddle-" + piece.index]) {
        state.hit["puddle-" + piece.index] = true;
        state.mud = clamp(state.mud + 0.28, 0, 1);
        state.shake = Math.max(state.shake, 0.45);
        state.tabletVel += 2.4;
        events.push({ type: "puddle" });
      }
    }

    state.mud = clamp(state.mud + stage.mudRate * dt, 0, 1);
    if (input.wipe) {
      state.mud = Math.max(0, state.mud - dt * 0.62);
      events.push({ type: "wipe" });
    }

    if (input.doorShut) state.door = Math.max(0, state.door - dt * 2.4);
    else if (state.door > 0.02) state.door = Math.min(1, state.door + dt * 0.35);

    const jolted = Math.abs(state.latVel) * 0.08 + state.shake * 1.6;
    const spring = state.tabletDropped ? 1 : grip > 0.55 ? 14 : 2.2;
    state.tabletVel += (-state.tabletTilt * spring - state.latVel * 0.35) * dt;
    state.tabletVel += (unitRand(state) - 0.5) * jolted * dt * 8;
    state.tabletVel *= 1 - Math.min(1, dt * 3);
    state.tabletTilt += state.tabletVel * dt;
    if (!state.tabletDropped && state.time > 2.2 && Math.abs(state.tabletTilt) > 1.25 && grip < 0.45) {
      state.tabletDropped = true;
      state.dropAge = 0;
      events.push({ type: "tablet" });
      banner(state, "TABLET!", 1.2);
    }
    if (state.tabletDropped) {
      state.dropAge += dt;
      const auto = input.autoGrab && state.dropAge > 1.45;
      if (input.grab || auto) {
        state.tabletDropped = false;
        state.tabletTilt = 0;
        state.tabletVel = 0;
        state.dropAge = 0;
        events.push({ type: "grab" });
      }
    } else if (grip > 0.7) {
      state.tabletTilt *= 1 - Math.min(1, dt * 2);
    }

    if (state.dist >= stage.total - 1.25 && state.phase === "play") {
      state.dist = stage.total;
      state.speed = 0;
      state.phase = "clear";
      banner(state, "CUT! NICE SCENE.", 2.4);
      events.push({ type: "clear" });
    }

    return events;
  }

  function resolveJunction(stage, state, piece, events) {
    if (state.resolved[piece.index] || state.phase !== "play") return;
    state.resolved[piece.index] = true;
    const aim = state.aimDur > 0.05 ? state.aimAccum / state.aimDur : state.steer;
    const choice = choiceFromAim(aim, piece.options);
    if (choice !== piece.correct) {
      state.wrongs += 1;
      state.stats.wrongs += 1;
      state.health -= 18;
      state.shake = 1;
      state.speed *= 0.25;
      events.push({ type: "wrong", choice: choice, correct: piece.correct });
      if (state.health <= 0) {
        state.health = 0;
        state.phase = "dead";
        banner(state, "ARRE BABA", 3);
        events.push({ type: "dead", kind: "junction" });
        return;
      }
      state.phase = "crash";
      state.crashT = 0;
      state.rewindDist = piece.start + 1.5;
      state.resolved[piece.index] = false;
      banner(state, "WRONG GALI", 1.15);
      return;
    }
    state.stats.junctions += 1;
    state.cheer = piece.correct;
    events.push({ type: "corner", dir: piece.correct });
  }

  function considerHazard(stage, state, h, events) {
    if (state.hit[h.id] || state.phase !== "play") return;
    const along = h.abs - state.dist;
    const halfLen = (h.len || 1.2) / 2;
    if (Math.abs(along) > halfLen) return;
    const near = Math.abs(state.lateral - h.lateral) < h.radius;
    if (h.type === "band") {
      if (state.speed <= 7.2) {
        state.hit[h.id] = true;
        state.stats.bands += 1;
        state.speed = Math.min(state.speed, 6.5);
        banner(state, "RESPECT THE BAND", 1.1);
        events.push({ type: "band", polite: true });
        return;
      }
      if (near) {
        state.hit[h.id] = true;
        hurt(state, 16, events, "band");
        state.speed *= 0.45;
        banner(state, "THAT WAS THE NEPHEW", 1.2);
        events.push({ type: "band", polite: false });
      }
      return;
    }
    if (!near) {
      if (h.type === "cow" && along < 0) {
        state.hit[h.id] = true;
        state.stats.cows += 1;
        events.push({ type: "cow-ok" });
      }
      if ((h.type === "cricket" || h.type === "oncoming" || h.type === "pothole") && along < -halfLen) {
        state.hit[h.id] = true;
      }
      return;
    }
    state.hit[h.id] = true;
    if (h.type === "cow") {
      hurt(state, 26, events, "cow");
      state.speed *= 0.35;
      state.tabletVel += 3;
      banner(state, "MOO", 1.1);
      events.push({ type: "cow" });
    } else if (h.type === "pothole") {
      hurt(state, 7, events, "pothole");
      state.speed *= 0.82;
      state.shake = Math.max(state.shake, 0.7);
      state.mud = clamp(state.mud + 0.08, 0, 1);
      state.tabletVel += 2.2;
      if (unitRand(state) < 0.4) {
        state.door = Math.max(state.door, 0.35);
        events.push({ type: "door" });
      }
      events.push({ type: "pothole" });
    } else if (h.type === "cricket") {
      hurt(state, 12, events, "cricket");
      state.speed *= 0.5;
      banner(state, "OUT!", 1);
      events.push({ type: "cricket" });
    } else if (h.type === "oncoming") {
      hurt(state, 20, events, "traffic");
      state.speed *= 0.4;
      banner(state, "HORN WAS FREE", 1.1);
      events.push({ type: "traffic" });
    }
  }

  return {
    STAGES: STAGES,
    buildStage: buildStage,
    buildEndless: buildEndless,
    createRun: createRun,
    step: step,
    sampleAt: sampleAt,
    poseAt: poseAt,
    pieceAt: pieceAt,
    nextJunction: nextJunction,
    hazardsAhead: hazardsAhead,
    choiceFromAim: choiceFromAim,
    clamp: clamp,
  };
});
