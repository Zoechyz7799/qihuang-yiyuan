/**
 * Interactive lesson gate — the teaching loop from 氣脈陪練 4.0:
 *   Kanshan demonstrates → you copy the move → the camera checks the shape →
 *   hold it steadily for 1.2 s → only then does the lesson advance.
 *
 * Pure logic (no DOM). It consumes the coach result produced by the existing
 * coach.js evaluator and reuses its advanceHold() confirmation, so all the
 * original anti-false-pass rules (stale frames, gross deviation, occlusion)
 * stay intact.
 */

import { advanceHold, holdMs, staleMs } from "./coach.js";

export const LESSON_STATUS = Object.freeze({
  demo: "demo",
  waitingCamera: "waitingCamera",
  framing: "framing",
  adjusting: "adjusting",
  holding: "holding",
  passed: "passed",
  bypass: "bypass",
});

/**
 * @param {object} [options]
 * @param {() => number} [options.now]
 * @param {() => void} [options.onPass] called once when a gated step is passed
 */
export function createInteractiveLesson(options = {}) {
  const now = options.now ?? (() => Date.now());
  const onPass = options.onPass ?? (() => {});

  let stageKey = "";
  let check = "rest";
  let gated = false;
  let bypass = false;
  let hold = null;
  let status = LESSON_STATUS.demo;
  let detail = "";
  let cameraOn = false;
  let lastFeedAt = null;
  let passed = false;

  function progress() {
    return hold ? Math.min(1, hold.elapsed / holdMs) : 0;
  }

  function view() {
    return {
      status,
      detail,
      progress: progress(),
      ready: status === LESSON_STATUS.passed,
      cameraOn,
      gated,
      bypass,
      check,
      canAdvance: !gated || bypass || passed,
    };
  }

  function setStage(next) {
    const key = String(next.key ?? "");
    if (key === stageKey) return view();
    stageKey = key;
    check = next.check || "rest";
    gated = Boolean(next.gated);
    hold = null;
    passed = false;
    status = LESSON_STATUS.demo;
    detail = "";
    lastFeedAt = null;
    return view();
  }

  /** Feed one pose observation (called from the pose tracker callback). */
  function feed(observation = {}) {
    cameraOn = Boolean(observation.cameraOn);
    if (!gated || bypass) {
      status = bypass ? LESSON_STATUS.bypass : LESSON_STATUS.demo;
      detail = "";
      return view();
    }
    if (!cameraOn) {
      hold = null;
      lastFeedAt = null;
      status = LESSON_STATUS.waitingCamera;
      detail = "";
      return view();
    }

    const coach = observation.coach || null;
    const detected = Boolean(observation.detected);
    const at = Number.isFinite(observation.timestamp) ? observation.timestamp : now();
    lastFeedAt = at;

    if (!detected || !coach || !coach.tracking || coach.code === "missing" || coach.code === "framing" || coach.code === "geometry") {
      hold = null;
      if (passed) return view();
      status = LESSON_STATUS.framing;
      detail = coach?.message || "";
      return view();
    }

    const obs = { ready: coach.ready === true, hardFailure: Boolean(coach.hardFailure) };
    hold = advanceHold(hold, obs, at, holdMs);
    if (hold.complete || passed) {
      if (!passed) {
        passed = true;
        onPass();
      }
      status = LESSON_STATUS.passed;
      detail = "";
      return view();
    }
    status = obs.ready ? LESSON_STATUS.holding : LESSON_STATUS.adjusting;
    detail = obs.ready ? "" : coach.message || "";
    return view();
  }

  /** Called on the UI tick so a missing/stalled camera cannot leave a stale "holding". */
  function probe() {
    if (!gated || bypass || passed) return view();
    if (!cameraOn || lastFeedAt === null || now() - lastFeedAt > staleMs) {
      hold = null;
      status = cameraOn ? LESSON_STATUS.framing : LESSON_STATUS.waitingCamera;
      detail = "";
    }
    return view();
  }

  function setBypass(next) {
    bypass = Boolean(next);
    hold = null;
    passed = false;
    lastFeedAt = null;
    status = bypass ? LESSON_STATUS.bypass : LESSON_STATUS.demo;
    detail = "";
    return view();
  }

  function reset() {
    stageKey = "";
    hold = null;
    passed = false;
    status = LESSON_STATUS.demo;
    detail = "";
    lastFeedAt = null;
    return view();
  }

  return { setStage, feed, probe, setBypass, reset, getState: view, isBypass: () => bypass };
}

/**
 * 純邏輯：是否要讓「看山確認動作達標」卡住節奏。
 * 默認無攝像頭模式（cameraActive=false）一律不判定，練習照原節奏走完；
 * 只有使用者主動一鍵開鏡頭、且沒有按「僅跟練」時才啟用判定。
 */
export function shouldGateLesson(options = {}) {
  const {
    screen = "active",
    phase = "hold",
    cameraActive = false,
    bypass = false,
    hasCheck = true,
  } = options;
  return (
    screen === "active" &&
    phase === "hold" &&
    Boolean(cameraActive) &&
    !Boolean(bypass) &&
    Boolean(hasCheck)
  );
}

export { holdMs as LESSON_HOLD_MS };
