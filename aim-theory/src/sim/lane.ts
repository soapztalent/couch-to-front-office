import type { AimFrame } from "../input/types";
import { approach, degBetween, lineOfSight, lookErrorDeg, pitchErrorDeg, yawTo, type Camera, type Seg, type V2 } from "./geom";
import { freshFight, headRadiusDeg, stepFight, type Fight } from "./fight";
import { eyeFor, opponentScene, reviewNote, type ReviewRun, type TraceSample } from "./review";
import {
  EDGE_WALL,
  ENEMY_CLOSE,
  ENEMY_DEEP,
  FAR_ENEMY,
  FAR_WALL,
  HOLD_BOT_END,
  HOLD_BOT_START,
  HOLD_PLAYER,
  LANE,
  NEAR_ENEMY,
} from "./world";

export type Call = "swing" | "hold" | "jiggle" | "isolate";

export type RepSpec = {
  call: Call;
  cueId: string;
  enemy: "close" | "deep";
};

export type RepResult = {
  call: Call;
  cueId: string;
  won: boolean;
  reason: string;
  entrySpeed: number;
  placementDeg: number | null;
  shotSpeed: number | null;
  shotErrorDeg: number | null;
  lowHead: boolean;
  misses: number;
  overcommitted: boolean;
};

export type Actor = { x: number; z: number; alive: boolean; role: "near" | "far" | "hold" };

export type LaneView = {
  camera: Camera;
  walls: Seg[];
  actors: Actor[];
  pip: V2 | null;
  exposed: boolean;
  banner: string;
  rep: number;
  repCount: number;
  cue: string;
  playerSpeed: number;
  reviewing: boolean;
  pov: "you" | "opponent";
  lineId: string;
  sawId: string;
  fixId: string;
  reason: string;
};

const START_YAW = 0.48;
const REP_LIMIT = 7.5;
const JIGGLE_MAX = 0.62;

function enemyPoint(spec: RepSpec): V2 {
  return spec.enemy === "deep" ? ENEMY_DEEP : ENEMY_CLOSE;
}

export class LaneSession {
  readonly results: RepResult[] = [];
  rep = 0;
  phase: "live" | "banner" | "review" | "done" = "live";
  banner = "";
  playerX = LANE.startX;
  playerZ = LANE.playerZ;
  vx = 0;
  yaw = START_YAW;
  pitch = 0;
  actors: Actor[] = [];
  exposed = false;
  pulse: "hit" | "miss" | "hurt" | null = null;
  private bannerT = 0;
  private fight: Fight = freshFight();
  private liveFor = 0;
  private misses = 0;
  private entrySpeed = 0;
  private placement: number | null = null;
  private shotSpeed: number | null = null;
  private shotError: number | null = null;
  private lowHead = false;
  private overcommitted = false;
  private saw = false;
  private covered = false;
  private holdFor = 0;
  private botX = HOLD_BOT_START;
  private botV = 0;
  private doubleFor = 0;
  private seenRoles = new Set<string>();
  private samples: TraceSample[] = [];
  private review: ReviewRun | null = null;
  private reviewT = 0;

  constructor(
    private readonly reps: RepSpec[],
    private readonly cueText: (id: string) => string,
    private readonly isolate: boolean,
  ) {
    this.beginRep();
  }

  get done(): boolean {
    return this.phase === "done";
  }

  finishEarly(): void {
    if (this.phase === "done") return;
    if (this.phase === "live") this.settle("timeout", false, false);
    this.phase = "done";
  }

  update(dt: number, frame: AimFrame): void {
    this.pulse = null;
    if (this.phase === "done") {
      this.applyLook(frame);
      return;
    }
    if (this.phase === "review") {
      this.reviewT += dt;
      if (this.reviewT >= (this.review?.duration ?? 0)) {
        const again = this.review?.retry !== false;
        if (again) this.beginRep();
        else this.advance();
      }
      return;
    }
    if (this.phase === "banner") {
      this.applyLook(frame);
      this.bannerT -= dt;
      if (this.bannerT <= 0) this.advance();
      return;
    }
    this.liveFor += dt;
    this.applyLook(frame);
    this.snap();
    const spec = this.reps[this.rep];
    if (!spec) return;
    if (spec.call === "hold") this.stepHold(dt, frame);
    else if (spec.call === "isolate") this.stepIsolate(dt, frame);
    else this.stepSwing(dt, frame, spec);
  }

