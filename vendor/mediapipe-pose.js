/**
 * MediaPipe Pose Landmarker loader — self-hosted, CPU delegate.
 *
 * The old 氣脈陪練 4.0 coach ran the model locally because a CDN/GPU setup
 * aborted on machines without a usable WebGL context and failed offline at
 * demos. This keeps the same API (createPoseLandmarker / summarizePose) but
 * loads the bundled WASM + model from ./vendor/tasks-vision/, and keeps the
 * relaxed detection thresholds that let a seated 40–50 cm user be seen.
 */

const BUNDLE_URL = new URL("./tasks-vision/vision_bundle.mjs", import.meta.url).href;
const WASM_ROOT = new URL("./tasks-vision/wasm", import.meta.url).href;
const MODEL_URL = new URL("./tasks-vision/pose_landmarker_lite.task", import.meta.url).href;

let visionPromise = null;
let landmarkerPromise = null;

async function loadVision() {
  if (!visionPromise) visionPromise = import(BUNDLE_URL);
  return visionPromise;
}

export async function createPoseLandmarker() {
  if (landmarkerPromise) return landmarkerPromise;
  landmarkerPromise = (async () => {
    const vision = await loadVision();
    const { FilesetResolver, PoseLandmarker } = vision;
    const fileset = await FilesetResolver.forVisionTasks(WASM_ROOT);
    return PoseLandmarker.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath: MODEL_URL,
        delegate: "CPU",
      },
      runningMode: "VIDEO",
      numPoses: 1,
      // Close-range seated use often shows only head + shoulders.
      minPoseDetectionConfidence: 0.3,
      minPosePresenceConfidence: 0.3,
      minTrackingConfidence: 0.3,
    });
  })();
  try {
    return await landmarkerPromise;
  } catch (err) {
    landmarkerPromise = null;
    throw err;
  }
}

/**
 * @param {import('@mediapipe/tasks-vision').PoseLandmarkerResult | null} result
 */
export function summarizePose(result) {
  const landmarks = result?.landmarks?.[0] || null;
  const worldLandmarks = result?.worldLandmarks?.[0] || null;
  if (!landmarks || landmarks.length < 25) {
    return {
      detected: false,
      score: 0,
      nose: null,
      shoulders: null,
      landmarks: null,
      worldLandmarks: null,
    };
  }
  const nose = landmarks[0];
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  const visible = landmarks.filter((p) => (p.visibility ?? 1) > 0.4).length;
  return {
    detected: true,
    score: Math.round((visible / landmarks.length) * 100),
    nose: { x: round(nose.x), y: round(nose.y) },
    shoulders: {
      left: { x: round(leftShoulder.x), y: round(leftShoulder.y) },
      right: { x: round(rightShoulder.x), y: round(rightShoulder.y) },
    },
    landmarks,
    worldLandmarks,
  };
}

function round(n) {
  return Math.round(Number(n) * 1000) / 1000;
}
