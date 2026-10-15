/* Couch To Front Office - rigged/animated player models (ctfo-v2)
 * Drop-in replacement for skater-models.js. Same entry point:
 *     buildHockeyPlayer(THREE, color, num, isGoalie [, opts]) -> THREE.Group
 * Needs window.SKATER_GLB / window.GOALIE_GLB (base64 GLB, from skater-glb.js / goalie-glb.js),
 * optional window.SKATER_TINT / window.GOALIE_TINT (tint masks), three r128 + GLTFLoader.
 * No extra decoders needed (geometry uses KHR_mesh_quantization, natively supported by r128 GLTFLoader).
 *
 * Every returned root gets root.userData API:
 *   play(name, {loop, fade, timeScale, hold})  play a clip (one-shots return to auto-locomotion when done)
 *   setAuto(bool)                              auto idle/glide/stride/crossover (skater) or ready/t-push (goalie) from movement (default on)
 *   setColors(primary, secondary, gear)        recolor jersey (hex strings or numbers); null keeps current
 *   clips()  -> clip names,  duration(name) -> seconds,  current() -> active clip name
 * Global helper: window.CTFO_PLAYERS = {clips:{skater:[...],goalie:[...]}, all:[roots], config}
 */
(function(){
  var CFG = window.CTFO_PLAYER_CFG = Object.assign({
    skaterHeight: 1.9, goalieHeight: 1.42,   // game units; the GLBs are authored at exactly these heights
    fade: 0.2,
    idleSpeed: 0.7,       // below: idle (units/s)
    strideSpeed: 3.0,     // above: skate_stride, between: glide
    strideRef: 8.0,       // speed at which stride plays at 1x
    turnRate: 1.4,        // rad/s of heading change that triggers crossovers
    goaliePush: 2.0,      // lateral speed that triggers t_push_left/right
    autoTint: true        // tint jersey with the color passed to buildHockeyPlayer
  }, window.CTFO_PLAYER_CFG || {});

  var LOOPING = {idle:1, glide:1, skate_stride:1, crossover_left:1, crossover_right:1, goalie_ready:1, goalie_idle:1};
  var cache = {}, waiting = {skater: [], goalie: []}, started = {};
  var registry = window.CTFO_PLAYERS = {clips: {skater: [], goalie: []}, all: [], config: CFG};

  function bytes(b64){ var bin = atob(b64), n = bin.length, u = new Uint8Array(n); for (var i = 0; i < n; i++) u[i] = bin.charCodeAt(i); return u.buffer; }

  // --- SkeletonUtils.clone (three r128) inlined: Object3D.clone() does not rebind skinned meshes ---
  function parallelTraverse(a, b, cb){ cb(a, b); for (var i = 0; i < a.children.length; i++) parallelTraverse(a.children[i], b.children[i], cb); }
  function cloneSkinned(source){
    var srcLookup = new Map(), cloneLookup = new Map(), cloned = source.clone();
    parallelTraverse(source, cloned, function(s, c){ srcLookup.set(c, s); cloneLookup.set(s, c); });
    cloned.traverse(function(node){
      if (!node.isSkinnedMesh) return;
      var src = srcLookup.get(node), bones = src.skeleton.bones;
      node.skeleton = src.skeleton.clone();
      node.bindMatrix.copy(src.bindMatrix);
      node.skeleton.bones = bones.map(function(b){ return cloneLookup.get(b); });
      node.bind(node.skeleton, node.bindMatrix);
    });
    return cloned;
  }

  // ---------------- tinting ----------------
  function hexToRgb(c){
    if (c == null) return null;
    if (typeof c === 'number') return [(c >> 16) & 255, (c >> 8) & 255, c & 255];
    var s = String(c).trim();
    if (s[0] === '#') s = s.slice(1);
    if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
    if (!/^[0-9a-f]{6}$/i.test(s)) return null;
    var n = parseInt(s, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function lum(r){ return (0.299 * r[0] + 0.587 * r[1] + 0.114 * r[2]) / 255; }
  function defaultSecondary(p){ return lum(p) < 0.45 ? [236, 236, 236] : [22, 24, 30]; }
  function loadMask(entry){
    var info = entry.tintInfo; if (!info || !info.mask) return;
    var img = new Image();
    img.onload = function(){ entry.maskImg = img; (entry.maskWait || []).forEach(function(f){ f(); }); entry.maskWait = []; };
    img.src = info.mask;
  }
  function tintedMaterial(entry, key, cols){
    entry.mats = entry.mats || {};
    if (entry.mats[key]) return entry.mats[key];
    var base = entry.bodyMat, map = base && base.map, info = entry.tintInfo;
    if (!map || !map.image || !entry.maskImg || !info) return null;
    var w = map.image.width, h = map.image.height;
    var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    var g = cv.getContext('2d'); g.drawImage(map.image, 0, 0, w, h);
    var px = g.getImageData(0, 0, w, h), d = px.data;
    var mc = document.createElement('canvas'); mc.width = w; mc.height = h;
    var mg = mc.getContext('2d'); mg.drawImage(entry.maskImg, 0, 0, w, h);
    var m = mg.getImageData(0, 0, w, h).data;
    var ref = info.ref || [0.3, 0.3, 0.3], gain = info.gain || [1, 1, 1], flat = info.flat || [0, 0, 0];
    for (var i = 0; i < d.length; i += 4){
      var m0 = m[i] / 255, m1 = m[i + 1] / 255, m2 = m[i + 2] / 255, mt = m0 + m1 + m2;
      if (mt < 0.004) continue;
      if (mt > 1){ m0 /= mt; m1 /= mt; m2 /= mt; mt = 1; }
      var r = d[i], gg = d[i + 1], b = d[i + 2], L = (0.299 * r + 0.587 * gg + 0.114 * b) / 255;
      var or = r * (1 - mt), og = gg * (1 - mt), ob = b * (1 - mt);
      for (var k = 0; k < 3; k++){
        var mk = k === 0 ? m0 : k === 1 ? m1 : m2; if (mk <= 0) continue;
        var c = cols[k], s = ((1 - flat[k]) * Math.min(1.7, L / ref[k]) + flat[k]) * gain[k];
        or += mk * Math.min(255, c[0] * s); og += mk * Math.min(255, c[1] * s); ob += mk * Math.min(255, c[2] * s);
      }
      d[i] = or; d[i + 1] = og; d[i + 2] = ob;
    }
    g.putImageData(px, 0, 0);
    var tex = new THREE.CanvasTexture(cv);
    tex.flipY = map.flipY; tex.encoding = map.encoding; tex.wrapS = map.wrapS; tex.wrapT = map.wrapT;
    tex.minFilter = map.minFilter; tex.magFilter = map.magFilter; tex.anisotropy = map.anisotropy;
    var mat = base.clone(); mat.map = tex; mat.needsUpdate = true;
    entry.mats[key] = mat; return mat;
  }
  function applyColors(root){
    var ud = root.userData, entry = cache[ud.kind];
    if (!entry || !ud.model || !ud.colors) return;
    var c = ud.colors, p = hexToRgb(c[0]);
    if (!p){ setBodyMat(root, entry.bodyMat); return; }
    var s = hexToRgb(c[1]) || defaultSecondary(p), gr = hexToRgb(c[2]) || (ud.kind === 'goalie' ? p : s);
    var key = p.join(',') + '|' + s.join(',') + '|' + gr.join(',');
    if (!entry.maskImg){ (entry.maskWait = entry.maskWait || []).push(function(){ applyColors(root); }); return; }
    var mat = tintedMaterial(entry, key, [p, s, gr]);
    if (mat) setBodyMat(root, mat);
  }
  function setBodyMat(root, mat){
    root.userData.model.traverse(function(o){ if (o.isMesh && o.userData.ctfoBody) o.material = mat; });
  }

  // ---------------- animation / locomotion ----------------
  function angDiff(a, b){ var d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; }
  function startClip(st, name, opts){
    opts = opts || {};
    var entry = cache[st.kind], clip = entry.clipMap[name];
    if (!clip) { console.warn('[ctfo] unknown clip', name); return null; }
    var loop = opts.loop != null ? opts.loop : !!LOOPING[name];
    var fade = opts.fade != null ? opts.fade : CFG.fade;
    var act = st.mixer.clipAction(clip);
    if (st.action === act && loop){ act.setEffectiveTimeScale(opts.timeScale || 1); return act; }
    act.reset();
    act.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
    act.clampWhenFinished = !loop;
    act.setEffectiveTimeScale(opts.timeScale || 1).setEffectiveWeight(1);
    if (loop && opts.randomPhase) act.time = Math.random() * clip.duration;
    act.play();
    if (st.action && st.action !== act){ act.crossFadeFrom(st.action, fade, false); }
    st.action = act; st.name = name;
    return act;
  }
  function chooseLoco(st, root){
    var sp = Math.sqrt(st.vx * st.vx + st.vz * st.vz), name, ts = 1;
    if (st.kind === 'goalie'){
      var ry = root.rotation.y, lat = st.vx * Math.cos(ry) - st.vz * Math.sin(ry);
      if (Math.abs(lat) > CFG.goaliePush && st.name !== 't_push_left' && st.name !== 't_push_right'){
        play(st, root, lat > 0 ? 't_push_left' : 't_push_right', {fade: 0.1}); return;
      }
      name = st.goalieBase || 'goalie_ready';
    } else {
      if (sp < CFG.idleSpeed) name = 'idle';
      else if (Math.abs(st.yaw) > CFG.turnRate && sp > CFG.idleSpeed * 2) name = st.yaw > 0 ? 'crossover_left' : 'crossover_right';
      else if (sp > CFG.strideSpeed){ name = 'skate_stride'; ts = Math.max(0.75, Math.min(1.7, sp / CFG.strideRef)); }
      else name = 'glide';
    }
    if (name !== st.name && st.clock - st.switchAt < 0.3) return;   // hysteresis
    if (name !== st.name) st.switchAt = st.clock;
    startClip(st, name, {timeScale: ts, randomPhase: !st.name});
  }
  function play(st, root, name, opts){
    opts = opts || {};
    var loop = opts.loop != null ? opts.loop : !!LOOPING[name];
    var act = startClip(st, name, opts);
    if (!act) return null;
    st.oneShot = loop ? null : {action: act, hold: opts.hold || 0, done: false};
    if (loop && opts.auto == null) st.auto = false;   // an explicit loop disables auto-locomotion until setAuto(true)
    return act;
  }
  function tick(st, root, frame){
    if (st.frameStamp === frame) return;
    var now = performance.now();
    var dt = st.last ? (now - st.last) / 1000 : 0; st.last = now; st.frameStamp = frame;
    if (dt <= 0 || dt > 0.25) dt = Math.min(Math.max(dt, 0), 0.05);
    st.clock += dt;
    var x = root.position.x, z = root.position.z;
    if (st.px != null && dt > 0){
      var vx = (x - st.px) / dt, vz = (z - st.pz) / dt;
      if (vx * vx + vz * vz > 1600){ vx = st.vx; vz = st.vz; }          // teleport / line change
      var a = 1 - Math.exp(-dt * 8);
      st.vx += (vx - st.vx) * a; st.vz += (vz - st.vz) * a;
      st.yaw += (angDiff(root.rotation.y, st.pry) / dt - st.yaw) * a;
    }
    st.px = x; st.pz = z; st.pry = root.rotation.y;
    if (st.oneShot){
      var os = st.oneShot;
      if (!os.action.isRunning() || os.action.time >= os.action.getClip().duration - 1e-3){
        if (!os.done){ os.done = true; os.until = st.clock + os.hold; }
        if (st.clock >= os.until){ st.oneShot = null; st.name = null; if (st.auto) chooseLoco(st, root); }
      }
    } else if (st.auto) chooseLoco(st, root);
    st.mixer.update(dt);
    st.model.updateMatrixWorld(true);
  }

  // ---------------- attach a model instance to a root ----------------
  function attach(root){
    var ud = root.userData, entry = cache[ud.kind];
    var model = cloneSkinned(entry.scene);
    var target = ud.kind === 'goalie' ? CFG.goalieHeight : CFG.skaterHeight;
    model.scale.setScalar(target / entry.height);
    var st = ud.ctfo = {kind: ud.kind, model: model, mixer: new THREE.AnimationMixer(model), vx: 0, vz: 0, yaw: 0, clock: 0, switchAt: -1, auto: true};
    model.traverse(function(o){
      if (!o.isMesh) return;
      o.frustumCulled = false;
      if (o.material && o.material.name && /_body$/.test(o.material.name)) o.userData.ctfoBody = 1;
      o.onBeforeRender = function(renderer){ tick(st, root, renderer.info.render.frame); };
    });
    root.add(model);
    ud.model = model; ud.filled = 1;
    st.mixer.addEventListener('finished', function(){});
    chooseLoco(st, root);
    if (ud.colors && CFG.autoTint) applyColors(root);
  }
  function load(kind){
    if (started[kind]) return; started[kind] = 1;
    var b64 = kind === 'goalie' ? window.GOALIE_GLB : window.SKATER_GLB;
    if (!b64 || !THREE.GLTFLoader){ console.warn('[ctfo] missing GLB or GLTFLoader for', kind); return; }
    new THREE.GLTFLoader().parse(bytes(b64), '', function(gltf){
      var entry = cache[kind] = {scene: gltf.scene, clips: gltf.animations, clipMap: {}, tintInfo: kind === 'goalie' ? window.GOALIE_TINT : window.SKATER_TINT};
      gltf.animations.forEach(function(c){ entry.clipMap[c.name] = c; });
      registry.clips[kind] = gltf.animations.map(function(c){ return c.name; });
      gltf.scene.updateMatrixWorld(true);
      var box = new THREE.Box3(), first = true;
      gltf.scene.traverse(function(o){
        if (o.isMesh && o.material && /_body$/.test(o.material.name)){
          entry.bodyMat = o.material;
          o.geometry.computeBoundingBox(); var bb = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);
          if (first){ box.copy(bb); first = false; } else box.union(bb);
        }
      });
      entry.height = (entry.tintInfo && entry.tintInfo.height) || (kind === 'goalie' ? 1.42 : 1.9);
      loadMask(entry);
      waiting[kind].forEach(function(r){ if (!r.userData.filled) attach(r); });
      waiting[kind] = [];
    }, function(err){ console.error('[ctfo] GLB parse failed', kind, err); });
  }

  window.buildHockeyPlayer = function(THREE_, color, num, isGoalie, opts){
    opts = opts || {};
    var root = new THREE.Group(), kind = isGoalie ? 'goalie' : 'skater';
    root.userData = {legL: {rotation: {}}, legR: {rotation: {}}, goalie: isGoalie ? 1 : 0, kind: kind, num: num,
      colors: CFG.autoTint && color != null ? [color, opts.secondary, opts.gear] : null};
    var ud = root.userData;
    ud.play = function(name, o){ var st = ud.ctfo; if (!st){ ud.pending = [name, o]; return null; } return play(st, root, name, o); };
    ud.setAuto = function(on){ if (ud.ctfo){ ud.ctfo.auto = !!on; if (on){ ud.ctfo.oneShot = null; chooseLoco(ud.ctfo, root); } } else ud.autoPending = !!on; };
    ud.setGoalieBase = function(name){ if (ud.ctfo) ud.ctfo.goalieBase = name; };
    ud.setColors = function(p, s, g){ ud.colors = [p, s, g]; applyColors(root); };
    ud.clips = function(){ return registry.clips[kind].slice(); };
    ud.duration = function(name){ var e = cache[kind], c = e && e.clipMap[name]; return c ? c.duration : 0; };
    ud.current = function(){ return ud.ctfo ? ud.ctfo.name : null; };
    registry.all.push(root);
    var orig = attach;
    if (cache[kind]){ attach(root); afterAttach(root); return root; }
    waiting[kind].push(root);
    var check = setInterval(function(){ if (ud.filled){ clearInterval(check); afterAttach(root); } }, 50);
    load(kind);
    return root;
  };
  function afterAttach(root){
    var ud = root.userData;
    if (ud.autoPending != null) ud.setAuto(ud.autoPending);
    if (ud.pending){ var p = ud.pending; ud.pending = null; ud.play(p[0], p[1]); }
  }
})();
