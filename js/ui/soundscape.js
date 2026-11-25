/**
 * 離線中國風練習配樂 + 鼓點，完全用 Web Audio 合成。
 *
 * 沒有音檔、沒有網路請求、不碰麥克風權限；AudioContext 只在使用者
 * 按下「開始」的手勢中建立。音樂與鼓點同一個開關，關掉就全靜音。
 *
 * 五聲音階（宮商角徵羽）以 D 為宮：D E F# A B；低音 D3 作持續音。
 * 不使用亂數：白噪音用固定種子的 LCG 產生，整個播放序列可重現。
 */

const SOUND_KEY = "qimai-sound";
const NOTES = Object.freeze([293.66, 329.63, 369.99, 440.0, 493.88, 587.33]);
const DRONE = 146.83;
const PATTERN = Object.freeze([0, 2, 4, 3, 1, 3, 5, 4, 0, 4, 2, 1, 3, 2, 0, 4]);
const STEP_SEC = 0.56;

function readEnabled() {
  try {
    return localStorage.getItem(SOUND_KEY) !== "off";
  } catch {
    return true;
  }
}

function writeEnabled(on) {
  try {
    localStorage.setItem(SOUND_KEY, on ? "on" : "off");
  } catch {
    /* private mode */
  }
}

export function createSoundscape() {
  let ctx = null;
  let master = null;
  let musicGain = null;
  let schedulerId = 0;
  let running = false;
  let enabled = readEnabled();
  let nextNoteAt = 0;
  let step = 0;
  let noiseSeed = 20261125;

  function pseudo() {
    noiseSeed = (Math.imul(noiseSeed, 1664525) + 1013904223) >>> 0;
    return noiseSeed / 4294967296;
  }

  function ensureContext() {
    if (ctx) return ctx;
    if (typeof window === "undefined") return null;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.55;
      master.connect(ctx.destination);
      musicGain = ctx.createGain();
      musicGain.gain.value = enabled ? 0.18 : 0;
      musicGain.connect(master);
    } catch {
      ctx = null;
    }
    return ctx;
  }

  /** 古箏／琵琶感的撥弦：三角波 + 低通 + 快速衰減。 */
  function pluck(freq, at, duration, level) {
    if (!ctx || !musicGain) return;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, at);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(2400, at);
    filter.frequency.exponentialRampToValueAtTime(900, at + duration);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(level, at + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(musicGain);
    osc.start(at);
    osc.stop(at + duration + 0.05);
  }

  /** 鼓點：下滑低頻 + 短噪聲，模擬堂鼓，不使用任何音檔。 */
  function drum(at, strong = false) {
    if (!ctx || !master) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(strong ? 165 : 125, at);
    osc.frequency.exponentialRampToValueAtTime(48, at + 0.16);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(strong ? 0.42 : 0.2, at + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.3);
    osc.connect(gain);
    gain.connect(master);
    osc.start(at);
    osc.stop(at + 0.32);

    const length = Math.max(1, Math.floor(ctx.sampleRate * 0.07));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      data[i] = (pseudo() * 2 - 1) * (1 - i / length);
    }
    const source = ctx.createBufferSource();
    const noiseGain = ctx.createGain();
    const lowpass = ctx.createBiquadFilter();
    source.buffer = buffer;
    noiseGain.gain.value = strong ? 0.1 : 0.05;
    lowpass.type = "lowpass";
    lowpass.frequency.value = 1000;
    source.connect(lowpass);
    lowpass.connect(noiseGain);
    noiseGain.connect(master);
    source.start(at);
  }

  function schedule() {
    if (!running || !ctx || !enabled) return;
    const ahead = ctx.currentTime + 0.45;
    while (nextNoteAt < ahead) {
      const at = Math.max(nextNoteAt, ctx.currentTime + 0.01);
      pluck(NOTES[PATTERN[step % PATTERN.length]], at, 1.15, 0.16);
      if (step % 4 === 0) pluck(DRONE, at, 1.9, 0.08);
      if (step % 8 === 0) drum(at, false);
      step += 1;
      nextNoteAt += STEP_SEC;
    }
  }

  return {
    /** 必須由使用者手勢呼叫（開始練習按鈕）。 */
    start() {
      if (!ensureContext()) return;
      if (ctx.state === "suspended") void ctx.resume();
      running = true;
      nextNoteAt = ctx.currentTime + 0.08;
      step = 0;
      // stop() 曾把 master 淡出到 0，重新開始必須還原。
      if (master) master.gain.setTargetAtTime(0.55, ctx.currentTime, 0.08);
      if (!schedulerId) schedulerId = window.setInterval(schedule, 160);
      schedule();
      if (enabled) musicGain.gain.setTargetAtTime(0.18, ctx.currentTime, 0.15);
    },

    /** 練習結束 / 中斷 / 離開頁面：立刻停掉排程並靜音。 */
    stop() {
      running = false;
      if (schedulerId) {
        clearInterval(schedulerId);
        schedulerId = 0;
      }
      if (ctx && musicGain) {
        musicGain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
        if (master) master.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
      }
    },

    /** 起・停・收 階段切換時打一下鼓。 */
    beat(stage = "hold") {
      if (!running || !enabled || !ctx) return;
      const strong = stage === "rise" || stage === "close";
      drum(ctx.currentTime + 0.01, strong);
    },

    isEnabled() {
      return enabled;
    },

    setEnabled(on) {
      enabled = Boolean(on);
      writeEnabled(enabled);
      if (ctx && musicGain) {
        musicGain.gain.setTargetAtTime(enabled ? 0.18 : 0, ctx.currentTime, 0.08);
        if (enabled && running) {
          nextNoteAt = ctx.currentTime + 0.05;
          schedule();
        }
      }
      return enabled;
    },

    toggle() {
      return this.setEnabled(!enabled);
    },

    dispose() {
      this.stop();
      if (ctx) {
        try {
          void ctx.close();
        } catch {
          /* already closed */
        }
      }
      ctx = null;
      master = null;
      musicGain = null;
    },
  };
}
