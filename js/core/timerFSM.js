/**
 * Wall-clock pomodoro FSM. No DOM, notifications, or speech.
 * Remaining time is derived from startedAt so a hidden tab does not pause.
 */

export const TIMER_PHASE = Object.freeze({
  idle: "idle",
  running: "running",
  alert: "alert",
});

export const TIMER_PRESETS = Object.freeze([
  Object.freeze({ id: "25", ms: 25 * 60 * 1000, labelKey: "min25" }),
  Object.freeze({ id: "45", ms: 45 * 60 * 1000, labelKey: "min45" }),
  Object.freeze({ id: "demo", ms: 10 * 1000, labelKey: "demo" }),
]);

export const DEFAULT_TIMER_PRESET_ID = "25";

export function formatClock(ms) {
  const total = Math.max(0, Math.ceil(Number(ms) / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function presetById(id) {
  return TIMER_PRESETS.find((preset) => preset.id === id) ?? TIMER_PRESETS[0];
}

export function createTimerFSM(options = {}) {
  const now = options.now ?? (() => Date.now());
  let snapshot = {
    phase: TIMER_PHASE.idle,
    presetId: DEFAULT_TIMER_PRESET_ID,
    durationMs: presetById(DEFAULT_TIMER_PRESET_ID).ms,
    startedAt: null,
  };

  function remainingMs(at) {
    if (snapshot.phase !== TIMER_PHASE.running || snapshot.startedAt == null) return 0;
    return Math.max(0, snapshot.durationMs - (at - snapshot.startedAt));
  }

  function displayMs(at) {
    if (snapshot.phase === TIMER_PHASE.running) return remainingMs(at);
    if (snapshot.phase === TIMER_PHASE.alert) return 0;
    return snapshot.durationMs;
  }

  function view(at = now()) {
    return {
      phase: snapshot.phase,
      presetId: snapshot.presetId,
      durationMs: snapshot.durationMs,
      startedAt: snapshot.startedAt,
      remainingMs: snapshot.phase === TIMER_PHASE.running ? remainingMs(at) : 0,
      displayMs: displayMs(at),
    };
  }

  function rest() {
    snapshot = {
      phase: TIMER_PHASE.idle,
      presetId: snapshot.presetId,
      durationMs: snapshot.durationMs,
      startedAt: null,
    };
    return view();
  }

  return {
    getState(at) {
      return view(at);
    },

    arm(preset) {
      if (snapshot.phase !== TIMER_PHASE.idle) return { ok: false, state: view() };
      snapshot = {
        phase: TIMER_PHASE.idle,
        presetId: preset.id,
        durationMs: preset.ms,
        startedAt: null,
      };
      return { ok: true, state: view() };
    },

    start(preset, at = now()) {
      snapshot = {
        phase: TIMER_PHASE.running,
        presetId: preset.id,
        durationMs: preset.ms,
        startedAt: at,
      };
      return { type: "started", state: view(at) };
    },

    stop() {
      return { type: "stopped", state: rest() };
    },

    dismiss() {
      return { type: "dismissed", state: rest() };
    },

    tick(at = now()) {
      if (snapshot.phase !== TIMER_PHASE.running) return null;
      if (remainingMs(at) > 0) return null;
      snapshot = { ...snapshot, phase: TIMER_PHASE.alert };
      return { type: "completed", state: view(at) };
    },

    triggerAlert(at = now()) {
      snapshot = { ...snapshot, phase: TIMER_PHASE.alert };
      return { type: "manual", state: view(at) };
    },
  };
}