  view(): LaneView {
    const spec = this.reps[this.rep];
    if (this.phase === "review" && this.review) {
      const scene = opponentScene(this.review, this.reviewT);
      const lineId = this.reviewT < this.review.sawFor ? this.review.sawId : this.review.fixId;
      return {
        camera: scene.camera,
        walls: scene.walls,
        actors: scene.actors,
        pip: null,
        exposed: false,
        banner: "THEIR VIEW",
        rep: Math.min(this.rep + 1, this.reps.length),
        repCount: this.reps.length,
        cue: this.cueText(lineId),
        playerSpeed: 0,
        reviewing: true,
        pov: "opponent",
        lineId,
        sawId: this.review.sawId,
        fixId: this.review.fixId,
        reason: this.review.reason,
      };
    }
    return {
      camera: {
        x: this.playerX,
        y: LANE.eye,
        z: this.playerZ,
        yaw: this.yaw,
        pitch: this.pitch,
      },
      walls: this.isolate ? [EDGE_WALL, FAR_WALL] : [EDGE_WALL],
      actors: this.actors.map((a) => ({ ...a })),
      pip: this.pipFor(spec),
      exposed: this.exposed,
      banner: this.banner,
      rep: Math.min(this.rep + 1, this.reps.length),
      repCount: this.reps.length,
      cue: spec ? this.cueText(spec.cueId) : "",
      playerSpeed: Math.abs(this.vx),
      reviewing: false,
      pov: "you",
      lineId: "",
      sawId: "",
      fixId: "",
      reason: "",
    };
  }

  private pipFor(spec: RepSpec | undefined): V2 | null {
    if (!spec || this.phase === "banner") return null;
    if (spec.call === "hold") return null;
    if (spec.call === "isolate") {
      const next = this.actors.find((a) => a.alive);
      return next ? { x: next.x, z: next.z } : null;
    }
    return enemyPoint(spec);
  }

  private applyLook(frame: AimFrame): void {
    this.yaw += (frame.yaw * Math.PI) / 180;
    this.pitch += (frame.pitch * Math.PI) / 180;
    const limit = (89 * Math.PI) / 180;
    this.pitch = Math.max(-limit, Math.min(limit, this.pitch));
  }

  private slide(frame: AimFrame, dt: number, allow: boolean): void {
    if (!allow) {
      this.vx = approach(this.vx, 0, LANE.friction * dt);
      return;
    }
    const strafe = frame.strafe;
    if (strafe !== 0) {
      const want = strafe * LANE.maxSpeed;
      const rate = Math.sign(strafe) !== Math.sign(this.vx) && Math.abs(this.vx) > 0.08 ? LANE.counter : LANE.accel;
      this.vx = approach(this.vx, want, rate * dt);
    } else {
      this.vx = approach(this.vx, 0, LANE.friction * dt);
    }
    this.playerX = Math.max(LANE.minX, Math.min(LANE.maxX, this.playerX + this.vx * dt));
    this.playerZ = LANE.playerZ;
  }

  private camera(): Camera {
    return { x: this.playerX, y: LANE.eye, z: this.playerZ, yaw: this.yaw, pitch: this.pitch };
  }

