/**
 * Liu Kanshan demonstration poses — ESM port of the old 氣脈陪練 4.0
 * courses.js (pose table) + motion.js (joint-angle interpolation).
 *
 * This module is pure data/geometry: no DOM, no camera, no MediaPipe.
 * It only produces the skeleton points that kanshanCoach.js draws, so the
 * mascot can actually *show* the move instead of cycling a static sticker.
 */

/** MediaPipe landmark ids used by the old rig (x, y in 0..1 frame space). */
const BASE = Object.freeze({
  0: [0.5, 0.19],
  11: [0.39, 0.35],
  12: [0.61, 0.35],
  13: [0.35, 0.47],
  14: [0.65, 0.47],
  15: [0.36, 0.59],
  16: [0.64, 0.59],
  23: [0.43, 0.61],
  24: [0.57, 0.61],
  25: [0.42, 0.77],
  26: [0.58, 0.77],
  27: [0.4, 0.94],
  28: [0.6, 0.94],
});

const shape = (changes) => ({ ...BASE, ...changes });

const MIRROR_PAIRS = Object.freeze({
  11: 12, 12: 11, 13: 14, 14: 13, 15: 16, 16: 15,
  23: 24, 24: 23, 25: 26, 26: 25, 27: 28, 28: 27,
});

function mirror(points) {
  return Object.fromEntries(
    Object.entries(points).map(([key, point]) => [
      MIRROR_PAIRS[key] || key,
      [1 - point[0], point[1]],
    ]),
  );
}

/** Final pose table (old motion.js overrides folded in). */
const POSES = {
  rest: shape({}),
  close: shape({ 13: [0.34, 0.51], 14: [0.66, 0.51], 15: [0.47, 0.59], 16: [0.53, 0.59] }),
  prayer: shape({ 13: [0.32, 0.46], 14: [0.68, 0.46], 15: [0.48, 0.36], 16: [0.52, 0.36] }),
  spread: shape({ 13: [0.23, 0.35], 14: [0.77, 0.35], 15: [0.06, 0.35], 16: [0.94, 0.35] }),
  sky: shape({ 13: [0.39, 0.185], 14: [0.61, 0.185], 15: [0.39, 0.025], 16: [0.61, 0.025], 27: [0.4, 0.91], 28: [0.6, 0.91] }),
  starL: shape({ 0: [0.47, 0.18], 13: [0.37, 0.19], 15: [0.35, 0.03], 14: [0.68, 0.48], 16: [0.56, 0.58] }),
  pullL: shape({ 0: [0.43, 0.23], 11: [0.34, 0.38], 12: [0.54, 0.38], 13: [0.20, 0.36], 15: [0.25, 0.25], 14: [0.67, 0.48], 16: [0.8, 0.57], 23: [0.4, 0.63], 24: [0.54, 0.63], 25: [0.25, 0.72], 26: [0.7, 0.76], 27: [0.15, 0.94], 28: [0.82, 0.94] }),
  push: shape({ 0: [0.47, 0.19], 11: [0.38, 0.35], 12: [0.56, 0.35], 13: [0.54, 0.33], 14: [0.72, 0.38], 15: [0.71, 0.32], 16: [0.88, 0.40] }),
  knifeL: shape({ 0: [0.48, 0.20], 13: [0.27, 0.16], 15: [0.48, 0.20], 14: [0.71, 0.48], 16: [0.56, 0.58] }),
  squat: shape({ 0: [0.5, 0.32], 11: [0.39, 0.47], 12: [0.61, 0.47], 13: [0.32, 0.60], 14: [0.68, 0.60], 15: [0.32, 0.69], 16: [0.68, 0.69], 23: [0.42, 0.7], 24: [0.58, 0.7], 25: [0.25, 0.76], 26: [0.75, 0.76], 27: [0.23, 0.94], 28: [0.77, 0.94] }),
  clawL: shape({ 0: [0.43, 0.28], 11: [0.34, 0.40], 12: [0.55, 0.39], 13: [0.29, 0.44], 15: [0.46, 0.57], 14: [0.38, 0.34], 16: [0.16, 0.38], 23: [0.46, 0.61], 24: [0.60, 0.61] }),
  tigerL: shape({ 0: [0.26, 0.46], 11: [0.28, 0.56], 12: [0.42, 0.54], 13: [0.22, 0.7], 14: [0.34, 0.7], 15: [0.19, 0.87], 16: [0.31, 0.87], 23: [0.53, 0.61], 24: [0.64, 0.61], 25: [0.23, 0.77], 26: [0.76, 0.77], 27: [0.24, 0.94], 28: [0.91, 0.94] }),
  bowReady: shape({ 13: [0.3, 0.19], 14: [0.7, 0.19], 15: [0.46, 0.21], 16: [0.54, 0.21] }),
  bow: shape({ 0: [0.28, 0.47], 11: [0.29, 0.48], 12: [0.47, 0.51], 13: [0.22, 0.35], 14: [0.51, 0.37], 15: [0.27, 0.43], 16: [0.35, 0.45], 23: [0.43, 0.61], 24: [0.57, 0.61] }),
  tailL: shape({ 0: [0.35, 0.51], 11: [0.35, 0.54], 12: [0.55, 0.55], 13: [0.39, 0.68], 14: [0.54, 0.69], 15: [0.47, 0.84], 16: [0.53, 0.84], 23: [0.47, 0.61], 24: [0.61, 0.61] }),
  // 武術三式「并步對拳」：雙手握拳收於腰間（判定仍用寬鬆的 rest）。
  fists: shape({ 13: [0.31, 0.48], 14: [0.69, 0.48], 15: [0.40, 0.60], 16: [0.60, 0.60] }),
  gather: shape({ 13: [0.29, 0.45], 14: [0.71, 0.45], 15: [0.43, 0.48], 16: [0.57, 0.48] }),
  scoop: shape({ 13: [0.28, 0.47], 14: [0.72, 0.47], 15: [0.30, 0.56], 16: [0.70, 0.56] }),
  raise: shape({ 13: [0.30, 0.29], 14: [0.70, 0.29], 15: [0.43, 0.18], 16: [0.57, 0.18] }),
  turnL: shape({ 0: [0.47, 0.20], 11: [0.37, 0.35], 12: [0.57, 0.35], 15: [0.40, 0.55], 16: [0.57, 0.56] }),
  lungeL: shape({ 13: [0.29, 0.49], 15: [0.35, 0.59], 14: [0.65, 0.49], 16: [0.62, 0.58] }),
  clawSweepL: shape({ 0: [0.43, 0.37], 11: [0.35, 0.47], 12: [0.56, 0.46], 14: [0.35, 0.59], 16: [0.37, 0.74] }),
};

