/**
 * Regression for the transplanted 4.0 teaching loop.
 * Verifies that a step really waits for a confirmed pose (no fake pass),
 * and that Kanshan has a real demonstration pose for every check target.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createInteractiveLesson, LESSON_STATUS } from "../js/core/interactiveLesson.js";
import { POSES, poseForCheck, demoPoseFor, sampleDemo, demoAmount } from "../js/data/demoPoses.js";
import { supported } from "../js/core/coach.js";
import { YIJIN_SET, WUSHU_THREE_SET, stageForPhase } from "../js/data/cards.js";

const readyCoach = (extra = {}) => ({
  tracking: true,
  ready: true,
  code: "ready",
  message: "本步要点已到位",
  hardFailure: false,
  checks: [],
  passed: 1,
  total: 1,
  ...extra,
});

function feedRun(lesson, clock, frames, coach = readyCoach()) {
  for (let i = 0; i < frames; i += 1) {
    clock.t += 100;
    lesson.feed({
      cameraOn: true,
      detected: true,
      coach,
      timestamp: clock.t,
    });
  }
}

describe("interactive lesson gate", () => {
  it("does not advance while the camera is off", () => {
    let passes = 0;
    const lesson = createInteractiveLesson({ now: () => 0, onPass: () => (passes += 1) });
    lesson.setStage({ key: "wei2|hold", check: "spread", gated: true });
    lesson.feed({ cameraOn: false, detected: false, coach: null, timestamp: 100 });
    assert.equal(lesson.getState().status, LESSON_STATUS.waitingCamera);
    assert.equal(lesson.getState().canAdvance, false);
    assert.equal(passes, 0);
  });

  it("does not advance when the move is merely seen but not correct", () => {
    const lesson = createInteractiveLesson({ now: () => 0 });
    lesson.setStage({ key: "wei2|hold", check: "spread", gated: true });
    lesson.feed({
      cameraOn: true,
      detected: true,
      coach: readyCoach({ ready: false, code: "out-left", message: "左臂再展开一点" }),
      timestamp: 100,
    });
    assert.equal(lesson.getState().status, LESSON_STATUS.adjusting);
    assert.equal(lesson.getState().canAdvance, false);
    assert.match(lesson.getState().detail, /左臂/);
  });

  it("passes only after a steady 1.2 s hold, and fires onPass once", () => {
    let passes = 0;
    const clock = { t: 1000 };
    const lesson = createInteractiveLesson({ now: () => clock.t, onPass: () => (passes += 1) });
    lesson.setStage({ key: "wei3|hold", check: "sky", gated: true });
    feedRun(lesson, clock, 4);
    assert.equal(lesson.getState().canAdvance, false, "4 frames are not 1.2 s yet");
    feedRun(lesson, clock, 14);
    assert.equal(lesson.getState().status, LESSON_STATUS.passed);
    assert.equal(lesson.getState().canAdvance, true);
    assert.equal(passes, 1);
    feedRun(lesson, clock, 6);
    assert.equal(passes, 1, "onPass must not repeat");
  });

  it("a gross deviation or a stalled stream cancels the accumulated hold", () => {
    const clock = { t: 5000 };
    const lesson = createInteractiveLesson({ now: () => clock.t });
    lesson.setStage({ key: "wei2|hold", check: "spread", gated: true });
    feedRun(lesson, clock, 6);
    assert.ok(lesson.getState().progress > 0);
    clock.t += 100;
    lesson.feed({
      cameraOn: true,
      detected: true,
      coach: readyCoach({ ready: false, hardFailure: true, message: "明显偏离" }),
      timestamp: clock.t,
    });
    assert.equal(lesson.getState().progress, 0);
    assert.equal(lesson.getState().canAdvance, false);

    feedRun(lesson, clock, 6);
    assert.ok(lesson.getState().progress > 0);
    clock.t += 1000;
    lesson.probe();
    assert.equal(lesson.getState().status, LESSON_STATUS.framing);
    assert.equal(lesson.getState().progress, 0);
  });

  it("bypass (僅跟練) restores plain timed practice, and a new step re-arms", () => {
    const lesson = createInteractiveLesson({ now: () => 0 });
    lesson.setStage({ key: "a|hold", check: "sky", gated: true });
    lesson.setBypass(true);
    assert.equal(lesson.getState().canAdvance, true);
    assert.equal(lesson.getState().status, LESSON_STATUS.bypass);
    lesson.setBypass(false);
    lesson.setStage({ key: "b|hold", check: "push", gated: true });
    assert.equal(lesson.getState().canAdvance, false);
    assert.equal(lesson.getState().status, LESSON_STATUS.demo);
  });

  it("non-scored phases keep their original rhythm", () => {
    const lesson = createInteractiveLesson({ now: () => 0 });
    lesson.setStage({ key: "a|prep", check: "rest", gated: false });
    assert.equal(lesson.getState().canAdvance, true);
    lesson.setStage({ key: "a|breathe", check: "sky", gated: false });
    assert.equal(lesson.getState().canAdvance, true);
  });
});

describe("Kanshan demonstration rig", () => {
  it("has a pose for every coach check, both sets included", () => {
    for (const check of supported) {
      assert.ok(POSES[poseForCheck(check)], `missing demo pose for ${check}`);
    }
    for (const set of [YIJIN_SET, WUSHU_THREE_SET]) {
      for (const seg of set.segments) {
        for (const st of seg.stages) {
          assert.ok(POSES[poseForCheck(st.check)], `${seg.id}/${st.phase} ${st.check}`);
        }
      }
    }
    // Every wushu move must really be demonstrable. "ready-fists" has a
    // loose rest check, so it gets its own fists demonstration pose.
    assert.equal(demoPoseFor("ready-fists", "rest"), "fists");
    assert.equal(demoPoseFor("heroic-block", "sky"), "sky");
    assert.equal(demoPoseFor("bow-push", "push"), "push");
    for (const seg of WUSHU_THREE_SET.segments) {
      const hold = stageForPhase(seg, "hold");
      const pose = demoPoseFor(seg.id, hold.check);
      assert.ok(POSES[pose], `${seg.id} demo pose`);
      assert.notEqual(pose, "rest", `${seg.id} should show a real move`);
    }
  });

  it("interpolates a continuous move with finite, non-degenerate joints", () => {
    for (const amount of [0, 0.25, 0.5, 0.75, 1]) {
      const points = sampleDemo("rest", "sky", amount);
      assert.equal(Object.keys(points).length, 13);
      for (const id of [0, 11, 12, 13, 14, 15, 16, 23, 24]) {
        assert.ok(Number.isFinite(points[id][0]) && Number.isFinite(points[id][1]), `joint ${id}`);
      }
      const upper = Math.hypot(points[13][0] - points[11][0], points[13][1] - points[11][1]);
      const fore = Math.hypot(points[15][0] - points[13][0], points[15][1] - points[13][1]);
      assert.ok(upper > 0.02 && fore > 0.02, "arms keep their length");
    }
    // Rising and closing phases produce different demonstration frames.
    assert.notDeepEqual(
      sampleDemo("rest", "spread", demoAmount("prep", 0))[15],
      sampleDemo("rest", "spread", demoAmount("breathe", 1))[15],
    );
  });
});