  private stepSwing(dt: number, frame: AimFrame, spec: RepSpec): void {
    this.slide(frame, dt, true);
    const enemy = enemyPoint(spec);
    this.actors = [{ ...enemy, alive: this.fight.winner !== "peeker", role: "near" }];
    const here = { x: this.playerX, z: this.playerZ };
    const exposed = lineOfSight(here, enemy, [EDGE_WALL]);
    this.exposed = exposed;
    if (exposed) {
      this.saw = true;
      if (this.placement == null) this.placement = lookErrorDeg(this.camera(), { ...enemy, y: LANE.head });
    }
    if (this.playerX > JIGGLE_MAX) this.overcommitted = true;
    const offset = degBetween(yawTo(enemy, { x: 0.05, z: -0.2 }), yawTo(enemy, here));
    const shot = frame.firePressed && exposed && this.fight.winner === "none";
    let shotHit = false;
    if (shot) {
      const dist = Math.hypot(enemy.x - here.x, enemy.z - here.z);
      const err = lookErrorDeg(this.camera(), { ...enemy, y: LANE.head });
      const radius = headRadiusDeg(dist, Math.abs(this.vx), LANE.maxSpeed);
      shotHit = err <= radius;
      this.shotSpeed = Math.abs(this.vx);
      this.shotError = err;
      this.lowHead = pitchErrorDeg(this.camera(), { ...enemy, y: LANE.head }) > 3.2 && !shotHit;
      if (!shotHit) {
        this.misses += 1;
        this.pulse = "miss";
      }
    }
    this.fight = stepFight(this.fight, {
      dt,
      exposed,
      speed: Math.abs(this.vx),
      offsetDeg: offset,
      shotHit,
    });
    if (this.fight.armed && this.entrySpeed === 0) this.entrySpeed = this.fight.entrySpeed;
    if (spec.call === "jiggle") {
      if (this.saw && !exposed && this.playerX < -0.02) this.covered = true;
      if (this.fight.winner === "peeker") {
        this.settle("took-fight", false);
        return;
      }
      if (this.fight.winner === "holder") {
        this.settle("died", false);
        return;
      }
      if (this.covered) {
        this.settle(this.overcommitted ? "overcommit" : "jiggle", !this.overcommitted && this.saw);
        return;
      }
    } else if (this.fight.winner === "peeker") {
      this.settle(this.entrySpeed < 0.9 ? "slow-kill" : "kill", true);
      return;
    } else if (this.fight.winner === "holder") {
      this.settle(this.entrySpeed < 0.9 ? "slow" : "died", false);
      return;
    }
    if (this.liveFor > REP_LIMIT) this.settle(this.saw ? "timeout" : "no-swing", false);
  }

  private stepHold(dt: number, frame: AimFrame): void {
    this.playerX = HOLD_PLAYER.x;
    this.playerZ = HOLD_PLAYER.z;
    this.vx = 0;
    this.botV = approach(this.botV, LANE.maxSpeed + 0.3, 26 * dt);
    this.botX = Math.min(HOLD_BOT_END, this.botX + this.botV * dt);
    const bot = { x: this.botX, z: LANE.playerZ };
    const trueLos = lineOfSight(HOLD_PLAYER, bot, [EDGE_WALL]);
    if (trueLos) this.holdFor += dt;
    else this.holdFor = 0;
    const visible = trueLos && this.holdFor > 0.09;
    this.exposed = visible;
    this.actors = visible ? [{ x: bot.x, z: bot.z, alive: true, role: "hold" }] : [];
    if (visible && this.placement == null) {
      this.placement = lookErrorDeg(this.camera(), { x: bot.x, y: LANE.head, z: bot.z });
    }
    let shotHit = false;
    if (frame.firePressed) {
      if (!visible) {
        this.misses += 1;
        this.pulse = "miss";
      } else {
        const dist = Math.hypot(bot.x - HOLD_PLAYER.x, bot.z - HOLD_PLAYER.z);
        const err = lookErrorDeg(this.camera(), { x: bot.x, y: LANE.head, z: bot.z });
        shotHit = err <= headRadiusDeg(dist, 0, LANE.maxSpeed);
        this.shotError = err;
        this.shotSpeed = 0;
        if (!shotHit) {
          this.misses += 1;
          this.pulse = "miss";
        }
      }
    }
    if (shotHit) {
      this.actors = [];
      this.settle("held-win", true);
      return;
    }
    if (trueLos && this.holdFor > 0.24) {
      this.settle("held-loss", false);
      return;
    }
    if (this.liveFor > REP_LIMIT) this.settle("timeout", false);
  }

