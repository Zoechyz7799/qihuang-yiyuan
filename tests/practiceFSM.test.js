import assert from "node:assert/strict";
import test from "node:test";
import { createPracticeFSM, PRACTICE_SCREEN } from "../js/core/practiceFSM.js";
import { SAMPLE_SET } from "../js/data/cards.js";

test("practice goes disclaimer → choose → active → done", () => {
  let clock = 0;
  const fsm = createPracticeFSM({
    now: () => clock,
    set: SAMPLE_SET,
    isComplete: () => false,
  });
  assert.equal(fsm.getState().screen, PRACTICE_SCREEN.disclaimer);
  fsm.skipDisclaimer();
  assert.equal(fsm.getState().screen, PRACTICE_SCREEN.choose);
  fsm.selectMode("segment", 0);
  fsm.begin(clock);
  assert.equal(fsm.getState().screen, PRACTICE_SCREEN.active);

  // Advance through prep → hold → breathe → rest → completed.
  const seg = SAMPLE_SET.segments[0];
  let event = null;
  for (const key of ["prep", "hold", "breathe", "rest"]) {
    clock += seg.durationsMs[key];
    event = fsm.tick(clock);
  }
  assert.equal(event.type, "completed");
  assert.equal(event.state.screen, PRACTICE_SCREEN.done);
  assert.equal(event.state.finished, true);
});

test("interrupt increments counter and ends session", () => {
  let clock = 0;
  const fsm = createPracticeFSM({ now: () => clock, set: SAMPLE_SET });
  fsm.skipDisclaimer();
  fsm.begin(clock);
  clock += 1000;
  const event = fsm.interrupt(clock);
  assert.equal(event.type, "interrupted");
  assert.equal(event.state.interrupts, 1);
  assert.equal(event.state.screen, PRACTICE_SCREEN.done);
});
