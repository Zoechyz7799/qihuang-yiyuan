/**
 * Camera lifecycle FSM. No DOM.
 * Default: never calls getUserMedia. Only start() requests media.
 * stop() ends every track. Safe to call repeatedly.
 */

export const CAMERA_PHASE = Object.freeze({
  off: "off",
  requesting: "requesting",
  on: "on",
  error: "error",
});

/**
 * @param {object} [options]
 * @param {typeof navigator.mediaDevices.getUserMedia} [options.getUserMedia]
 * @param {(stream: MediaStream) => void | Promise<void>} [options.onStream]
 * @param {() => void | Promise<void>} [options.onStop]
 */
export function createCameraFSM(options = {}) {
  const getUserMedia =
    options.getUserMedia ??
    ((constraints) => {
      if (!navigator.mediaDevices?.getUserMedia) {
        return Promise.reject(new Error("getUserMedia unavailable"));
      }
      return navigator.mediaDevices.getUserMedia(constraints);
    });

  let phase = CAMERA_PHASE.off;
  let stream = null;
  let error = null;
  let generation = 0;

  function view() {
    return {
      phase,
      stream,
      error,
      active: phase === CAMERA_PHASE.on,
    };
  }

  function stopTracks() {
    if (!stream) return;
    for (const track of stream.getTracks()) {
      try {
        track.stop();
      } catch {
        /* ignore */
      }
    }
    stream = null;
  }

  async function stop() {
    generation += 1;
    stopTracks();
    phase = CAMERA_PHASE.off;
    error = null;
    if (options.onStop) {
      try {
        await options.onStop();
      } catch {
        /* ignore */
      }
    }
    return view();
  }

  async function start(constraints = { video: { facingMode: "user" }, audio: false }) {
    if (phase === CAMERA_PHASE.requesting || phase === CAMERA_PHASE.on) {
      return view();
    }
    const gen = ++generation;
    phase = CAMERA_PHASE.requesting;
    error = null;
    try {
      const next = await getUserMedia(constraints);
      if (gen !== generation) {
        for (const track of next.getTracks()) track.stop();
        return view();
      }
      stream = next;
      phase = CAMERA_PHASE.on;
      if (options.onStream) await options.onStream(stream);
      return view();
    } catch (err) {
      if (gen !== generation) return view();
      stopTracks();
      phase = CAMERA_PHASE.error;
      error = err instanceof Error ? err.message : String(err);
      return view();
    }
  }

  return {
    getState: view,
    start,
    stop,
    /** Immediate track teardown for pagehide / unload (sync). */
    hardStop() {
      generation += 1;
      stopTracks();
      phase = CAMERA_PHASE.off;
      error = null;
      return view();
    },
  };
}
