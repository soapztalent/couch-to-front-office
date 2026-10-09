import type { ScriptLine } from "./lines";

/**
 * Speaks a script line. If the line has an audio file, that file plays.
 * Otherwise the browser speaks the text. Captions are the caller's job.
 */
export class Speaker {
  volume = 1;
  speaking = false;
  private token = 0;
  private audio: HTMLAudioElement | null = null;
  private skipWait: (() => void) | null = null;
  private resumeTimer = 0;

  constructor(private readonly onChange?: (speaking: boolean) => void) {}

  skip(): void {
    this.skipWait?.();
  }

  cancel(): void {
    this.token += 1;
    this.stopHardware();
    this.speaking = false;
    this.onChange?.(false);
  }

  async speak(scriptLine: ScriptLine): Promise<void> {
    const my = ++this.token;
    this.speaking = true;
    this.onChange?.(true);
    try {
      if (scriptLine.audio) {
        const played = await this.playFile(scriptLine.audio, my);
        if (!played && my === this.token) await this.playVoice(scriptLine.text, my);
      } else {
        await this.playVoice(scriptLine.text, my);
      }
    } finally {
      if (my === this.token) {
        this.speaking = false;
        this.onChange?.(false);
      }
    }
  }

  private stopHardware(): void {
    this.skipWait = null;
    if (this.resumeTimer) {
      window.clearInterval(this.resumeTimer);
      this.resumeTimer = 0;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (this.audio) {
      this.audio.pause();
      this.audio = null;
    }
  }

  private playFile(url: string, my: number): Promise<boolean> {
    return new Promise((resolve) => {
      if (my !== this.token) {
        resolve(false);
        return;
      }
      const audio = new Audio(url);
      this.audio = audio;
      audio.volume = Math.max(0, Math.min(1, this.volume));
      let settled = false;
      const finish = (ok: boolean) => {
        if (settled) return;
        settled = true;
        this.skipWait = null;
        resolve(ok);
      };
      this.skipWait = () => {
        audio.pause();
        finish(true);
      };
      audio.onended = () => finish(true);
      audio.onerror = () => finish(false);
      void audio.play().catch(() => finish(false));
    });
  }

  private playVoice(text: string, my: number): Promise<void> {
    const estimate = Math.min(12000, 800 + text.length * 58);
    return new Promise((resolve) => {
      if (my !== this.token) {
        resolve();
        return;
      }
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        this.skipWait = null;
        if (this.resumeTimer) {
          window.clearInterval(this.resumeTimer);
          this.resumeTimer = 0;
        }
        resolve();
      };
      const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;
      if (!synth) {
        this.skipWait = finish;
        window.setTimeout(finish, Math.min(estimate, 1800));
        return;
      }
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 0.96;
      utter.pitch = 0.94;
      utter.volume = Math.max(0, Math.min(1, this.volume));
      const voices = synth.getVoices();
      const english =
        voices.find((v) => v.lang.startsWith("en") && /natural|premium|enhanced/i.test(v.name)) ??
        voices.find((v) => v.lang.startsWith("en"));
      if (english) utter.voice = english;
      utter.onend = finish;
      utter.onerror = finish;
      this.skipWait = () => {
        synth.cancel();
        finish();
      };
      synth.cancel();
      synth.speak(utter);
      this.resumeTimer = window.setInterval(() => {
        if (synth.paused) synth.resume();
      }, 400);
      window.setTimeout(finish, estimate + 1600);
    });
  }
}
