import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

test("index.html never mentions getUserMedia", () => {
  const text = readFileSync(join(ROOT, "index.html"), "utf8");
  assert.equal(text.includes("getUserMedia"), false);
  assert.equal(text.includes("mediaDevices"), false);
});

test("home/pet page never uses speechSynthesis or EN TTS helpers", () => {
  const text = readFileSync(join(ROOT, "index.html"), "utf8");
  assert.equal(text.includes("speechSynthesis"), false);
  assert.equal(text.includes("speakEnglish"), false);
  assert.equal(text.includes("unlockSpeech"), false);
});

test("alert card offers dismiss and practice CTAs", () => {
  const text = readFileSync(join(ROOT, "index.html"), "utf8");
  assert.match(text, /id="alert-practice"/);
  assert.match(text, /alertPractice/);
  const locale = readFileSync(join(ROOT, "js/locale.js"), "utf8");
  assert.match(locale, /alertPractice:\s*"要不要一起伸展一下"/);
  assert.match(locale, /alertPractice:\s*"Let's practice"/);
});

test("cameraFSM is the only module that calls getUserMedia by default path", () => {
  const camera = readFileSync(join(ROOT, "js/core/cameraFSM.js"), "utf8");
  assert.ok(camera.includes("getUserMedia"));
  const homePet = readFileSync(join(ROOT, "js/ui/pet.js"), "utf8");
  assert.equal(homePet.includes("getUserMedia"), false);
  const timer = readFileSync(join(ROOT, "js/core/timerFSM.js"), "utf8");
  assert.equal(timer.includes("getUserMedia"), false);
});
