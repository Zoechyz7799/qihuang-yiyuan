/**
 * Liu Kanshan live demonstration rig — ESM port of 氣脈陪練 4.0 companion.js.
 *
 * Draws the OFFICIAL Liu Kanshan body artwork plus procedurally animated
 * two-segment arms that follow the demonstration skeleton points, with the
 * glowing hand tips from the old coach. No camera pixels are ever painted.
 *
 * Only new code: no existing module is imported or modified here.
 */

const BODY_URL = new URL("../../public/coach/liukanshan-body.png", import.meta.url).href;

const PALETTE = Object.freeze({
  bgTop: "#e4f2ec",
  bgBottom: "#f7f1e6",
  hill: "rgba(120, 170, 150, 0.16)",
  hillNear: "rgba(255, 255, 255, 0.45)",
  glow: "rgba(247, 199, 96, 0.95)",
  glowOk: "rgba(110, 196, 146, 0.95)",
  ink: "#2f6f5e",
});

/**
 * @param {HTMLCanvasElement} canvas
 */
export function createKanshanCoach(canvas) {
  const body = new Image();
  let bodyReady = false;
  body.onload = () => {
    bodyReady = true;
  };
  body.src = BODY_URL;

  // Per-canvas IK state so the arms settle smoothly instead of snapping.
  let previous = null;

  function draw(points, options = {}) {
    if (!canvas || !points) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = rect.width;
    const h = rect.height;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    const c = canvas.getContext("2d");
    if (!c) return;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, w, h);

    const bg = c.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, PALETTE.bgTop);
    bg.addColorStop(1, PALETTE.bgBottom);
    c.fillStyle = bg;
    c.fillRect(0, 0, w, h);

    // Soft concentric rings + hills, matching the light desktop-pet theme.
    c.strokeStyle = "rgba(255,255,255,0.55)";
    c.lineWidth = 1;
    for (const radius of [0.32, 0.42]) {
      c.beginPath();
      c.arc(w * 0.5, h * 0.43, Math.max(w, h) * radius, 0, Math.PI * 2);
      c.stroke();
    }
    c.fillStyle = PALETTE.hill;
    c.beginPath();
    c.moveTo(0, h * 0.83);
    c.bezierCurveTo(w * 0.25, h * 0.61, w * 0.56, h * 0.94, w, h * 0.76);
    c.lineTo(w, h);
    c.lineTo(0, h);
    c.fill();
    c.fillStyle = PALETTE.hillNear;
    c.beginPath();
    c.moveTo(0, h * 0.91);
    c.bezierCurveTo(w * 0.4, h * 0.76, w * 0.67, h * 0.88, w, h * 0.83);
    c.lineTo(w, h);
    c.lineTo(0, h);
    c.fill();

    const bottom = 46;
    const size = Math.min(w * 0.78, (h - bottom) * 0.98);
    const ox = (w - size) / 2;
    const oy = (h - bottom - size * 0.98) / 2 + 3;
    const p = (id) => {
      const q = points[id] || [0.5, 0.5];
      return [ox + q[0] * size, oy + q[1] * size];
    };
    const oval = (x, y, rx, ry, color) => {
      c.fillStyle = color;
      c.beginPath();
      c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      c.fill();
    };
    const line = (a, b, width, color) => {
      c.strokeStyle = color;
      c.lineWidth = width;
      c.lineCap = "round";
      c.lineJoin = "round";
      c.beginPath();
      c.moveTo(a[0], a[1]);
      c.lineTo(b[0], b[1]);
      c.stroke();
    };
    const limb = (a, b, width) => {
      const shade = c.createLinearGradient(a[0] - width, a[1] - width, b[0] + width, b[1] + width);
      shade.addColorStop(0, "#24292f");
      shade.addColorStop(0.48, "#3e444b");
      shade.addColorStop(1, "#252a30");
      line(a, b, width, shade);
    };

    const floor = oy + size * 0.94 + size * 0.015;
    oval(w * 0.5, floor, size * 0.30, size * 0.041, "rgba(255,255,255,0.66)");
    oval(w * 0.5, floor - size * 0.004, size * 0.21, size * 0.022, "rgba(113,147,183,0.11)");

    // Legs first (behind the body).
    for (const [hip, knee, ankle] of [[23, 25, 27], [24, 26, 28]]) {
      limb(p(hip), p(knee), size * 0.053);
      limb(p(knee), p(ankle), size * 0.047);
      oval(p(ankle)[0] + (ankle === 27 ? -0.009 : 0.009) * size, p(ankle)[1], size * 0.041, size * 0.026, "#292e34");
    }

    const shoulderMid = [(p(11)[0] + p(12)[0]) / 2, (p(11)[1] + p(12)[1]) / 2];
    const hipMid = [(p(23)[0] + p(24)[0]) / 2, (p(23)[1] + p(24)[1]) / 2];
    const nose = p(0);
    const dx = nose[0] - hipMid[0];
    const dy = nose[1] - hipMid[1];
    const height = size * (0.52 + 0.07 * Math.min(1, Math.max(0, -dy / (size * 0.40))));
    const width = size * 0.43;
    const angle = Math.max(-1.28, Math.min(1.28, Math.atan2(dx, -dy)));

    // Two-segment IK arms with angular settling (the old "really follows" fix).
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    const rig = previous && previous.size === size && now > previous.at ? previous : null;
    const dt = rig ? Math.min(0.05, (now - rig.at) / 1000) : 0;
    const nextRig = { size, at: now, angles: {} };
    const settle = (before, after, speed) => {
      if (before === undefined || !rig || options.instant) return after;
      const change = Math.atan2(Math.sin(after - before), Math.cos(after - before));
      return before + Math.max(-speed * dt, Math.min(speed * dt, change * (1 - Math.exp(-18 * dt))));
    };
    const arms = {};
    const poseName = options.pose || "";
    for (const [shoulder, elbow, wrist, sign] of [[11, 13, 15, -1], [12, 14, 16, 1]]) {
      const local = [sign * width * 0.46, -height * 0.45];
      const root = [
        hipMid[0] + local[0] * Math.cos(angle) - local[1] * Math.sin(angle),
        hipMid[1] + local[0] * Math.sin(angle) + local[1] * Math.cos(angle),
      ];
      const lean = Math.min(1, Math.abs(angle) / 0.8);
      const shoulderPoint = p(shoulder);
      root[0] += (shoulderPoint[0] - root[0]) * lean;
      root[1] += (shoulderPoint[1] - root[1]) * lean;

      const upper = size * 0.165;
      const lower = size * 0.17;
      const modelS = p(shoulder);
      const modelE = p(elbow);
      const modelW = p(wrist);
      const u = [modelE[0] - modelS[0], modelE[1] - modelS[1]];
      const v = [modelW[0] - modelE[0], modelW[1] - modelE[1]];
      const alignment = (u[0] * v[0] + u[1] * v[1]) / Math.max(0.001, Math.hypot(...u) * Math.hypot(...v));
      const reach = /^(spread|sky|push|star|pull)/.test(poseName)
        ? Math.max(0, Math.min(1, (alignment - 0.7) / 0.3))
        : 0;
      const smoothReach = reach * reach * (3 - 2 * reach);
      const direction = Math.atan2(modelW[1] - modelS[1], modelW[0] - modelS[0]);
      const extended = [root[0] + Math.cos(direction) * (upper + lower), root[1] + Math.sin(direction) * (upper + lower)];
      const desired = modelW.map((n, i) => n + (extended[i] - n) * smoothReach);
      const vector = [desired[0] - root[0], desired[1] - root[1]];
      const theta = Math.atan2(vector[1], vector[0]);
      const distance = Math.max(size * 0.015, Math.min(upper + lower - 0.001, Math.hypot(...vector)));
      const wristPoint = [root[0] + Math.cos(theta) * distance, root[1] + Math.sin(theta) * distance];
      const offset = Math.acos(Math.max(-1, Math.min(1, (upper * upper + distance * distance - lower * lower) / (2 * upper * distance))));
      const candidates = [theta - offset, theta + offset].map((a) => [root[0] + Math.cos(a) * upper, root[1] + Math.sin(a) * upper]);
      const hint = p(elbow);
      const cost = (q) => Math.hypot(q[0] - hint[0], q[1] - hint[1]);
      const chosen = cost(candidates[0]) < cost(candidates[1]) ? candidates[0] : candidates[1];
      const upperAngle = settle(rig?.angles[elbow], Math.atan2(chosen[1] - root[1], chosen[0] - root[0]), 5);
      const foreAngle = settle(rig?.angles[wrist], Math.atan2(wristPoint[1] - chosen[1], wristPoint[0] - chosen[0]), 7);
      nextRig.angles[elbow] = upperAngle;
      nextRig.angles[wrist] = foreAngle;
      arms[shoulder] = root;
      arms[elbow] = [root[0] + Math.cos(upperAngle) * upper, root[1] + Math.sin(upperAngle) * upper];
      arms[wrist] = [arms[elbow][0] + Math.cos(foreAngle) * lower, arms[elbow][1] + Math.sin(foreAngle) * lower];
    }
    previous = nextRig;

    const arm = (id) => {
      if (arms[id]) return arms[id];
      const q = p(id);
      const offset = q[0] - shoulderMid[0];
      const d = Math.abs(offset);
      const extra = d < size * 0.25 ? size * 0.055 * Math.sin(Math.PI * d / (size * 0.25)) : 0;
      return [
        shoulderMid[0] + (id === 11 || id === 12 ? Math.sign(offset) * size * 0.21 : offset + Math.sign(offset) * extra),
        q[1],
      ];
    };
    const backElbow = /^(star|knife)/.test(poseName) ? (poseName.endsWith("L") ? 14 : 13) : null;

    // Back arm behind the body.
    for (const [shoulder, elbow, wrist] of [[11, 13, 15], [12, 14, 16]]) {
      limb(arm(shoulder), arm(elbow), size * 0.043);
      if (elbow === backElbow) {
        limb(arm(elbow), arm(wrist), size * 0.042);
        const hand = arm(wrist);
        oval(hand[0], hand[1], size * 0.026, size * 0.031, "#2c3137");
      }
    }

    // Official Liu Kanshan artwork (transparent PNG, arms removed).
    c.save();
    c.translate(hipMid[0], hipMid[1]);
    c.rotate(angle);
    if (bodyReady) {
      c.drawImage(body, -width * 0.57, -height * 1.02, width * 1.14, height * 1.08);
    } else {
      const shade = c.createLinearGradient(-width / 2, -height, width / 2, 0);
      shade.addColorStop(0, "#fff");
      shade.addColorStop(1, "#e4e6eb");
      c.fillStyle = shade;
      c.beginPath();
      c.moveTo(-width * 0.45, -height * 0.13);
      c.bezierCurveTo(-width * 0.55, -height * 0.35, -width * 0.39, -height * 0.75, -width * 0.32, -height * 0.98);
      c.quadraticCurveTo(-width * 0.26, -height * 1.06, -width * 0.13, -height * 0.83);
      c.lineTo(width * 0.13, -height * 0.83);
      c.quadraticCurveTo(width * 0.26, -height * 1.06, width * 0.32, -height * 0.98);
      c.bezierCurveTo(width * 0.39, -height * 0.75, width * 0.55, -height * 0.35, width * 0.45, -height * 0.13);
      c.bezierCurveTo(width * 0.37, height * 0.04, -width * 0.37, height * 0.04, -width * 0.45, -height * 0.13);
      c.fill();
      oval(-width * 0.27, -height * 0.69, width * 0.028, height * 0.027, "#252b31");
      oval(width * 0.27, -height * 0.69, width * 0.028, height * 0.027, "#252b31");
      oval(0, -height * 0.68, width * 0.18, height * 0.12, "#181e24");
    }
    c.restore();

    // Front arm + glowing hand tips (the old "follow the glowing hands" cue).
    const glowColor = options.ready ? PALETTE.glowOk : PALETTE.glow;
    for (const [shoulder, elbow] of [[11, 13], [12, 14]]) {
      if (elbow === backElbow) continue;
      limb(arm(shoulder), arm(elbow), size * 0.043);
    }
    for (const [elbow, wrist] of [[13, 15], [14, 16]]) {
      if (elbow === backElbow) continue;
      const a = arm(elbow);
      const hand = arm(wrist);
      limb(a, hand, size * 0.042);
      const radius = size * 0.075;
      const halo = c.createRadialGradient(hand[0], hand[1], 1, hand[0], hand[1], radius);
      halo.addColorStop(0, glowColor);
      halo.addColorStop(1, "rgba(247,199,96,0)");
      c.fillStyle = halo;
      c.beginPath();
      c.arc(hand[0], hand[1], radius, 0, Math.PI * 2);
      c.fill();
      oval(hand[0], hand[1], size * 0.026, size * 0.031, "#2c3137");
      oval(hand[0], hand[1], size * 0.012, size * 0.014, options.ready ? "#a8e6c1" : "#ffe9a8");
    }

    if (options.label) {
      c.fillStyle = "rgba(255,255,252,0.9)";
      const label = String(options.label);
      c.font = `600 ${Math.max(12, Math.round(w * 0.030))}px Nunito, sans-serif`;
      const tw = c.measureText(label).width;
      const bw = tw + 28;
      c.beginPath();
      if (typeof c.roundRect === "function") c.roundRect((w - bw) / 2, h - 34, bw, 26, 13);
      else c.rect((w - bw) / 2, h - 34, bw, 26);
      c.fill();
      c.fillStyle = options.ready ? "#2f8f62" : PALETTE.ink;
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText(label, w / 2, h - 21);
      c.textAlign = "start";
      c.textBaseline = "alphabetic";
    }
  }

  function reset() {
    previous = null;
  }

  return { draw, reset };
}
