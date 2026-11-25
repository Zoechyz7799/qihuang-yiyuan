/**
 * 回歸：原始產品規格中容易被改壞的幾條底線。
 * 番茄鐘牆鐘計時 / 25·45·10 秒 / 默認無攝像頭 / 參考角度標註 /
 * 英文女聲 / 離線配樂開關。
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  TIMER_PHASE,
  TIMER_PRESETS,
  createTimerFSM,
  presetById,
} from "../js/core/timerFSM.js";
import { shouldGateLesson } from "../js/core/interactiveLesson.js";
import { getCopy, pickVoiceFromList, voiceGender } from "../js/locale.js";
import { createSoundscape } from "../js/ui/soundscape.js";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

test("時間選擇器包含 25 min、45 min、10 sec Demo", () => {
  const byId = Object.fromEntries(TIMER_PRESETS.map((p) => [p.id, p.ms]));
  assert.equal(byId["25"], 25 * 60 * 1000);
  assert.equal(byId["45"], 45 * 60 * 1000);
  assert.equal(byId["demo"], 10 * 1000);
  assert.equal(presetById("demo").ms, 10000);
});

test("番茄鐘用牆鐘計時：切換分頁（略過中間 tick）到點仍會觸發", () => {
  let now = 0;
  const timer = createTimerFSM({ now: () => now });
  timer.start(presetById("demo"), 0);
  // 模擬分頁被隱藏：中間完全沒有呼叫 tick。
  now = 6000;
  assert.equal(timer.tick(now), null);
  assert.equal(timer.getState(now).phase, TIMER_PHASE.running);
  now = 10000;
  assert.equal(timer.tick(now)?.type, "completed");
  assert.equal(timer.getState(now).phase, TIMER_PHASE.alert);
  assert.equal(timer.getState(now).displayMs, 0);
});

test("默認無攝像頭模式：不開鏡頭就不判定、練習不會卡在等待入鏡", () => {
  const base = { screen: "active", phase: "hold", hasCheck: true };
  assert.equal(shouldGateLesson({ ...base, cameraActive: false }), false);
  assert.equal(shouldGateLesson({ ...base, cameraActive: true }), true);
  assert.equal(shouldGateLesson({ ...base, cameraActive: true, bypass: true }), false);
  assert.equal(shouldGateLesson({ ...base, cameraActive: true, phase: "prep" }), false);
  assert.equal(shouldGateLesson({ ...base, cameraActive: true, screen: "choose" }), false);
  assert.equal(shouldGateLesson({ ...base, cameraActive: true, hasCheck: false }), false);
  assert.equal(shouldGateLesson(), false);
});

test("首頁與練習頁都不在載入時要求攝像頭或麥克風權限", () => {
  for (const file of ["index.html", "practice.html"]) {
    const html = readFileSync(join(ROOT, file), "utf8");
    assert.doesNotMatch(html, /getUserMedia|mediaDevices/);
  }
});

test("參考角度必須標註「攝像頭估算，僅供參考」", () => {
  assert.match(getCopy("zh").elbowEstimate, /攝像頭估算，僅供參考/);
  assert.match(getCopy("en").elbowEstimate, /camera estimate, for reference only/);
});

const VOICES = [
  { name: "Alex", lang: "en-US", localService: true, default: true },
  { name: "Kathy", lang: "en-US", localService: true },
  { name: "Daniel", lang: "en-GB", localService: true },
  { name: "Samantha", lang: "en-US", localService: true },
  { name: "Sandy (英文（美國）)", lang: "en-US", localService: true },
  { name: "Microsoft Aria Online (Natural) - English (United States)", lang: "en-US" },
  { name: "Ting-Ting", lang: "zh-CN", localService: true },
  { name: "Microsoft Guy Online (Natural) - English (United States)", lang: "en-US" },
];

test("英文導引音優先自然女聲，不再抓到第一個 en-US 的 Alex 男聲或機械感 Kathy", () => {
  const picked = pickVoiceFromList(VOICES, "en");
  assert.ok(picked, "必須選到一個語音");
  assert.equal(voiceGender(picked), "female");
  assert.equal(picked.name, "Samantha");
  assert.notEqual(picked.name, "Alex");
  assert.notEqual(picked.name, "Daniel");
  assert.notEqual(picked.name, "Kathy");
  assert.notEqual(picked.name, "Microsoft Guy Online (Natural) - English (United States)");
  assert.match(picked.lang, /^en/);
});

test("語音性別標示與手動覆寫", () => {
  const named = (name) => VOICES.find((v) => v.name === name);
  assert.equal(voiceGender(named("Alex")), "male");
  assert.equal(voiceGender(named("Samantha")), "female");
  assert.equal(voiceGender({ name: "Google US English", lang: "en-US" }), "female");
  assert.equal(voiceGender({ name: "Mysterious Voice", lang: "en-AU" }), "unknown");
  assert.equal(pickVoiceFromList(VOICES, "en", "Daniel").name, "Daniel");
  assert.equal(pickVoiceFromList([], "en"), null);
  assert.equal(pickVoiceFromList([named("Ting-Ting")], "en"), null, "不能拿中文語音念英文");
  assert.equal(voiceGender(pickVoiceFromList(VOICES, "zh")), "female");
});

test("中國風配樂開關存 localStorage，且合成音不使用亂數", () => {
  const data = new Map();
  const original = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
  };
  try {
    const sound = createSoundscape();
    assert.equal(sound.isEnabled(), true, "預設播放");
    assert.equal(sound.setEnabled(false), false);
    assert.equal(data.get("qimai-sound"), "off");
    assert.equal(createSoundscape().isEnabled(), false, "重新整理後仍記得關閉");
    assert.equal(sound.toggle(), true);
    assert.equal(data.get("qimai-sound"), "on");
    sound.dispose();
  } finally {
    if (original === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = original;
  }
  const source = readFileSync(join(ROOT, "js/ui/soundscape.js"), "utf8");
  assert.doesNotMatch(source, /Math\.random|fetch\(|new Audio\(|getUserMedia/);
  assert.match(source, /createOscillator/);
});
