export class Sfx {
  private ctx: AudioContext | null = null;
  volume = 0.4;

  private ac(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) this.ctx = new AudioContext();
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  hit(): void {
    this.blip(880, 0.045, "sine");
  }

  miss(): void {
    this.blip(180, 0.04, "square");
  }

  hurt(): void {
    this.blip(90, 0.08, "sawtooth");
  }

  private blip(freq: number, dur: number, type: OscillatorType): void {
    const ctx = this.ac();
    if (!ctx || this.volume <= 0) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(this.volume * 0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  }
}