  private stepIsolate(dt: number, frame: AimFrame): void {
    this.slide(frame, dt, true);
    if (this.actors.length === 0) {
      this.actors = [
        { ...NEAR_ENEMY, alive: true, role: "near" },
        { ...FAR_ENEMY, alive: true, role: "far" },
      ];
    }
    const here = { x: this.playerX, z: this.playerZ };
    const walls = [EDGE_WALL, FAR_WALL];
    const visible = this.actors.filter((a) => a.alive && lineOfSight(here, a, walls));
    this.exposed = visible.length > 0;
    if (visible.length >= 2) this.doubleFor += dt;
    else this.doubleFor = 0;
    const target = this.aimed(visible);
    if (visible.length === 1 && !this.seenRoles.has(visible[0].role)) {
      this.seenRoles.add(visible[0].role);
      this.placement = lookErrorDeg(this.camera(), { ...visible[0], y: LANE.head });
    }
    let killed = false;
    if (frame.firePressed) {
      if (!target) {
        this.misses += 1;
        this.pulse = "miss";
      }
      else {
        const dist = Math.hypot(target.x - here.x, target.z - here.z);
        const err = lookErrorDeg(this.camera(), { ...target, y: LANE.head });
        const hit = err <= headRadiusDeg(dist, Math.abs(this.vx), LANE.maxSpeed);
        this.shotSpeed = Math.abs(this.vx);
        this.shotError = err;
        if (!hit) {
          this.misses += 1;
          this.pulse = "miss";
        } else {
          target.alive = false;
          killed = true;
          this.fight = freshFight();
        }
      }
    }
    if (this.doubleFor > 0.28) {
      this.settle("double", false);
      return;
    }
    const near = this.actors.find((a) => a.role === "near");
    const far = this.actors.find((a) => a.role === "far");
    if (far && !far.alive && near?.alive) {
      this.settle("order", false);
      return;
    }
    if (near && far && !near.alive && !far.alive) {
      this.settle("isolated", true);
      return;
    }
    const stillVisible = this.actors.filter((a) => a.alive && lineOfSight(here, a, walls));
    if (stillVisible.length === 1 && !killed) {
      const only = stillVisible[0];
      const edge = only.role === "far" ? { x: 2.5, z: -0.15 } : { x: 0.05, z: -0.2 };
      const offset = degBetween(yawTo(only, edge), yawTo(only, here));
      this.fight = stepFight(this.fight, {
        dt,
        exposed: true,
        speed: Math.abs(this.vx),
        offsetDeg: offset,
        shotHit: false,
      });
      if (this.fight.winner === "holder") {
        this.settle(this.fight.entrySpeed < 0.9 ? "slow" : "died", false);
        return;
      }
      if (this.entrySpeed === 0 && this.fight.armed) this.entrySpeed = this.fight.entrySpeed;
    } else if (stillVisible.length === 0) {
      this.fight = freshFight();
    }
    if (this.liveFor > REP_LIMIT + 2.5) this.settle(near && !near.alive ? "timeout" : "no-swing", false);
  }

  private aimed(visible: Actor[]): Actor | null {
    if (visible.length === 0) return null;
    let best: Actor | null = null;
    let bestErr = 14;
    for (const actor of visible) {
      const err = lookErrorDeg(this.camera(), { ...actor, y: LANE.head });
      if (err < bestErr) {
        bestErr = err;
        best = actor;
      }
    }
    return best;
  }

  private snap(): void {
    if (this.samples.length > 520) this.samples.shift();
    this.samples.push({
      t: this.liveFor,
      x: this.playerX,
      z: this.playerZ,
      yaw: this.yaw,
      pitch: this.pitch,
      botX: this.botX,
    });
  }

