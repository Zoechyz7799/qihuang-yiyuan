import assert from "node:assert/strict";
import test from "node:test";
import {
  createTimerFSM,
  formatClock,
  presetById,
  TIMER_PRESETS,
} from "../js/core/timerFSM.js";
import { ENCOURAGEMENTS, getCopy, pickEncouragement } from "../js/locale.js";

test("encouragements avoid repeating the line that is already showing", () => {
  assert.equal(ENCOURAGEMENTS.zh.length, 9);
  assert.equal(ENCOURAGEMENTS.en.length, 9);
  assert.equal(
    pickEncouragement(ENCOURAGEMENTS.zh, "你做得很好，繼續保持！", () => 0),
    "每一次練習都是進步。",
  );
});

test("english time-up copy says Time's up", () => {
  assert.equal(getCopy("en").alertShort, "Time's up");
  assert.equal(getCopy("en").tabFlash, "⏰ Time's up");
});

test("presets include 25 min, 45 min, and a 10 second demo", () => {
  assert.equal(presetById("25").ms, 25 * 60 * 1000);
  assert.equal(presetById("45").ms, 45 * 60 * 1000);
  assert.equal(presetById("demo").ms, 10 * 1000);
  assert.equal(TIMER_PRESETS.length, 3);
});

test("formatClock rounds up to the next second and clamps at zero", () => {
  assert.equal(formatClock(10_000), "00:10");
  assert.equal(formatClock(1), "00:01");
  assert.equal(formatClock(0), "00:00");
  assert.equal(formatClock(-20), "00:00");
});

test("a sparse tick still finishes on the wall clock", () => {
  let clock = 1_000;
  const timer = createTimerFSM({ now: () => clock });
  timer.start(presetById("demo"), clock);

  clock = 1_000 + 9_000;
  assert.equal(timer.tick(clock), null);
  assert.equal(timer.getState(clock).phase, "running");

  clock = 1_000 + 10_000;
  const event = timer.tick(clock);
  assert.equal(event.type, "completed");
  assert.equal(event.state.phase, "alert");
});

test("double-click alert is immediate", () => {
  const timer = createTimerFSM({ now: () => 50 });
  const first = timer.triggerAlert(50);
  assert.equal(first.type, "manual");
  assert.equal(first.state.phase, "alert");
});