for (const name of ["star", "pull", "knife", "claw", "tiger", "tail"]) {
  POSES[name + "R"] = mirror(POSES[name + "L"]);
}
POSES.turnR = mirror(POSES.turnL);
POSES.lungeR = mirror(POSES.lungeL);
POSES.clawSweepR = mirror(POSES.clawSweepL);
Object.freeze(POSES);
export { POSES };

/**
 * Coach check target → demonstration route. The middle names are the old
 * "via" poses: they make the mascot actually move through the move instead
 * of snapping between two stills.
 */
const ROUTES = Object.freeze({
  rest: [], close: [], fists: ["gather"],
  prayer: ["gather"],
  spread: ["raise"],
  sky: ["raise"],
  push: ["gather"],
  starL: ["turnL", "raise"], starR: ["turnR", "raise"],
  pullL: ["lungeL"], pullR: ["lungeR"],
  knifeL: ["raise"], knifeR: ["raise"],
  squat: ["scoop"],
  clawL: ["turnL", "clawSweepL"], clawR: ["turnR", "clawSweepR"],
  tigerL: ["lungeL"], tigerR: ["lungeR"],
  bowReady: ["raise"], bow: ["raise"],
  tailL: ["scoop"], tailR: ["scoop"],
});

/** @returns {boolean} whether this check has a demonstration pose */
export function hasDemoPose(check) {
  return Boolean(POSES[check]);
}

/** Always returns a usable pose name, even for unknown checks. */
export function poseForCheck(check) {
  return POSES[check] ? check : "rest";
}

/** Some moves have a loose `rest` check but still deserve a real demo. */
const SEGMENT_DEMO_POSE = Object.freeze({
  "ready-fists": "fists",
});

/**
 * @param {string} segmentId move id from cards.js
 * @param {string} check coach check target for the current stage
 */
export function demoPoseFor(segmentId, check) {
  return SEGMENT_DEMO_POSE[segmentId] || poseForCheck(check);
}

const ease = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const mix = (a, b, t) => a + (b - a) * t;
const unwrap = (a, b) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a));
const clamp01 = (n) => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));

/**
 * Legacy motion.js `interpolate`: linear torso + joint-angle arms so limbs
 * keep their length (no rubber-band stretching).
 */
