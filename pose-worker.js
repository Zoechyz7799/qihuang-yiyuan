/**
 * Pose tracking + contest coach checks for an active MediaStream.
 * Does not request the camera; only consumes a stream from cameraFSM.
 */

import { createPoseLandmarker, summarizePose } from "./vendor/mediapipe-pose.js";
import { createEvaluator } from "./js/core/coach.js";

/**
 * @param {object} options
 * @param {HTMLVideoElement} options.video
 * @param {(pose: object) => void} [options.onPose]
 */
export function createPoseTracker(options) {
  const video = options.video;
  const onPose = options.onPose ?? (() => {});
  const evaluator = createEvaluator();
  let landmarker = null;
  let raf = 0;
  let running = false;
  let lastVideoTime = -1;
  let checkTarget = "rest";
  let mode = "standing";

  function setCheck(target, nextMode = "standing") {
    checkTarget = target || "rest";
    mode = nextMode || "standing";
    evaluator.reset();
  }

  async function attach(stream) {
    await detach();
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    await video.play().catch(() => {});
    try {
      landmarker = await createPoseLandmarker();
    } catch (err) {
      onPose({
        detected: false,
        score: 0,
        nose: null,
        shoulders: null,
        landmarks: null,
        coach: null,
        error: String(err?.message || err),
      });
      landmarker = null;
    }
    running = true;
    loop();
  }

  function loop() {
    if (!running) return;
    raf = requestAnimationFrame(loop);
    if (!landmarker || video.readyState < 2) return;
    if (video.currentTime === lastVideoTime) return;
    lastVideoTime = video.currentTime;
    try {
      const now = performance.now();
      const result = landmarker.detectForVideo(video, now);
      const summary = summarizePose(result);
      const aspect =
        video.videoWidth && video.videoHeight
          ? video.videoWidth / video.videoHeight
          : 4 / 3;
      let coach = null;
      if (summary.detected && summary.landmarks) {
        coach = evaluator.evaluate(summary.landmarks, checkTarget, mode, aspect, {
          worldLandmarks: summary.worldLandmarks,
          timestamp: now,
        });
      }
      onPose({ ...summary, coach, check: checkTarget });
    } catch {
      onPose({
        detected: false,
        score: 0,
        nose: null,
        shoulders: null,
        landmarks: null,
        coach: null,
      });
    }
  }

  async function detach() {
    running = false;
    if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
    lastVideoTime = -1;
    video.pause?.();
    video.srcObject = null;
    evaluator.reset();
    if (landmarker) {
      try {
        landmarker.close?.();
      } catch {
        /* ignore */
      }
      landmarker = null;
    }
  }

  return { attach, detach, setCheck };
}