  private settle(reason: string, won: boolean, replay = true): void {
    const spec = this.reps[this.rep];
    if (!spec) return;
    const placement = this.placement;
    const note = replay
      ? reviewNote({
          call: spec.call,
          reason,
          won,
          placementDeg: placement,
          shotSpeed: this.shotSpeed,
          lowHead: this.lowHead,
          misses: this.misses,
        })
      : null;
    if (note) {
      this.snap();
      if (!note.retry) {
        this.results.push({
          call: spec.call,
          cueId: spec.cueId,
          won,
          reason,
          entrySpeed: this.entrySpeed,
          placementDeg: placement,
          shotSpeed: this.shotSpeed,
          shotErrorDeg: this.shotError,
          lowHead: this.lowHead,
          misses: this.misses,
          overcommitted: this.overcommitted,
        });
      }
      this.review = {
        ...note,
        eye: eyeFor(spec, reason, this.actors, this.botX),
        call: spec.call,
        enemy: spec.enemy,
        reason,
        samples: this.samples.slice(),
      };
      this.reviewT = 0;
      this.phase = "review";
      this.banner = "THEIR VIEW";
      this.pulse = null;
      this.vx = 0;
      return;
    }
    this.pulse = won ? "hit" : "hurt";
    this.results.push({
      call: spec.call,
      cueId: spec.cueId,
      won,
      reason,
      entrySpeed: this.entrySpeed,
      placementDeg: placement,
      shotSpeed: this.shotSpeed,
      shotErrorDeg: this.shotError,
      lowHead: this.lowHead,
      misses: this.misses,
      overcommitted: this.overcommitted,
    });
    this.banner = bannerFor(reason, won);
    this.phase = "banner";
    this.bannerT = 0.85;
    this.vx = 0;
  }

  private advance(): void {
    this.rep += 1;
    if (this.rep >= this.reps.length) {
      this.phase = "done";
      this.banner = "";
      return;
    }
    this.beginRep();
  }

  private beginRep(): void {
    const spec = this.reps[this.rep];
    this.phase = "live";
    this.banner = "";
    this.fight = freshFight();
    this.liveFor = 0;
    this.misses = 0;
    this.entrySpeed = 0;
    this.placement = null;
    this.shotSpeed = null;
    this.shotError = null;
    this.lowHead = false;
    this.overcommitted = false;
    this.saw = false;
    this.covered = false;
    this.holdFor = 0;
    this.doubleFor = 0;
    this.seenRoles.clear();
    this.samples = [];
    this.review = null;
    this.reviewT = 0;
    this.botX = HOLD_BOT_START;
    this.botV = 0;
    this.vx = 0;
    if (spec?.call === "hold") {
      this.playerX = HOLD_PLAYER.x;
      this.playerZ = HOLD_PLAYER.z;
      this.yaw = yawTo(HOLD_PLAYER, { x: 0.15, z: 0.1 });
      this.pitch = 0;
      this.actors = [];
    } else if (spec?.call === "isolate") {
      this.playerX = LANE.startX;
      this.playerZ = LANE.playerZ;
      this.yaw = START_YAW;
      this.pitch = 0;
      this.actors = [
        { ...NEAR_ENEMY, alive: true, role: "near" },
        { ...FAR_ENEMY, alive: true, role: "far" },
      ];
    } else {
      this.playerX = LANE.startX;
      this.playerZ = LANE.playerZ;
      this.yaw = START_YAW;
      this.pitch = 0;
      const enemy = spec ? enemyPoint(spec) : ENEMY_CLOSE;
      this.actors = [{ ...enemy, alive: true, role: "near" }];
    }
    this.exposed = false;
  }
}

function bannerFor(reason: string, won: boolean): string {
  if (reason === "kill") return "CLEAN";
  if (reason === "slow-kill") return "SLOW";
  if (reason === "slow") return "SLOW";
  if (reason === "died") return "LATE";
  if (reason === "jiggle") return "LOOKED";
  if (reason === "overcommit") return "TOO WIDE";
  if (reason === "took-fight") return "WRONG TOOL";
  if (reason === "held-loss") return "THEY SWUNG";
  if (reason === "held-win") return "YOU FLICKED";
  if (reason === "isolated") return "SLICED";
  if (reason === "double") return "BOTH SAW YOU";
  if (reason === "order") return "NEAR ONE FIRST";
  if (reason === "no-swing") return "NO SWING";
  if (won) return "CLEAN";
  return "MISS";
}
