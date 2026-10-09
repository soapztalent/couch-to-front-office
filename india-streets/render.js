/* First-person cab and the passenger's tablet. Original drawings. */
(function (root) {
  const W = root.ArreWorld;

  function skyColors(sky) {
    if (sky === "dusk") return { top: "#3a2a68", mid: "#ff8a62", ground: "#6a4634", fog: "#e7b198" };
    if (sky === "rain") return { top: "#667884", mid: "#b7c6c2", ground: "#4e5c48", fog: "#c5d0cc" };
    return { top: "#67c6f2", mid: "#ffe0a8", ground: "#c4a06a", fog: "#f3e2c2" };
  }

  function project(cam, wx, wz, wy, viewW, horizon, focal) {
    const dx = wx - cam.x;
    const dz = wz - cam.z;
    const hd = cam.camHeading;
    const c = Math.cos(hd);
    const s = Math.sin(hd);
    const localX = dx * c - dz * s;
    const localZ = dx * s + dz * c;
    if (localZ < 0.45) return null;
    const scale = focal / localZ;
    return {
      sx: viewW / 2 + localX * scale,
      sy: horizon + (cam.camHeight - wy) * scale,
      scale: scale,
      z: localZ,
    };
  }

  function camera(stage, state) {
    const pose = W.poseAt(stage, state);
    pose.camHeading = pose.heading + state.steer * 0.32 + Math.sin(state.spin) * 0.55;
    pose.camHeight = 1.15 + Math.sin(state.time * 10.5) * 0.02 * Math.min(1, state.speed / 6);
    return pose;
  }

  function lerpColor(a, b, t) {
    return a; // fog is applied as alpha overlay instead
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawSky(ctx, w, h, horizon, sky, time) {
    const g = ctx.createLinearGradient(0, 0, 0, horizon);
    g.addColorStop(0, sky.top);
    g.addColorStop(1, sky.mid);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, horizon + 2);
    const ground = ctx.createLinearGradient(0, horizon, 0, h);
    ground.addColorStop(0, sky.fog);
    ground.addColorStop(1, sky.ground);
    ctx.fillStyle = ground;
    ctx.fillRect(0, horizon, w, h - horizon);
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    if (sky.top !== "#667884") {
      const sunX = w * 0.78;
      const sunY = horizon - 30 + Math.sin(time * 0.2) * 4;
      ctx.beginPath();
      ctx.arc(sunX, sunY, 26, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawRoad(ctx, stage, state, cam, w, h, horizon, focal) {
    const sky = skyColors(stage.sky);
    stage.pieces.forEach(function (piece) {
      if (piece.kind !== "junction") return;
      if (piece.end < state.dist - 4 || piece.start > state.dist + 70) return;
      piece.branches.forEach(function (br) {
        for (let i = 0; i < br.pts.length - 1; i += 2) {
          const a = { x: br.pts[i].x, z: br.pts[i].z, heading: br.pts[i].h, width: piece.width * 0.86 };
          const j = Math.min(br.pts.length - 1, i + 2);
          const b = { x: br.pts[j].x, z: br.pts[j].z, heading: br.pts[j].h, width: piece.width * 0.86 };
          drawRibbon(ctx, cam, a, b, a.width / 2 + 1.4, w, horizon, focal, "#9a7048");
          drawRibbon(ctx, cam, a, b, a.width / 2, w, horizon, focal, "#5a403c");
        }
        const end = br.pts[br.pts.length - 1];
        const p = project(cam, end.x, end.z, 0, w, horizon, focal);
        if (p && p.z < 40) drawCart(ctx, p);
      });
    });
    const far = Math.min(stage.total, state.dist + 72);
    const segs = [];
    for (let d = far; d > state.dist - 2; d -= 2) {
      segs.push(W.sampleAt(stage, d));
    }
    for (let i = 0; i < segs.length - 1; i++) {
      const a = segs[i];
      const b = segs[i + 1];
      drawRibbon(ctx, cam, a, b, a.width / 2 + 2.4, w, horizon, focal, "#b08960");
      const asphalt = (Math.floor(a.dist) % 8 < 4) ? "#46403c" : "#3d3936";
      drawRibbon(ctx, cam, a, b, a.width / 2, w, horizon, focal, asphalt);
      drawRibbon(ctx, cam, a, b, 0.16, w, horizon, focal, "#f2efe6", a.width / 2 - 0.35);
      drawRibbon(ctx, cam, a, b, 0.16, w, horizon, focal, "#f2efe6", -(a.width / 2 - 0.35));
      if (Math.floor(a.dist) % 6 < 2) {
        drawRibbon(ctx, cam, a, b, 0.12, w, horizon, focal, "#f5d76e", 0);
      }
      const piece = stage.pieces[a.pieceIndex];
      if (piece && piece.puddle && Math.abs(a.dist - (piece.start + piece.end) / 2) < 3) {
        drawRibbon(ctx, cam, a, b, a.width * 0.22, w, horizon, focal, "rgba(70, 110, 130, 0.45)");
      }
    }
    ctx.globalAlpha = 1;
    void sky;
  }

  function drawRibbon(ctx, cam, a, b, half, w, horizon, focal, color, offset) {
    const off = offset || 0;
    const ax = edge(a, off);
    const bx = edge(b, off);
    const aL = edge(a, off - half);
    const aR = edge(a, off + half);
    const bL = edge(b, off - half);
    const bR = edge(b, off + half);
    void ax;
    void bx;
    const pAL = project(cam, aL.x, aL.z, 0, w, horizon, focal);
    const pAR = project(cam, aR.x, aR.z, 0, w, horizon, focal);
    const pBL = project(cam, bL.x, bL.z, 0, w, horizon, focal);
    const pBR = project(cam, bR.x, bR.z, 0, w, horizon, focal);
    if (!pAL || !pAR || !pBL || !pBR) return;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(pAL.sx, pAL.sy);
    ctx.lineTo(pAR.sx, pAR.sy);
    ctx.lineTo(pBR.sx, pBR.sy);
    ctx.lineTo(pBL.sx, pBL.sy);
    ctx.closePath();
    ctx.fill();
  }

  function edge(sample, lateral) {
    const rx = Math.cos(sample.heading);
    const rz = -Math.sin(sample.heading);
    return { x: sample.x + rx * lateral, z: sample.z + rz * lateral };
  }

  function drawCart(ctx, p) {
    const s = p.scale;
    ctx.save();
    ctx.translate(p.sx, p.sy);
    ctx.fillStyle = "#c44536";
    ctx.fillRect(-0.8 * s, -1.1 * s, 1.6 * s, 1.1 * s);
    ctx.fillStyle = "#f2cc8f";
    ctx.beginPath();
    ctx.arc(0, -1.3 * s, 0.45 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2a9d8f";
    ctx.beginPath();
    ctx.arc(-0.35 * s, -1.15 * s, 0.18 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function collectSprites(stage, state, cam, w, horizon, focal) {
    const list = [];
    stage.props.forEach(function (prop) {
      if (prop.dist < state.dist - 8 || prop.dist > state.dist + 70) return;
      const p = project(cam, prop.x, prop.z, 0, w, horizon, focal);
      if (!p || p.z > 68) return;
      list.push({ z: p.z, p: p, kind: "prop", prop: prop });
    });
    stage.hazards.forEach(function (h) {
      if (h.type === "oncoming") return;
      if (state.hit[h.id] && h.type !== "band") return;
      pushHazard(list, stage, h, cam, w, horizon, focal, state);
    });
    state.movers.forEach(function (h) {
      if (h.done) return;
      pushHazard(list, stage, h, cam, w, horizon, focal, state);
    });
    stage.powerups.forEach(function (pu) {
      if (state.got[pu.id]) return;
      if (Math.abs(pu.abs - state.dist) > 60) return;
      const s = W.sampleAt(stage, pu.abs);
      const spot = edge(s, pu.lateral);
      const bob = 0.8 + Math.sin(state.time * 4 + pu.abs) * 0.15;
      const p = project(cam, spot.x, spot.z, bob, w, horizon, focal);
      if (p) list.push({ z: p.z, p: p, kind: "power", type: pu.type });
    });
    list.sort(function (a, b) { return b.z - a.z; });
    return list;
  }

  function pushHazard(list, stage, h, cam, w, horizon, focal, state) {
    if (h.abs < state.dist - 6 || h.abs > state.dist + 68) return;
    const s = W.sampleAt(stage, h.abs);
    const spot = edge(s, h.lateral);
    const p = project(cam, spot.x, spot.z, 0, w, horizon, focal);
    if (!p) return;
    list.push({ z: p.z, p: p, kind: h.type === "oncoming" ? "auto" : h.type, hazard: h });
  }

  function drawSprites(ctx, list) {
    list.forEach(function (item) {
      const s = item.p.scale;
      if (item.kind === "prop") drawProp(ctx, item.p, item.prop);
      else if (item.kind === "cow") drawCow(ctx, item.p, s);
      else if (item.kind === "cricket") drawCricket(ctx, item.p, s);
      else if (item.kind === "pothole") drawPothole(ctx, item.p, s);
      else if (item.kind === "band") drawBand(ctx, item.p, s);
      else if (item.kind === "auto") drawAuto(ctx, item.p, s);
      else if (item.kind === "power") drawPower(ctx, item.p, s, item.type);
    });
  }

  function drawProp(ctx, p, prop) {
    const s = p.scale;
    if (prop.type === "building") {
      const bw = prop.w * s;
      const bh = prop.h * s;
      const x = p.sx - bw / 2;
      const y = p.sy - bh;
      ctx.fillStyle = prop.color;
      ctx.fillRect(x, y, bw, bh);
      ctx.fillStyle = "rgba(0,0,0,0.15)";
      ctx.fillRect(x, y, bw, Math.max(2, bh * 0.08));
      ctx.fillStyle = prop.seed > 0.55 ? "rgba(255, 226, 140, 0.9)" : "rgba(180, 210, 230, 0.75)";
      const cols = Math.max(1, Math.round(prop.w / 1.3));
      const rows = Math.max(1, Math.round(prop.h / 2));
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if ((r + c + Math.floor(prop.seed * 9)) % 3 === 0) continue;
          ctx.fillRect(
            x + bw * 0.16 + c * (bw * 0.7 / cols),
            y + bh * 0.18 + r * (bh * 0.62 / rows),
            Math.max(1.5, bw * 0.14),
            Math.max(1.5, bh * 0.1)
          );
        }
      }
      ctx.fillStyle = prop.seed > 0.5 ? "#d94f30" : "#1f8a7a";
      ctx.fillRect(x - bw * 0.04, p.sy - bh * 0.2, bw * 1.08, Math.max(3, bh * 0.06));
    } else if (prop.type === "neem" || prop.type === "palm") {
      ctx.fillStyle = "#6b4428";
      ctx.fillRect(p.sx - s * 0.08, p.sy - s * 1.5, s * 0.16, s * 1.5);
      ctx.fillStyle = prop.type === "palm" ? "#2f8f4e" : "#3e8f45";
      ctx.beginPath();
      ctx.arc(p.sx, p.sy - s * 1.7, s * (prop.type === "palm" ? 0.7 : 0.95), 0, Math.PI * 2);
      ctx.fill();
      if (prop.type === "palm") {
        ctx.beginPath();
        ctx.ellipse(p.sx + s * 0.7, p.sy - s * 1.45, s * 0.55, s * 0.18, 0.4, 0, 7);
        ctx.fill();
      }
    } else if (prop.type === "stall") {
      ctx.fillStyle = "#e07a3d";
      ctx.fillRect(p.sx - s * 0.7, p.sy - s * 1.3, s * 1.4, s * 0.9);
      ctx.fillStyle = "#f4c430";
      ctx.fillRect(p.sx - s * 0.9, p.sy - s * 1.55, s * 1.8, s * 0.28);
      ctx.fillStyle = "#fff";
      ctx.fillRect(p.sx - s * 0.2, p.sy - s * 0.4, s * 0.08, s * 0.4);
      ctx.fillRect(p.sx + s * 0.2, p.sy - s * 0.4, s * 0.08, s * 0.4);
    } else if (prop.type === "lamp") {
      ctx.strokeStyle = "#2c2a28";
      ctx.lineWidth = Math.max(1, s * 0.06);
      ctx.beginPath();
      ctx.moveTo(p.sx, p.sy);
      ctx.lineTo(p.sx, p.sy - s * 2.2);
      ctx.lineTo(p.sx + s * 0.4, p.sy - s * 2.2);
      ctx.stroke();
      ctx.fillStyle = "#ffe9a0";
      ctx.beginPath();
      ctx.arc(p.sx + s * 0.4, p.sy - s * 2.05, s * 0.16, 0, Math.PI * 2);
      ctx.fill();
    } else if (prop.type === "tank") {
      ctx.fillStyle = "#d0d5dc";
      ctx.beginPath();
      ctx.ellipse(p.sx, p.sy - s * 1.6, s * 0.7, s * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(p.sx - s * 0.08, p.sy - s * 1.5, s * 0.16, s * 1.5);
    } else if (prop.type === "shutter") {
      ctx.fillStyle = "#f4d35e";
      ctx.fillRect(p.sx - s * 1.6, p.sy - s * 2.4, s * 3.2, s * 2.4);
      ctx.fillStyle = "#2a140e";
      ctx.fillRect(p.sx - s * 1.6, p.sy - s * 2.5, s * 3.2, s * 0.18);
      ctx.fillStyle = "#c4321a";
      ctx.font = "700 " + Math.max(10, s * 0.42) + "px Trebuchet MS, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("SHARMA", p.sx, p.sy - s * 1.35);
      ctx.fillText("STORES", p.sx, p.sy - s * 0.85);
    }
  }

  function drawCow(ctx, p, s) {
    ctx.save();
    ctx.translate(p.sx, p.sy);
    ctx.fillStyle = "#f7f3ea";
    ctx.beginPath();
    ctx.ellipse(0, -s * 0.62, s * 0.78, s * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#6b4f3a";
    ctx.beginPath();
    ctx.ellipse(-s * 0.2, -s * 0.7, s * 0.2, s * 0.14, 0.5, 0, 7);
    ctx.fill();
    ctx.fillStyle = "#f7f3ea";
    ctx.beginPath();
    ctx.ellipse(s * 0.7, -s * 0.78, s * 0.28, s * 0.22, 0.4, 0, 7);
    ctx.fill();
    ctx.fillStyle = "#2a140e";
    ctx.beginPath();
    ctx.arc(s * 0.86, -s * 0.82, Math.max(1, s * 0.04), 0, 7);
    ctx.fill();
    ctx.strokeStyle = "#e6d3a8";
    ctx.lineWidth = Math.max(1, s * 0.05);
    ctx.beginPath();
    ctx.moveTo(s * 0.55, -s * 0.95);
    ctx.quadraticCurveTo(s * 0.45, -s * 1.25, s * 0.3, -s * 1.05);
    ctx.moveTo(s * 0.75, -s * 0.98);
    ctx.quadraticCurveTo(s * 0.95, -s * 1.28, s * 1.05, -s * 1.02);
    ctx.stroke();
    ctx.strokeStyle = "#6b4f3a";
    ctx.lineWidth = Math.max(1.4, s * 0.07);
    ctx.beginPath();
    [-0.4, -0.1, 0.25, 0.5].forEach(function (lx) {
      ctx.moveTo(lx * s, -s * 0.28);
      ctx.lineTo(lx * s, 0);
    });
    ctx.stroke();
    ctx.restore();
  }

  function drawCricket(ctx, p, s) {
    ctx.save();
    ctx.translate(p.sx, p.sy);
    function kid(x, shirt) {
      ctx.fillStyle = shirt;
      ctx.fillRect(x - s * 0.16, -s * 0.85, s * 0.32, s * 0.5);
      ctx.fillStyle = "#e0b080";
      ctx.beginPath();
      ctx.arc(x, -s * 1.05, s * 0.16, 0, 7);
      ctx.fill();
      ctx.fillStyle = "#2a140e";
      ctx.fillRect(x - s * 0.08, -s * 0.35, s * 0.06, s * 0.35);
      ctx.fillRect(x + s * 0.04, -s * 0.35, s * 0.06, s * 0.35);
    }
    kid(-s * 0.45, "#2a9d8f");
    kid(s * 0.15, "#e23d2b");
    ctx.strokeStyle = "#f4e1b5";
    ctx.lineWidth = Math.max(2, s * 0.08);
    ctx.beginPath();
    ctx.moveTo(s * 0.55, -s * 0.2);
    ctx.lineTo(s * 0.95, -s * 1.1);
    ctx.stroke();
    ctx.fillStyle = "#f4c430";
    ctx.fillRect(-s * 0.08, -s * 0.35, s * 0.05, s * 0.35);
    ctx.fillRect(s * 0.08, -s * 0.35, s * 0.05, s * 0.35);
    ctx.restore();
  }

  function drawPothole(ctx, p, s) {
    ctx.fillStyle = "rgba(20,16,14,0.85)";
    ctx.beginPath();
    ctx.ellipse(p.sx, p.sy, s * 0.7, s * 0.28, 0, 0, 7);
    ctx.fill();
    ctx.strokeStyle = "rgba(90,80,70,0.9)";
    ctx.stroke();
  }

  function drawBand(ctx, p, s) {
    ctx.save();
    ctx.translate(p.sx, p.sy);
    ["#e23d2b", "#f4c430", "#2a9d8f", "#6d597a"].forEach(function (color, i) {
      const x = (i - 1.5) * s * 0.45;
      ctx.fillStyle = color;
      ctx.fillRect(x, -s * 1.2, s * 0.32, s * 0.7);
      ctx.fillStyle = "#e0b080";
      ctx.beginPath();
      ctx.arc(x + s * 0.16, -s * 1.35, s * 0.14, 0, 7);
      ctx.fill();
    });
    ctx.fillStyle = "#f4c430";
    ctx.fillRect(-s * 0.9, -s * 1.7, s * 1.8, s * 0.16);
    ctx.restore();
  }

  function drawAuto(ctx, p, s) {
    ctx.save();
    ctx.translate(p.sx, p.sy);
    ctx.fillStyle = "#111";
    ctx.beginPath();
    ctx.arc(-s * 0.45, -s * 0.18, s * 0.2, 0, 7);
    ctx.arc(s * 0.4, -s * 0.18, s * 0.2, 0, 7);
    ctx.fill();
    ctx.fillStyle = "#111";
    ctx.fillRect(-s * 0.55, -s * 1.35, s * 1.15, s * 0.7);
    ctx.fillStyle = "#f4c430";
    ctx.fillRect(-s * 0.7, -s * 0.95, s * 1.45, s * 0.7);
    ctx.fillStyle = "#1f8a7a";
    ctx.fillRect(-s * 0.7, -s * 0.55, s * 1.45, s * 0.16);
    ctx.fillStyle = "#d7f3ff";
    ctx.fillRect(-s * 0.35, -s * 1.2, s * 0.7, s * 0.4);
    ctx.restore();
  }

  function drawPower(ctx, p, s, type) {
    ctx.save();
    ctx.translate(p.sx, p.sy);
    ctx.fillStyle = "rgba(255, 230, 120, 0.35)";
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.55, 0, 7);
    ctx.fill();
    if (type === "chai") {
      ctx.fillStyle = "#f4efe6";
      ctx.fillRect(-s * 0.16, -s * 0.05, s * 0.32, s * 0.28);
      ctx.fillStyle = "#c44536";
      ctx.fillRect(-s * 0.16, -s * 0.12, s * 0.32, s * 0.1);
      ctx.strokeStyle = "#f4efe6";
      ctx.lineWidth = Math.max(1, s * 0.05);
      ctx.beginPath();
      ctx.arc(s * 0.22, s * 0.08, s * 0.1, -1, 1);
      ctx.stroke();
    } else if (type === "ladoo") {
      ctx.fillStyle = "#ff9f1c";
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.22, 0, 7);
      ctx.fill();
      ctx.fillStyle = "#ffe566";
      ctx.beginPath();
      ctx.arc(-s * 0.06, -s * 0.06, s * 0.06, 0, 7);
      ctx.fill();
    } else {
      ctx.fillStyle = "#e23d2b";
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.28, s * 0.18, 0, 0, 7);
      ctx.fill();
      ctx.fillStyle = "#f4c430";
      ctx.fillRect(-s * 0.05, -s * 0.28, s * 0.1, s * 0.2);
    }
    ctx.restore();
  }

  function drawRain(ctx, w, h, skyName, time) {
    if (skyName !== "rain") return;
    ctx.strokeStyle = "rgba(230, 240, 245, 0.45)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < 70; i++) {
      const x = (i * 97 + time * 280) % (w + 40) - 20;
      const y = (i * 53 + time * 640) % (h + 30) - 20;
      ctx.moveTo(x, y);
      ctx.lineTo(x - 6, y + 16);
    }
    ctx.stroke();
  }

  function windshieldPath(ctx, w, h) {
    ctx.beginPath();
    ctx.moveTo(w * 0.1, h * 0.08);
    ctx.lineTo(w * 0.9, h * 0.08);
    ctx.lineTo(w * 0.8, h * 0.7);
    ctx.lineTo(w * 0.2, h * 0.7);
    ctx.closePath();
  }

  function drawMud(ctx, w, h, state) {
    ctx.save();
    windshieldPath(ctx, w, h);
    ctx.clip();
    if (state.mud > 0.08) {
      ctx.fillStyle = "rgba(78, 52, 32, " + (state.mud * 0.62).toFixed(3) + ")";
      ctx.fillRect(0, 0, w, h);
    }
    const blobs = Math.floor(state.mud * 16);
    for (let i = 0; i < blobs; i++) {
      const x = (Math.sin(i * 12.1 + 2) * 0.5 + 0.5) * w * 0.7 + w * 0.12;
      const y = (Math.cos(i * 7.3 + 1) * 0.5 + 0.5) * h * 0.5 + h * 0.1;
      const r = (16 + (i % 5) * 14) * (0.35 + state.mud);
      ctx.fillStyle = "rgba(92, 58, 28, " + (state.mud * 0.7).toFixed(3) + ")";
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 0.72, i, 0, 7);
      ctx.fill();
    }
    if (state.health < 58) {
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(w * 0.48, h * 0.2);
      ctx.lineTo(w * 0.42, h * 0.36);
      ctx.lineTo(w * 0.5, h * 0.48);
      ctx.moveTo(w * 0.42, h * 0.36);
      ctx.lineTo(w * 0.34, h * 0.4);
      ctx.stroke();
    }
    if (state.mud > 0.42) {
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.font = "700 18px Trebuchet MS, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("wipe  ·  F", w * 0.5, h * 0.42);
    }
    ctx.restore();
  }

  function drawCockpit(ctx, w, h, state, stage) {
    const steer = state.steer;
    ctx.fillStyle = "#4a1824";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(w * 0.07, 0);
    ctx.lineTo(w * 0.025, h);
    ctx.lineTo(0, h);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(w, 0);
    ctx.lineTo(w * 0.93, 0);
    ctx.lineTo(w * 0.975, h);
    ctx.lineTo(w, h);
    ctx.fill();
    ctx.fillRect(0, 0, w, h * 0.055);

    if (state.door > 0.08) {
      ctx.save();
      ctx.translate(w * 0.02, h * 0.35);
      ctx.rotate(-0.7 * state.door);
      ctx.fillStyle = "#f0c431";
      ctx.fillRect(0, -h * 0.05, w * 0.18, h * 0.42);
      ctx.fillStyle = "#9fd8ef";
      ctx.fillRect(w * 0.03, h * 0.04, w * 0.1, h * 0.16);
      ctx.fillStyle = "#2a140e";
      ctx.fillRect(w * 0.145, h * 0.16, w * 0.02, h * 0.06);
      ctx.restore();
    }

    ctx.fillStyle = "#f0c431";
    ctx.beginPath();
    ctx.moveTo(w * 0.18, h);
    ctx.lineTo(w * 0.34, h * 0.69);
    ctx.lineTo(w * 0.66, h * 0.69);
    ctx.lineTo(w * 0.84, h);
    ctx.fill();
    ctx.fillStyle = "#1b1b1b";
    ctx.fillRect(w * 0.4, h * 0.78, w * 0.2, h * 0.035);
    ctx.fillStyle = "#2a140e";
    ctx.font = "700 " + Math.max(12, w * 0.018) + "px Trebuchet MS, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("HORN PLEASE", w * 0.5, h * 0.9);

    const scratch = (100 - state.health) / 100;
    if (scratch > 0.05) {
      ctx.strokeStyle = "rgba(40,20,10," + (0.2 + scratch * 0.5) + ")";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(w * 0.4, h * 0.78);
      ctx.lineTo(w * 0.55, h * 0.95);
      ctx.moveTo(w * 0.48, h * 0.8);
      ctx.lineTo(w * 0.62, h * 0.88);
      ctx.stroke();
    }

    ctx.fillStyle = "#241c1a";
    ctx.fillRect(0, h * 0.8, w, h * 0.2);
    ctx.fillStyle = "#3a2e2a";
    ctx.fillRect(w * 0.08, h * 0.83, w * 0.28, h * 0.05);
    ctx.fillStyle = state.mud > 0.4 ? "#c44536" : "#888";
    ctx.beginPath();
    ctx.arc(w * 0.3, h * 0.9, Math.min(16, w * 0.02), 0, 7);
    ctx.fill();

    const cx = w * 0.5 + steer * w * 0.02;
    const cy = h * 0.86;
    const rad = Math.min(w, h) * 0.145;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(steer * 1.5);
    ctx.strokeStyle = "#141414";
    ctx.lineWidth = rad * 0.22;
    ctx.beginPath();
    ctx.arc(0, 0, rad, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "#2a2a2a";
    ctx.lineWidth = rad * 0.08;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI / 2 + i * (Math.PI * 2 / 3);
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
    }
    ctx.stroke();
    ctx.fillStyle = "#c4845a";
    ctx.beginPath();
    ctx.ellipse(-rad * 0.78, rad * 0.15, rad * 0.28, rad * 0.2, -0.4, 0, 7);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(rad * 0.72, rad * 0.2, rad * 0.26, rad * 0.18, 0.5, 0, 7);
    ctx.fill();
    ctx.restore();

    drawPassenger(ctx, w, h, state);
    drawFreshener(ctx, w, h, state);
    drawMirror(ctx, w, h, state, stage);

    if (state.hornT > 0) {
      ctx.strokeStyle = "rgba(255, 220, 80, 0.8)";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.5, 40 + (0.28 - state.hornT) * 180, 0, 7);
      ctx.stroke();
    }
    if (state.health < 32) {
      ctx.fillStyle = "rgba(40,40,40,0.18)";
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.ellipse(w * (0.3 + i * 0.1), h * 0.55, 10, 28, 0.2, 0, 7);
        ctx.fill();
      }
    }
  }

  function drawPassenger(ctx, w, h, state) {
    const talking = state.call && state.call.age < state.call.life;
    ctx.save();
    ctx.translate(w * 0.8, h * 0.74);
    ctx.fillStyle = "#1f8f86";
    ctx.beginPath();
    ctx.ellipse(0, 20, 46, 36, 0, 0, 7);
    ctx.fill();
    ctx.fillStyle = "#e0ac74";
    ctx.beginPath();
    ctx.arc(-6, -16, 22, 0, 7);
    ctx.fill();
    ctx.fillStyle = "#2a140e";
    ctx.fillRect(-20, -30, 28, 8);
    ctx.fillStyle = "#2a140e";
    ctx.beginPath();
    ctx.arc(-12, -18, 2, 0, 7);
    ctx.arc(-2, -18, 2, 0, 7);
    ctx.fill();
    ctx.strokeStyle = "#2a140e";
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (talking) ctx.arc(-7, -8, 6, 0.1, Math.PI - 0.1);
    else ctx.arc(-7, -6, 5, 0.2, Math.PI - 0.2);
    ctx.stroke();
    ctx.fillStyle = "#f08a24";
    ctx.fillRect(18, 4, 28, 36);
    ctx.fillStyle = "#14281c";
    ctx.fillRect(22, 10, 20, 24);
    ctx.restore();
  }

  function drawFreshener(ctx, w, h, state) {
    const swing = Math.sin(state.time * 3 + state.lateral) * 10 + state.latVel * 2;
    ctx.save();
    ctx.translate(w * 0.62, h * 0.08);
    ctx.rotate(swing * 0.01);
    ctx.strokeStyle = "#2a140e";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 28);
    ctx.stroke();
    ctx.fillStyle = "#f4c430";
    ctx.beginPath();
    ctx.ellipse(0, 42, 10, 14, 0, 0, 7);
    ctx.fill();
    ctx.fillStyle = "#2a9d8f";
    ctx.beginPath();
    ctx.ellipse(-2, 38, 3, 5, 0, 0, 7);
    ctx.fill();
    ctx.restore();
  }

  function drawMirror(ctx, w, h, state, stage) {
    ctx.fillStyle = "#1a1a1a";
    roundRect(ctx, w * 0.4, h * 0.085, w * 0.2, h * 0.11, 8);
    ctx.fill();
    ctx.save();
    roundRect(ctx, w * 0.408, h * 0.095, w * 0.184, h * 0.09, 6);
    ctx.clip();
    const sky = skyColors(stage.sky);
    ctx.fillStyle = sky.mid;
    ctx.fillRect(w * 0.4, h * 0.09, w * 0.2, h * 0.1);
    ctx.fillStyle = "#f7f3ea";
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.16, 16, 8, 0, 0, 7);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = "#cfcfcf";
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  function drawCall(ctx, w, h, state) {
    if (state.call) {
      const life = state.call.life || 1.2;
      const k = 1 - state.call.age / life;
      if (k > 0) {
        ctx.save();
        ctx.translate(w / 2, h * 0.24);
        ctx.rotate(Math.sin(state.call.age * 18) * 0.03);
        ctx.globalAlpha = Math.min(1, k * 1.4);
        ctx.font = "700 " + Math.max(42, Math.min(92, w * 0.08)) + "px Lilita One, Impact, sans-serif";
        ctx.textAlign = "center";
        ctx.lineWidth = 12;
        ctx.strokeStyle = "#1a0a06";
        ctx.fillStyle = state.call.color || "#ffe566";
        ctx.strokeText(state.call.text, 0, 0);
        ctx.fillText(state.call.text, 0, 0);
        if (state.call.sub) {
          ctx.font = "700 18px Trebuchet MS, sans-serif";
          ctx.lineWidth = 5;
          ctx.strokeText(state.call.sub, 0, 36);
          ctx.fillText(state.call.sub, 0, 36);
        }
        ctx.restore();
      }
    }
    if (state.banner && state.bannerT > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, state.bannerT);
      ctx.translate(w / 2, h * 0.48);
      ctx.font = "700 " + Math.max(36, w * 0.06) + "px Lilita One, Impact, sans-serif";
      ctx.textAlign = "center";
      ctx.lineWidth = 10;
      ctx.strokeStyle = "#1a0a06";
      ctx.fillStyle = state.banner === "ARRE BABA" ? "#ff5a4a" : "#ffe566";
      ctx.strokeText(state.banner, 0, 0);
      ctx.fillText(state.banner, 0, 0);
      ctx.restore();
    }
    if (state.slowMo > 0) {
      ctx.fillStyle = "rgba(255, 244, 210, 0.18)";
      ctx.fillRect(0, 0, w, h);
    }
  }

  function drawDriver(ctx, w, h, stage, state) {
    const sky = skyColors(stage.sky);
    const shake = state.shake * 8;
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate((Math.sin(state.time * 40) * shake), (Math.cos(state.time * 33) * shake) / 2);
    const horizon = h * 0.4;
    const focal = w * 0.78;
    const cam = camera(stage, state);
    drawSky(ctx, w, h, horizon, sky, state.time);
    drawRoad(ctx, stage, state, cam, w, h, horizon, focal);
    drawSprites(ctx, collectSprites(stage, state, cam, w, horizon, focal));
    drawRain(ctx, w, h, stage.sky, state.time);
    const fog = ctx.createLinearGradient(0, horizon - 10, 0, horizon + h * 0.18);
    fog.addColorStop(0, "rgba(255,255,255,0)");
    fog.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = fog;
    ctx.fillRect(0, horizon - 10, w, h * 0.2);
    ctx.restore();
    drawMud(ctx, w, h, state);
    drawCockpit(ctx, w, h, state, stage);
    drawCall(ctx, w, h, state);
    if (state.phase === "crash" || state.phase === "dead") {
      ctx.fillStyle = "rgba(120, 16, 12, 0.22)";
      ctx.fillRect(0, 0, w, h);
    }
  }

  function localPoint(cam, wx, wz) {
    const dx = wx - cam.x;
    const dz = wz - cam.z;
    const hd = cam.heading;
    const c = Math.cos(hd);
    const s = Math.sin(hd);
    return {
      x: dx * c - dz * s,
      z: dx * s + dz * c,
    };
  }

  function drawNavigator(ctx, w, h, stage, state) {
    ctx.clearRect(0, 0, w, h);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#2a2428");
    g.addColorStop(1, "#6b5344");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#c4845a";
    ctx.beginPath();
    ctx.ellipse(w * 0.22, h * 0.78, w * 0.16, h * 0.18, -0.4, 0, 7);
    ctx.ellipse(w * 0.78, h * 0.78, w * 0.16, h * 0.18, 0.4, 0, 7);
    ctx.fill();
    ctx.fillStyle = "#1f8f86";
    ctx.fillRect(0, h * 0.82, w, h * 0.18);

    const tilt = state.tabletDropped ? 1.2 : state.tabletTilt;
    const dropY = state.tabletDropped ? h * 0.18 : 0;
    const tw = Math.min(w * 0.46, 360);
    const th = Math.min(h * 0.72, 460);
    const tx = w / 2 - tw / 2 + tilt * 24;
    const ty = h * 0.08 + dropY + Math.abs(tilt) * 10;

    ctx.save();
    ctx.translate(tx + tw / 2, ty + th / 2);
    ctx.rotate(tilt * 0.18);
    ctx.translate(-tw / 2, -th / 2);
    roundRect(ctx, 0, 0, tw, th, 22);
    ctx.fillStyle = "#f08a24";
    ctx.fill();
    ctx.fillStyle = "#d66a12";
    ctx.fillRect(-8, th * 0.2, 16, 28);
    ctx.fillRect(tw - 8, th * 0.2, 16, 28);
    const pad = 16;
    roundRect(ctx, pad, pad, tw - pad * 2, th - pad * 2, 12);
    ctx.fillStyle = "#102018";
    ctx.fill();
    ctx.save();
    roundRect(ctx, pad, pad, tw - pad * 2, th - pad * 2, 12);
    ctx.clip();
    drawMap(ctx, pad, pad, tw - pad * 2, th - pad * 2, stage, state);
    ctx.restore();
    if (!state.tabletDropped && state.grip < 0.5) {
      ctx.fillStyle = "#ffe566";
      ctx.font = "700 16px Trebuchet MS, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("GRIP IT", tw / 2, th - 28);
    }
    if (state.tabletDropped) {
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(pad, pad, tw - pad * 2, th - pad * 2);
      ctx.fillStyle = "#ffe566";
      ctx.font = "700 22px Lilita One, Impact, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("GRAB  ·  G", tw / 2, th / 2);
    }
    ctx.restore();

    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.font = "700 14px Trebuchet MS, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(stage.name + "  ·  passenger tablet", 16, 22);
    const next = W.nextJunction(stage, state.dist);
    if (next) {
      const meters = Math.max(0, Math.round(next.start - state.dist));
      ctx.textAlign = "right";
      ctx.fillText(wordFor(next.correct) + " in " + meters + "m", w - 16, 22);
    }
  }

  function wordFor(dir) {
    if (dir === "left") return "LEFT";
    if (dir === "right") return "RIGHT";
    return "STRAIGHT";
  }

  function drawMap(ctx, x, y, w, h, stage, state) {
    const cam = W.poseAt(stage, state);
    const view = 78;
    const scale = (h - 36) / view;
    const originY = y + h - 18;
    const originX = x + w / 2;
    ctx.fillStyle = "#163024";
    ctx.fillRect(x, y, w, h);

    function plot(wx, wz) {
      const loc = localPoint(cam, wx, wz);
      return { sx: originX + loc.x * scale, sy: originY - loc.z * scale, z: loc.z };
    }

    stage.pieces.forEach(function (piece) {
      if (piece.kind !== "junction") return;
      if (piece.end < state.dist || piece.start > state.dist + view) return;
      piece.branches.forEach(function (br) {
        ctx.beginPath();
        let started = false;
        br.pts.forEach(function (pt) {
          const p = plot(pt.x, pt.z);
          if (p.z < -2 || p.z > view) return;
          if (!started) { ctx.moveTo(p.sx, p.sy); started = true; }
          else ctx.lineTo(p.sx, p.sy);
        });
        ctx.strokeStyle = "rgba(180, 90, 70, 0.7)";
        ctx.lineWidth = 8;
        ctx.stroke();
      });
    });

    ctx.beginPath();
    let moved = false;
    for (let d = state.dist; d < Math.min(stage.total, state.dist + view); d += 2) {
      const s = W.sampleAt(stage, d);
      const p = plot(s.x, s.z);
      if (!moved) { ctx.moveTo(p.sx, p.sy); moved = true; }
      else ctx.lineTo(p.sx, p.sy);
    }
    ctx.strokeStyle = "#f5e15b";
    ctx.lineWidth = 8;
    ctx.lineJoin = "round";
    ctx.stroke();

    stage.hazards.forEach(function (hz) {
      if (hz.type === "oncoming") return;
      if (hz.abs < state.dist || hz.abs > state.dist + view) return;
      const s = W.sampleAt(stage, hz.abs);
      const spot = edge(s, hz.lateral);
      const p = plot(spot.x, spot.z);
      ctx.fillStyle = "#ffb15a";
      ctx.beginPath();
      ctx.arc(p.sx, p.sy, 6, 0, 7);
      ctx.fill();
      ctx.fillStyle = "#1a0a06";
      ctx.font = "700 10px Trebuchet MS, sans-serif";
      ctx.textAlign = "center";
      const label = { cow: "COW", pothole: "HOLE", cricket: "BAT", band: "BAND" }[hz.type] || "!";
      ctx.fillText(label, p.sx, p.sy - 8);
    });

    const nxt = W.nextJunction(stage, state.dist);
    const meters = nxt ? Math.max(0, Math.round(nxt.start - state.dist)) : Math.max(0, Math.round(stage.total - state.dist));
    ctx.fillStyle = "#f4efe6";
    ctx.font = "700 28px Lilita One, Impact, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(String(meters), originX, y + 34);
    ctx.font = "700 11px Trebuchet MS, sans-serif";
    ctx.fillStyle = "#9dbea8";
    ctx.fillText(nxt ? "METRES TO THE YELL" : "METRES TO THE SHUTTER", originX, y + 50);

    ctx.fillStyle = "#ff8a3d";
    ctx.beginPath();
    ctx.moveTo(originX, originY - 16);
    ctx.lineTo(originX - 9, originY);
    ctx.lineTo(originX + 9, originY);
    ctx.fill();
  }

  root.ArreDraw = {
    drawDriver: drawDriver,
    drawNavigator: drawNavigator,
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
