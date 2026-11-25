/**
 * Practice session FSM. No DOM.
 * Phases per segment: prep → hold → breathe → rest → (next | done)
 */

export const PRACTICE_SCREEN = Object.freeze({
  disclaimer: "disclaimer",
  choose: "choose",
  active: "active",
  done: "done",
});

export const PRACTICE_PHASE = Object.freeze({
  prep: "prep",
  hold: "hold",
  breathe: "breathe",
  rest: "rest",
});

export const PRACTICE_MODE = Object.freeze({
  segment: "segment",
  full: "full",
});

const PHASE_ORDER = [
  PRACTICE_PHASE.prep,
  PRACTICE_PHASE.hold,
  PRACTICE_PHASE.breathe,
  PRACTICE_PHASE.rest,
];

/**
 * @param {object} options
 * @param {() => number} [options.now]
 * @param {import('../data/cards.js').MoveSet} options.set
 * @param {(id: string) => boolean} [options.isComplete]
 */
export function createPracticeFSM(options) {
  const now = options.now ?? (() => Date.now());
  const set = options.set;
  const isComplete = options.isComplete ?? (() => false);

  let snapshot = {
    screen: PRACTICE_SCREEN.disclaimer,
    mode: PRACTICE_MODE.segment,
    segmentIndex: firstIncompleteIndex(),
    phase: PRACTICE_PHASE.prep,
    phaseStartedAt: null,
    sessionStartedAt: null,
    elapsedMs: 0,
    interrupts: 0,
    completedSegmentIds: [],
    finished: false,
  };

  function firstIncompleteIndex() {
    const idx = set.segments.findIndex((seg) => !isComplete(seg.id));
    return idx >= 0 ? idx : 0;
  }

  function currentSegment() {
    return set.segments[snapshot.segmentIndex] ?? null;
  }

  function phaseDurationMs(segment, phase) {
    const base = segment?.durationsMs ?? {};
    return base[phase] ?? 4000;
  }

  function view(at = now()) {
    const segment = currentSegment();
    const phaseMs = segment ? phaseDurationMs(segment, snapshot.phase) : 0;
    const phaseElapsed =
      snapshot.screen === PRACTICE_SCREEN.active && snapshot.phaseStartedAt != null
        ? Math.max(0, at - snapshot.phaseStartedAt)
        : 0;
    const phaseRemaining = Math.max(0, phaseMs - phaseElapsed);
    const progress =
      snapshot.screen === PRACTICE_SCREEN.active && phaseMs > 0
        ? Math.min(1, phaseElapsed / phaseMs)
        : 0;

    return {
      screen: snapshot.screen,
      mode: snapshot.mode,
      setId: set.id,
      setTitle: set.title,
      segmentIndex: snapshot.segmentIndex,
      segment,
      phase: snapshot.phase,
      phaseRemainingMs: phaseRemaining,
      phaseProgress: progress,
      elapsedMs: snapshot.elapsedMs + liveElapsed(at),
      interrupts: snapshot.interrupts,
      completedSegmentIds: [...snapshot.completedSegmentIds],
      finished: snapshot.finished,
      recommendedIndex: firstIncompleteIndex(),
    };
  }

  function liveElapsed(at) {
    if (snapshot.screen !== PRACTICE_SCREEN.active || snapshot.sessionStartedAt == null) return 0;
    return Math.max(0, at - snapshot.sessionStartedAt);
  }

  function commitElapsed(at) {
    snapshot.elapsedMs += liveElapsed(at);
    snapshot.sessionStartedAt = null;
  }

  return {
    getState(at) {
      return view(at);
    },

    skipDisclaimer() {
      snapshot.screen = PRACTICE_SCREEN.choose;
      return view();
    },

    acceptDisclaimer() {
      snapshot.screen = PRACTICE_SCREEN.choose;
      return view();
    },

    selectMode(mode, segmentIndex) {
      snapshot.mode = mode === PRACTICE_MODE.full ? PRACTICE_MODE.full : PRACTICE_MODE.segment;
      if (typeof segmentIndex === "number" && set.segments[segmentIndex]) {
        snapshot.segmentIndex = segmentIndex;
      } else {
        snapshot.segmentIndex = firstIncompleteIndex();
      }
      return view();
    },

    begin(at = now()) {
      snapshot.screen = PRACTICE_SCREEN.active;
      snapshot.phase = PRACTICE_PHASE.prep;
      snapshot.phaseStartedAt = at;
      snapshot.sessionStartedAt = at;
      snapshot.finished = false;
      return { type: "begun", state: view(at) };
    },

    interrupt(at = now()) {
      if (snapshot.screen !== PRACTICE_SCREEN.active) return { type: "noop", state: view(at) };
      commitElapsed(at);
      snapshot.interrupts += 1;
      snapshot.screen = PRACTICE_SCREEN.done;
      snapshot.finished = false;
      snapshot.phaseStartedAt = null;
      return { type: "interrupted", state: view(at) };
    },

    tick(at = now()) {
      if (snapshot.screen !== PRACTICE_SCREEN.active || snapshot.phaseStartedAt == null) return null;
      const segment = currentSegment();
      if (!segment) return null;
      const phaseMs = phaseDurationMs(segment, snapshot.phase);
      if (at - snapshot.phaseStartedAt < phaseMs) return null;

      const phaseIndex = PHASE_ORDER.indexOf(snapshot.phase);
      if (phaseIndex < PHASE_ORDER.length - 1) {
        snapshot.phase = PHASE_ORDER[phaseIndex + 1];
        snapshot.phaseStartedAt = at;
        return { type: "phase", state: view(at) };
      }

      if (!snapshot.completedSegmentIds.includes(segment.id)) {
        snapshot.completedSegmentIds.push(segment.id);
      }

      const hasNext =
        snapshot.mode === PRACTICE_MODE.full && snapshot.segmentIndex < set.segments.length - 1;

      if (hasNext) {
        snapshot.segmentIndex += 1;
        snapshot.phase = PRACTICE_PHASE.prep;
        snapshot.phaseStartedAt = at;
        return { type: "segment", state: view(at) };
      }

      commitElapsed(at);
      snapshot.screen = PRACTICE_SCREEN.done;
      snapshot.finished = true;
      snapshot.phaseStartedAt = null;
      return { type: "completed", state: view(at) };
    },

    finishEarly(at = now()) {
      if (snapshot.screen !== PRACTICE_SCREEN.active) return { type: "noop", state: view(at) };
      const segment = currentSegment();
      if (segment && !snapshot.completedSegmentIds.includes(segment.id)) {
        snapshot.completedSegmentIds.push(segment.id);
      }
      commitElapsed(at);
      snapshot.screen = PRACTICE_SCREEN.done;
      snapshot.finished = true;
      snapshot.phaseStartedAt = null;
      return { type: "completed", state: view(at) };
    },
  };
}
