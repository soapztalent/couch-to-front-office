(function () {
  const W = window.ArreWorld;
  const Draw = window.ArreDraw;
  const audio = new window.ArreAudio();

  const driverCanvas = document.getElementById("driver");
  const navCanvas = document.getElementById("nav");
  const menu = document.getElementById("menu");
  const brief = document.getElementById("brief");
  const card = document.getElementById("card");
  const hint = document.getElementById("hint");
  const waiting = document.getElementById("waiting");
  const navUi = document.getElementById("nav-ui");

  const keys = {};
  let pointerDown = false;
  let wiping = false;
  let peek = false;
  let paused = false;
  let screen = "menu";
  let playMode = "solo";
  let stageIndex = 0;
  let endlessSeed = 80;
  let stage = null;
  let state = null;
  let attractStage = null;
  let attract = null;
  let ai = null;
  let hintUntil = 0;
  let wipeSfx = 0;
  let last = performance.now();
  let channel = null;
  let remote = null;
  let remoteAt = 0;
  let sentHello = false;

  const COLORS = {
    left: "#c6ff4a",
    right: "#8ecbff",
    straight: "#ffe566",
    slow: "#ffb15a",
    bad: "#ff8d7a",
    info: "#ffe7a8",
  };

  function freshAI() {
    return { fired: {}, fumble: 0, wait: 0, pending: null, correctDir: null, correctIn: 0, mudNag: -10, repeatAt: 0, said: {} };
  }

  function setCall(text, sub, color, life) {
    if (!state) return;
    state.call = { text: text, sub: sub || "", color: color, life: life || 1.2, age: 0 };
  }

  function say(text) {
    audio.say(text);
  }

  function shoutDir(dir, correction, quiet) {
    const lines = {
      left: ["LEFT! LEFT!", "LEFT, bhai, LEFT!"],
      right: ["RIGHT! RIGHT!", "RIGHT side, RIGHT!"],
      straight: ["STRAIGHT!", "STRAIGHT! Don't get clever!"],
      slow: ["SLOW! SLOW!", "EASE OFF, hero!"],
    };
    const steerHint = {
      left: "Wheel to the left.",
      right: "Wheel to the right.",
      straight: "Hold the middle.",
      slow: "Foot off. Let the band dance.",
    };
    const pool = lines[dir] || lines.straight;
    const text = (correction ? "WAIT— " : "") + pool[Math.floor(Math.random() * pool.length)];
    setCall(text, correction ? "Ignore the first shout." : steerHint[dir] || "", COLORS[dir] || COLORS.info, 1.35);
    if (!quiet) {
      say(text.replace("—", ""));
      audio.ui();
    }
  }

  function shoutHazard(h) {
    const right = (h.lateral || 0) >= 0;
    const map = {
      cow: ["COW!", right ? "She's on the right. Slip left." : "She's on the left. Slip right."],
      pothole: ["POTHOLE!", "Your spine will file a complaint."],
      cricket: ["CRICKET!", "Tiny legends. No helmets. Go around."],
      oncoming: ["HORN!", "Wrong-way scooter. Be loud, then move."],
      band: ["SLOW!", "Wedding band. Creep. Do not plough."],
    };
    const pair = map[h.type];
    if (!pair) return;
    setCall(pair[0], pair[1], COLORS.slow, 1.35);
    say(pair[0] + " " + pair[1]);
  }

  function updateChotu(dt) {
    if (playMode !== "solo" || !ai || !state || state.phase !== "play") return;
    ai.fumble = Math.max(0, ai.fumble - dt);
    ai.wait = Math.max(0, ai.wait - dt);
    if (ai.correctIn > 0) {
      ai.correctIn -= dt;
      if (ai.correctIn <= 0 && ai.correctDir) {
        shoutDir(ai.correctDir, true);
        ai.correctDir = null;
      }
    }
    const junction = W.nextJunction(stage, state.dist);
    if (junction && !ai.fired["j" + junction.index] && !state.tabletDropped && !ai.pending) {
      const distLeft = junction.start - state.dist;
      const lead = Math.max(18, state.speed * 1.2);
      if (distLeft < lead && distLeft > 1.5) {
        ai.fired["j" + junction.index] = true;
        let dir = junction.correct;
        if (Math.random() < 0.08 && junction.options.length > 1) {
          const other = junction.options.filter(function (o) { return o !== junction.correct; });
          if (other.length) {
            dir = other[0];
            ai.correctDir = junction.correct;
            ai.correctIn = 0.62;
          }
        }
        ai.pending = dir;
        ai.wait = 0.05 + Math.random() * 0.22;
      }
    }
    if (ai.wait <= 0 && ai.pending && !state.tabletDropped) {
      shoutDir(ai.pending, false);
      ai.pending = null;
    }
    if (!ai.pending && !state.tabletDropped) {
      const threats = W.hazardsAhead(stage, state, 18);
      for (let i = 0; i < threats.length; i++) {
        const h = threats[i];
        if (ai.fired[h.id] || state.hit[h.id]) continue;
        const gap = h.abs - state.dist;
        if (gap < 15 && gap > 4) {
          ai.fired[h.id] = true;
          shoutHazard(h);
          break;
        }
      }
    }
    const live = W.nextJunction(stage, state.dist);
    if (live && !ai.correctDir && !ai.pending && !state.tabletDropped && !state.resolved[live.index]) {
      const inside = state.dist > live.start - 6 && state.dist < live.end - 0.8;
      const showing = state.call && state.call.text && state.call.text.indexOf(live.correct === "straight" ? "STRAIGHT" : live.correct.toUpperCase()) >= 0;
      if (inside && !showing && state.time >= ai.repeatAt) {
        shoutDir(live.correct, false, ai.said[live.index]);
        ai.said[live.index] = true;
        ai.repeatAt = state.time + 0.85;
      }
    }
    if (state.mud > 0.78 && state.time - ai.mudNag > 5 && !state.call) {
      ai.mudNag = state.time;
      setCall("WIPE!", "The glass is a chapati. Press F.", COLORS.slow, 1.1);
      say("Wipe the glass!");
    }
  }

  function gripNow() {
    if (playMode === "solo") return ai && ai.fumble > 0 ? 0.12 : 0.94;
    if (pointerDown || keys.ShiftLeft || keys.ShiftRight) return 1;
    if (remote && performance.now() - remoteAt < 400 && remote.grip) return 1;
    return 0.15;
  }

  function gather() {
    const solo = playMode === "solo";
    let steer = 0;
    if (keys.ArrowLeft) steer -= 1;
    if (keys.ArrowRight) steer += 1;
    if (solo && keys.KeyA) steer -= 1;
    if (solo && keys.KeyD) steer += 1;
    if (peek && solo) steer += 0.55;
    steer = Math.max(-1, Math.min(1, steer));
    const throttle = keys.ArrowUp || (solo && keys.KeyW);
    const brake = keys.ArrowDown || (solo && keys.KeyS);
    const wipe = wiping || (solo && keys.KeyF) || (!solo && keys.KeyV) || !!(remote && remote.wipe);
    const doorShut = (solo && keys.KeyE) || (!solo && keys.KeyN) || !!(remote && remote.door);
    const grab = keys.KeyG || !!(remote && remote.grab);
    return {
      throttle: !!throttle,
      brake: !!brake,
      steer: steer,
      horn: !!keys.Space,
      wipe: !!wipe,
      doorShut: !!doorShut,
      grip: gripNow(),
      grab: !!grab,
      autoGrab: solo,
    };
  }

  function handleEvents(events) {
    events.forEach(function (ev) {
      if (ev.type === "horn") audio.horn();
      else if (ev.type === "cow") { audio.moo(); audio.crash(); }
      else if (ev.type === "cow-ok") audio.moo();
      else if (ev.type === "hurt" && ev.kind !== "scrape") audio.crash();
      else if (ev.type === "pothole") {
        audio.crash();
        if (ai) ai.fumble = Math.max(ai.fumble, 0.9);
      }
      else if (ev.type === "tablet") {
        audio.tablet();
        setCall("TABLET!", "It is in the footwell.", COLORS.bad, 1.2);
        say("The tablet! I dropped the tablet!");
        if (ai) ai.fumble = Math.max(ai.fumble, 1.2);
      }
      else if (ev.type === "grab") {
        audio.ui();
        setCall("GOT IT!", "Eyes front. I am a professional.", COLORS.info, 1);
        say("Got it. Eyes front.");
      }
      else if (ev.type === "door") {
        audio.door();
        if (!state.call) {
          setCall("DOOR!", "It is sightseeing. Slam it.", COLORS.bad, 1.1);
          say("The door! Shut the door!");
        }
      }
      else if (ev.type === "wrong") {
        audio.crash();
        const again = W.nextJunction(stage, state.rewindDist || state.dist);
        if (ai && again) delete ai.fired["j" + again.index];
        setCall("WRONG GALI!", "I will say it again. Louder.", COLORS.bad, 1.15);
        say("Wrong gali!");
      }
      else if (ev.type === "corner") audio.dhol();
      else if (ev.type === "powerup") {
        if (ev.kind === "chai") { audio.chai(); say("Cutting chai. Time behaves."); }
        else if (ev.kind === "ladoo") { audio.chai(); say("Ladoo. The bumper forgives you."); }
        else audio.dhol();
      }
      else if (ev.type === "clear") audio.clear();
      else if (ev.type === "dead") audio.crash();
      else if (ev.type === "puddle") audio.wipe();
      else if (ev.type === "band" && ev.polite) say("See? Civilization.");
    });
  }

  function show(el, on) {
    if (!el) return;
    el.hidden = !on;
  }

  function applyChrome() {
    const playing = screen === "play";
    document.body.classList.toggle("split", playing && playMode === "split");
    document.body.classList.toggle("peek", playing && peek && playMode === "solo");
    document.body.classList.toggle("nav-only", playMode === "navigator");
    document.body.classList.toggle("waiting", playMode === "navigator" && !stage);
    show(menu, screen === "menu" && playMode !== "navigator");
    show(brief, screen === "brief");
    show(card, screen === "card");
    hint.classList.toggle("on", playing && performance.now() < hintUntil && playMode !== "navigator");
  }

  function loadStage(index) {
    if (index < W.STAGES.length) {
      stage = W.buildStage(W.STAGES[index]);
      stageIndex = index;
    } else {
      endlessSeed += 1;
      stage = W.buildEndless(endlessSeed);
      stageIndex = index;
    }
    state = W.createRun(stage);
    ai = freshAI();
  }

  function openBrief() {
    screen = "brief";
    paused = false;
    document.getElementById("brief-kicker").textContent = stage.place;
    document.getElementById("brief-title").textContent = stage.name;
    document.getElementById("brief-copy").textContent = stage.brief;
    const who = playMode === "split" ? "Passenger has J K L. Driver has the arrows." : "Chotu calls the galis. You own the wheel.";
    document.getElementById("brief-who").textContent = who;
    applyChrome();
  }

  function begin() {
    screen = "play";
    paused = false;
    hintUntil = performance.now() + 9000;
    hint.textContent = playMode === "split"
      ? "ARROWS drive    SPACE horn    J K L yell    hold mouse to grip    V wipe    N door    G grab"
      : "ARROWS or WASD drive    SPACE horn    F wipe    E door    TAB peek (the car drifts)";
    applyChrome();
    audio.unlock();
    setCall("TABLET'S LIVE", "I talk. You turn. We both panic a little.", COLORS.info, 1.7);
    say("Tablet is live. I talk. You turn.");
    if (playMode === "driver-net") ensureChannel();
  }

  function finishCard(kind) {
    screen = "card";
    paused = false;
    const title = document.getElementById("card-title");
    const copy = document.getElementById("card-copy");
    const stats = document.getElementById("card-stats");
    const next = document.getElementById("card-next");
    if (kind === "clear") {
      title.textContent = "CUT! NICE SCENE.";
      copy.textContent = stage.name + " survives. The shutter can wait a minute.";
      next.hidden = false;
    } else {
      title.textContent = "ARRE BABA.";
      copy.textContent = "The gali won this round. The cow is unbothered. The tablet is judging you.";
      next.hidden = true;
    }
    const s = state.stats;
    stats.innerHTML = "";
    [
      state.time.toFixed(1) + "s",
      s.junctions + " galis",
      s.wrongs + " wrong turns",
      s.cows + " cows respected",
      s.horns + " horns",
      s.powerups + " snacks",
    ].forEach(function (text) {
      const span = document.createElement("span");
      span.textContent = text;
      stats.appendChild(span);
    });
    applyChrome();
  }

  function ensureChannel() {
    if (channel || !window.BroadcastChannel) return;
    channel = new BroadcastChannel("arre-left-gali");
    channel.onmessage = function (ev) {
      const msg = ev.data || {};
      if (playMode === "navigator" && msg.kind === "state") {
        remoteAt = performance.now();
        adoptPacket(msg);
      } else if ((playMode === "driver-net" || playMode === "split") && msg.kind === "nav") {
        remote = msg;
        remoteAt = performance.now();
        if (msg.call && msg.callId !== remoteCallId) {
          remoteCallId = msg.callId;
          shoutDir(msg.call, false);
        }
      } else if (msg.kind === "hello" && playMode === "driver-net") {
        sentHello = true;
      }
    };
  }

  let remoteCallId = 0;
  let localCallSeq = 1;

  function publishNav(callDir) {
    if (!channel) return;
    const msg = {
      kind: "nav",
      grip: pointerDown || keys.ShiftLeft || keys.ShiftRight,
      wipe: keys.KeyV || wiping,
      grab: keys.KeyG,
      door: keys.KeyN,
      call: callDir || null,
      callId: callDir ? localCallSeq++ : 0,
    };
    channel.postMessage(msg);
  }

  function publishState() {
    if (!channel || !state) return;
    channel.postMessage({
      kind: "state",
      stageIndex: stageIndex,
      endlessSeed: endlessSeed,
      run: {
        dist: state.dist,
        lateral: state.lateral,
        latVel: state.latVel,
        speed: state.speed,
        steer: state.steer,
        health: state.health,
        mud: state.mud,
        door: state.door,
        tabletTilt: state.tabletTilt,
        tabletDropped: state.tabletDropped,
        grip: state.grip,
        phase: state.phase,
        shake: state.shake,
        spin: state.spin,
        slowMo: state.slowMo,
        boost: state.boost,
        time: state.time,
        call: state.call,
        banner: state.banner,
        bannerT: state.bannerT,
        wrongs: state.wrongs,
        hornT: state.hornT,
        stats: state.stats,
        movers: state.movers,
        hit: state.hit,
        got: state.got,
      },
    });
  }

  function adoptPacket(msg) {
    const idx = msg.stageIndex || 0;
    if (!stage || stageIndex !== idx || (idx >= W.STAGES.length && stage.seed !== msg.endlessSeed)) {
      if (idx < W.STAGES.length) stage = W.buildStage(W.STAGES[idx]);
      else stage = W.buildEndless(msg.endlessSeed || 1);
      stageIndex = idx;
      state = W.createRun(stage);
    }
    Object.assign(state, msg.run);
    screen = "play";
    applyChrome();
  }

  function fit(canvas) {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(2, Math.round(rect.width * ratio));
    const h = Math.max(2, Math.round(rect.height * ratio));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    return { ctx: canvas.getContext("2d"), w: w, h: h };
  }

  function drawWorld(whichStage, whichState) {
    const d = fit(driverCanvas);
    if (playMode !== "navigator") Draw.drawDriver(d.ctx, d.w, d.h, whichStage, whichState);
    const navOn = document.body.classList.contains("split") || document.body.classList.contains("peek") || document.body.classList.contains("nav-only");
    if (navOn) {
      const n = fit(navCanvas);
      Draw.drawNavigator(n.ctx, n.w, n.h, whichStage, whichState);
    }
  }

  function loop(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    if (screen === "menu" && playMode !== "navigator") {
      if (!attractStage) {
        attractStage = W.buildStage(W.STAGES[0]);
        attract = W.createRun(attractStage);
      }
      attract.dist = (attract.dist + dt * 14) % Math.max(10, attractStage.total - 8);
      attract.time += dt;
      attract.speed = 12;
      attract.steer = Math.sin(attract.time * 0.7) * 0.2;
      drawWorld(attractStage, attract);
    } else if (playMode === "navigator") {
      ensureChannel();
      publishNav(null);
      if (stage && state) drawWorld(stage, state);
      if (performance.now() - remoteAt > 1000) {
        stage = null;
        applyChrome();
      }
    } else if (stage && state && (screen === "play" || screen === "brief" || screen === "card")) {
      if (screen === "play" && !paused && state.phase === "play") {
        updateChotu(dt);
        const input = gather();
        const events = W.step(stage, state, input, dt);
        handleEvents(events);
        if (input.wipe) {
          wipeSfx -= dt;
          if (wipeSfx <= 0) { audio.wipe(); wipeSfx = 0.18; }
        }
        audio.engineAt(state.speed, state.boost > 0);
        audio.rainAt(stage.sky === "rain");
        if (Math.random() < dt * 0.35) audio.honkFar();
        if (state.phase === "clear") finishCard("clear");
        else if (state.phase === "dead") finishCard("dead");
      } else if (screen === "play" && !paused && state.phase === "crash") {
        const events = W.step(stage, state, gather(), dt);
        handleEvents(events);
        audio.engineAt(state.speed, false);
        if (state.phase === "dead") finishCard("dead");
      } else {
        audio.engineAt(0, false);
      }
      if (playMode === "driver-net") publishState();
      drawWorld(stage, state);
      if (screen === "play" && performance.now() > hintUntil) hint.classList.remove("on");
    }
    requestAnimationFrame(loop);
  }

  document.addEventListener("keydown", function (e) {
    keys[e.code] = true;
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Tab"].indexOf(e.code) >= 0) e.preventDefault();
    if (e.code === "Tab") peek = true;
    if (e.code === "Escape") {
      const title = document.getElementById("card-title");
      if (screen === "play") {
        paused = true;
        screen = "card";
        title.textContent = "INTERVAL";
        document.getElementById("card-copy").textContent = "The gali is holding its breath. Esc to roll.";
        document.getElementById("card-stats").innerHTML = "";
        document.getElementById("card-next").hidden = true;
        show(card, true);
      } else if (screen === "card" && title.textContent === "INTERVAL") {
        paused = false;
        screen = "play";
        show(card, false);
      }
    }
    if (e.code === "KeyM") {
      audio.unlock();
      audio.setMuted(!audio.muted);
    }
    if (screen === "play" && playMode !== "solo") {
      const map = { KeyJ: "left", KeyK: "straight", KeyL: "right", KeyI: "slow" };
      if (map[e.code]) {
        if (playMode === "navigator") publishNav(map[e.code]);
        else shoutDir(map[e.code], false);
      }
    }
    if (e.code === "Enter" && screen === "brief") begin();
  });

  document.addEventListener("keyup", function (e) {
    keys[e.code] = false;
    if (e.code === "Tab") peek = false;
  });

  function bindWipe(canvas) {
    canvas.addEventListener("pointerdown", function (e) {
      if (canvas === navCanvas) pointerDown = true;
      else wiping = true;
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener("pointerup", function () {
      if (canvas === navCanvas) pointerDown = false;
      wiping = false;
    });
    canvas.addEventListener("pointerleave", function () {
      if (canvas === navCanvas) pointerDown = false;
    });
  }
  bindWipe(driverCanvas);
  bindWipe(navCanvas);

  document.getElementById("solo").onclick = function () {
    audio.unlock();
    audio.ui();
    playMode = "solo";
    loadStage(0);
    openBrief();
  };
  document.getElementById("split").onclick = function () {
    audio.unlock();
    audio.ui();
    playMode = "split";
    loadStage(0);
    openBrief();
  };
  document.getElementById("windows").onclick = function () {
    audio.unlock();
    audio.ui();
    playMode = "driver-net";
    ensureChannel();
    const url = new URL(location.href);
    url.searchParams.set("role", "navigator");
    const opened = window.open(url.toString(), "arre-passenger");
    document.getElementById("window-note").hidden = false;
    document.getElementById("window-url").textContent = url.toString();
    if (!opened) document.getElementById("window-url").textContent += "  (popup blocked — open this address)";
    loadStage(0);
    openBrief();
  };
  document.getElementById("go").onclick = function () {
    audio.ui();
    begin();
  };
  document.getElementById("card-retry").onclick = function () {
    audio.ui();
    const idx = stageIndex;
    if (idx < W.STAGES.length) loadStage(idx);
    else {
      endlessSeed -= 1;
      loadStage(idx);
    }
    openBrief();
  };
  document.getElementById("card-next").onclick = function () {
    audio.ui();
    loadStage(stageIndex + 1);
    openBrief();
  };
  document.getElementById("card-menu").onclick = function () {
    audio.ui();
    screen = "menu";
    playMode = playMode === "navigator" ? "navigator" : "solo";
    paused = false;
    applyChrome();
  };

  navUi.querySelectorAll("button[data-call]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      const dir = btn.getAttribute("data-call");
      if (playMode === "navigator") publishNav(dir);
      else if (screen === "play") shoutDir(dir, false);
    });
  });

  window.addEventListener("blur", function () { pointerDown = false; wiping = false; });

  const params = new URLSearchParams(location.search);
  if (params.get("role") === "navigator") {
    playMode = "navigator";
    screen = "play";
    ensureChannel();
    applyChrome();
  } else if (params.get("play") === "1") {
    playMode = params.get("mode") === "split" ? "split" : "solo";
    loadStage(Number(params.get("stage") || 0));
    begin();
  } else {
    applyChrome();
  }

  window.__ARRE = {
    get screen() { return screen; },
    get mode() { return playMode; },
    get state() { return state; },
    get stage() { return stage; },
    get paused() { return paused; },
  };

  requestAnimationFrame(loop);
})();