export function interpolatePose(fromName, toName, amount, seated = false) {
  const from = POSES[fromName] || POSES.rest;
  const to = POSES[toName] || POSES.rest;
  const t = ease(clamp01(amount));
  const points = {};
  for (const id of Object.keys(from)) {
    points[id] = [mix(from[id][0], to[id][0], t), mix(from[id][1], to[id][1], t)];
  }
  for (const [root, elbow, wrist] of [[11, 13, 15], [12, 14, 16]]) {
    let parent = points[root];
    for (const [a, b] of [[root, elbow], [elbow, wrist]]) {
      const start = [from[b][0] - from[a][0], from[b][1] - from[a][1]];
      const end = [to[b][0] - to[a][0], to[b][1] - to[a][1]];
      const theta = Math.atan2(start[1], start[0]);
      const angle = mix(theta, unwrap(theta, Math.atan2(end[1], end[0])), t);
      const length = mix(Math.hypot(...start), Math.hypot(...end), t);
      points[b] = [parent[0] + Math.cos(angle) * length, parent[1] + Math.sin(angle) * length];
      parent = points[b];
    }
  }
  if (seated) applySeated(points);
  return points;
}

/**
 * Legacy motion.js `sample`: smooth Catmull-Rom sweep through the via poses.
 * @param {string} fromName pose the mascot is coming from
 * @param {string} check target coach check / pose name
 * @param {number} amount 0..1
 */
export function sampleDemo(fromName, check, amount, seated = false) {
  const target = poseForCheck(check);
  const names = [POSES[fromName] ? fromName : "rest", ...(ROUTES[target] || []), target]
    .filter((name, i, all) => i === 0 || name !== all[i - 1]);
  const t = clamp01(amount);
  if (names.length === 1) return interpolatePose(names[0], names[0], 1, seated);

  const position = ease(t) * (names.length - 1);
  const i = Math.min(names.length - 2, Math.floor(position));
  const u = position - i;
  const frames = names.map((name) => POSES[name] || POSES.rest);
  const curve = (values) => {
    const p0 = values[Math.max(0, i - 1)];
    const p1 = values[i];
    const p2 = values[i + 1];
    const p3 = values[Math.min(values.length - 1, i + 2)];
    return 0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u);
  };

  const result = {};
  for (const id of Object.keys(frames[0])) {
    result[id] = [0, 1].map((axis) => curve(frames.map((frame) => frame[id][axis])));
  }
  // Rebuild arms from joint angles so upper/forearm length stays constant.
  for (const [root, elbow, wrist] of [[11, 13, 15], [12, 14, 16]]) {
    let parent = result[root];
    for (const [a, b] of [[root, elbow], [elbow, wrist]]) {
      const angles = [];
      const lengths = [];
      for (const frame of frames) {
        const dx = frame[b][0] - frame[a][0];
        const dy = frame[b][1] - frame[a][1];
        const theta = Math.atan2(dy, dx);
        angles.push(angles.length ? unwrap(angles[angles.length - 1], theta) : theta);
        lengths.push(Math.hypot(dx, dy));
      }
      const angle = curve(angles);
      const length = Math.max(0.02, curve(lengths));
      result[b] = [parent[0] + Math.cos(angle) * length, parent[1] + Math.sin(angle) * length];
      parent = result[b];
    }
  }
  if (seated) applySeated(result);
  else if (t > 0 && t < 1) {
    // Slight foot lift while stepping, as in the original rig.
    for (const id of [27, 28]) {
      const a = frames[0][id];
      const b = frames[frames.length - 1][id];
      if (Math.abs(a[0] - b[0]) > 0.13) result[id][1] -= 0.025 * Math.sin(Math.PI * t);
    }
  }
  return result;
}

function applySeated(points) {
  points[23] = [0.43, 0.61];
  points[24] = [0.57, 0.61];
  points[25] = [0.34, 0.70];
  points[26] = [0.66, 0.70];
  points[27] = [0.34, 0.88];
  points[28] = [0.66, 0.88];
}

/** Amount of the demonstration to show for a practice phase. */
export function demoAmount(phase, phaseProgress = 0) {
  const t = clamp01(phaseProgress);
  if (phase === "prep") return 0.18 + 0.22 * t;
  if (phase === "hold") return Math.min(1, 0.4 + t * 1.6);
  if (phase === "breathe") return 1;
  return Math.max(0, 1 - t);
}

export const MOVE_MS = 2000;
