const W = require("./world.js");

function drive(stage, behavior, limit) {
  const state = W.createRun(stage);
  let guard = 0;
  const cap = limit || 25000;
  while (state.phase !== "clear" && state.phase !== "dead" && guard < cap) {
    const input = behavior(stage, state);
    W.step(stage, state, input, 1 / 60);
    guard++;
  }
  return { state: state, ticks: guard };
}

function perfect(stage, state) {
  const input = {
    throttle: 1,
    brake: 0,
    steer: 0,
    grip: 1,
    wipe: state.mud > 0.35,
    doorShut: state.door > 0.15,
    autoGrab: true,
    horn: false,
  };
  const j = W.nextJunction(stage, state.dist);
  const inWindow = j && state.dist > j.start - 2 && state.dist < j.end + 0.2;
  if (inWindow) {
    input.steer = j.correct === "left" ? -1 : j.correct === "right" ? 1 : 0;
  }
  const threats = W.hazardsAhead(stage, state, 16).filter(function (h) {
    return !state.hit[h.id];
  });
  let dodging = false;
  for (let i = 0; i < threats.length; i++) {
    const h = threats[i];
    const gap = h.abs - state.dist;
    if (gap < 0 || gap > 14) continue;
    if (h.type === "band") {
      if (state.speed > 6.2) {
        input.brake = 1;
        input.throttle = 0;
      } else {
        input.throttle = 1;
        input.brake = 0;
      }
      continue;
    }
    if (h.type === "oncoming") input.horn = gap < 20;
    if (Math.abs((h.lateral || 0) - state.lateral) < 1.8 && !inWindow) {
      input.steer = (h.lateral || 0) >= state.lateral ? -0.95 : 0.95;
      dodging = true;
    }
  }
  if (!inWindow && !dodging && Math.abs(state.lateral) > 0.35) {
    input.steer = -Math.sign(state.lateral) * clampSteer(state.lateral);
  }
  return input;
}

function clampSteer(lateral) {
  return Math.max(0.35, Math.min(1, Math.abs(lateral) / 1.4));
}

function straight() {
  return { throttle: 1, steer: 0, grip: 1, wipe: true, doorShut: true, autoGrab: true };
}

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exitCode = 1;
    return false;
  }
  console.log("ok:", msg);
  return true;
}

let failed = false;
function check(cond, msg) {
  if (!assert(cond, msg)) failed = true;
}

W.STAGES.forEach(function (def) {
  const stage = W.buildStage(def);
  console.log("\n==", stage.name, "len", stage.total.toFixed(0), "junctions", stage.pieces.filter(function (p) { return p.kind === "junction"; }).length);
  const good = drive(stage, perfect);
  console.log("  perfect", good.state.phase, "t", good.state.time.toFixed(1), "hp", good.state.health.toFixed(0), "wrongs", good.state.wrongs, "junctions", good.state.stats.junctions, "ticks", good.ticks);
  check(good.state.phase === "clear", stage.id + " perfect clears");
  check(good.state.wrongs === 0, stage.id + " perfect takes no wrong gali");
  check(good.state.health > 40, stage.id + " perfect keeps health, got " + good.state.health.toFixed(0));

  const bad = drive(stage, straight, 8000);
  console.log("  straight", bad.state.phase, "hp", bad.state.health.toFixed(0), "wrongs", bad.state.wrongs, "dist", bad.state.dist.toFixed(0));
  check(bad.state.phase === "dead" || bad.state.wrongs > 0, stage.id + " ignoring calls gets punished");
});

const aimCases = [
  [0, ["left", "right"], "none"],
  [-0.8, ["left", "right"], "left"],
  [0.8, ["left", "right"], "right"],
  [0, ["left", "straight", "right"], "straight"],
  [-0.9, ["left", "straight", "right"], "left"],
];
aimCases.forEach(function (c) {
  const got = W.choiceFromAim(c[0], c[1]);
  check(got === c[2], "aim " + c[0] + " -> " + got + " expected " + c[2]);
});

const endless = W.buildEndless(3);
const endRun = drive(endless, perfect);
console.log("\nendless", endRun.state.phase, "hp", endRun.state.health.toFixed(0), "wrongs", endRun.state.wrongs);
check(endRun.state.phase === "clear", "endless perfect clears");

if (failed) {
  console.error("\nselftest failed");
  process.exit(1);
}
console.log("\nall selftests passed");
