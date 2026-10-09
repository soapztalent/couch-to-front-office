/* Original beeps, putters, and stingers. No sampled songs. */
(function (root) {
  function Bus() {
    this.ctx = null;
    this.master = null;
    this.engine = null;
    this.muted = false;
    this.rain = null;
  }

  Bus.prototype.unlock = function () {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      this.ctx = ctx;
      this.master = ctx.createGain();
      this.master.gain.value = 0.42;
      this.master.connect(ctx.destination);
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.value = 52;
      filter.type = "lowpass";
      filter.frequency.value = 220;
      gain.gain.value = 0.0001;
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      osc.start();
      this.engine = { osc: osc, filter: filter, gain: gain };
      this._startRain();
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
  };

  Bus.prototype._startRain = function () {
    const ctx = this.ctx;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 1, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 900;
    filter.Q.value = 0.4;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start();
    this.rain = gain;
  };

  Bus.prototype.setMuted = function (m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.42;
  };

  Bus.prototype.engineAt = function (speed, boost) {
    if (!this.engine || this.muted) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const rpm = 46 + speed * 6.4 + (boost ? 30 : 0);
    this.engine.osc.frequency.setTargetAtTime(rpm, now, 0.06);
    this.engine.filter.frequency.setTargetAtTime(180 + speed * 28, now, 0.08);
    this.engine.gain.gain.setTargetAtTime(0.012 + Math.min(0.05, speed * 0.0035), now, 0.08);
  };

  Bus.prototype.rainAt = function (on) {
    if (!this.rain || this.muted) return;
    this.rain.gain.setTargetAtTime(on ? 0.045 : 0, this.ctx.currentTime, 0.3);
  };

  Bus.prototype._tone = function (freq, dur, type, gainValue, slide) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || "sine";
    osc.frequency.value = freq;
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, slide), ctx.currentTime + dur);
    gain.gain.setValueAtTime(gainValue, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start();
    osc.stop(ctx.currentTime + dur + 0.02);
  };

  Bus.prototype._noise = function (dur, gainValue, freq) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = freq || 400;
    const gain = ctx.createGain();
    gain.gain.value = gainValue;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start();
  };

  Bus.prototype.horn = function () {
    this._tone(311, 0.22, "square", 0.06, 220);
    this._tone(415, 0.2, "square", 0.04, 300);
    this._noise(0.08, 0.03, 1200);
  };

  Bus.prototype.honkFar = function () {
    this._tone(280 + Math.random() * 80, 0.12, "square", 0.015, 200);
  };

  Bus.prototype.crash = function () {
    this._noise(0.35, 0.12, 180);
    this._tone(90, 0.3, "sawtooth", 0.05, 40);
  };

  Bus.prototype.moo = function () {
    this._tone(196, 0.45, "sine", 0.07, 120);
    this._tone(130, 0.4, "triangle", 0.03, 90);
  };

  Bus.prototype.tablet = function () {
    this._noise(0.12, 0.08, 900);
    this._tone(540, 0.08, "square", 0.03, 180);
  };

  Bus.prototype.door = function () {
    this._noise(0.18, 0.05, 250);
    this._tone(140, 0.16, "triangle", 0.03, 70);
  };

  Bus.prototype.wipe = function () {
    this._noise(0.09, 0.03, 1800);
  };

  Bus.prototype.chai = function () {
    this._tone(660, 0.12, "sine", 0.04, 880);
    this._tone(880, 0.16, "sine", 0.03, 1320);
  };

  Bus.prototype.dhol = function () {
    const self = this;
    [0, 0.14, 0.26, 0.4].forEach(function (t, i) {
      setTimeout(function () {
        self._noise(0.09, i % 2 ? 0.07 : 0.1, i % 2 ? 280 : 160);
        self._tone(i % 2 ? 180 : 98, 0.1, "sine", 0.04);
      }, t * 1000);
    });
  };

  Bus.prototype.clear = function () {
    const notes = [294, 370, 440, 554, 440];
    const self = this;
    notes.forEach(function (n, i) {
      setTimeout(function () { self._tone(n, 0.22, "triangle", 0.05); }, i * 140);
    });
    this.dhol();
  };

  Bus.prototype.ui = function () {
    this._tone(520, 0.06, "square", 0.02, 700);
  };

  Bus.prototype.say = function (text) {
    if (!window.speechSynthesis || this.muted) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.16;
      u.pitch = 1.12;
      u.volume = 1;
      const voices = window.speechSynthesis.getVoices() || [];
      const en = voices.filter(function (v) { return /en/i.test(v.lang); });
      if (en.length) u.voice = en[Math.floor(Math.random() * Math.min(3, en.length))];
      window.speechSynthesis.speak(u);
    } catch (err) { /* subtitles still carry the call */ }
  };

  root.ArreAudio = Bus;
})(typeof globalThis !== "undefined" ? globalThis : this);
