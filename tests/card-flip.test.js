/**
 * 「真正的翻牌」回歸測試：
 * 正面是卡圖，翻過來才有功用 / 出處 / 針對肌群 / 核心要點。
 * 另涵蓋預設套路、卡背欄位完整性与「做完一招就亮一點」的純邏輯。
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  CARD_CATALOG,
  DEFAULT_SET_ID,
  FRAGMENT_CARDS,
  WUSHU_CARD_SET_ID,
  WUSHU_THREE_SET,
  cardField,
  loadSelectedSetId,
} from "../js/data/cards.js";
import { collectionLight, emptyCollection, settleSession } from "../js/core/cardFSM.js";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const UI_SOURCE = readFileSync(join(ROOT, "js/ui/cardUI.js"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");

const SEGMENT_IDS = WUSHU_THREE_SET.segments.map((seg) => seg.id);

function fakeStorage(seed = {}) {
  const data = new Map(Object.entries(seed));
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
  };
}

function segmentSession(collection, segmentId) {
  return settleSession(collection, {
    setId: WUSHU_CARD_SET_ID,
    mode: "segment",
    completedSegmentIds: [segmentId],
    finished: true,
  });
}

test("4 張卡都有完整的卡背資訊：功用、出處、針對肌群、要點、克制說明", () => {
  assert.equal(CARD_CATALOG.length, 4);
  for (const card of CARD_CATALOG) {
    for (const field of ["function", "origin", "muscles", "benefit"]) {
      assert.ok(cardField(card, field, "zh").length > 8, `${card.id} 缺 ${field}Zh`);
      assert.ok(cardField(card, field, "en").length > 8, `${card.id} 缺 ${field}En`);
    }
    assert.ok(cardField(card, "title", "zh").length >= 2, `${card.id} 缺 titleZh`);
    assert.ok(cardField(card, "title", "en").length >= 4, `${card.id} 缺 titleEn`);
    const points = cardField(card, "keyPoints", "zh");
    assert.ok(Array.isArray(points) && points.length >= 2, `${card.id} 缺核心要點`);
    assert.ok(existsSync(join(ROOT, card.imageUrl.replace(/^\.\//, ""))), `${card.id} 缺卡圖`);
  }
});

test("cardField 會依語言取 zh / en 欄位", () => {
  const card = FRAGMENT_CARDS[0];
  assert.equal(cardField(card, "function", "zh"), card.functionZh);
  assert.equal(cardField(card, "function", "en"), card.functionEn);
  assert.equal(cardField(card, "muscles", "en"), card.musclesEn);
});

test("預設套路是武術三式，不再是練完拿不到卡的易筋經", () => {
  assert.equal(DEFAULT_SET_ID, WUSHU_CARD_SET_ID);
  const previous = globalThis.localStorage;
  try {
    globalThis.localStorage = fakeStorage({});
    assert.equal(loadSelectedSetId(), WUSHU_CARD_SET_ID);
    globalThis.localStorage = fakeStorage({
      "qimai-settings": JSON.stringify({ selectedSetId: "yijin" }),
    });
    // 明確儲存的選擇仍應被尊重（不偷偷改掉使用者設定）。
    assert.equal(loadSelectedSetId(), "yijin");
  } finally {
    if (previous === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previous;
  }
});

test("做完一招就亮一點：墨氣亮度隨收集數逐檔上升", () => {
  let collection = emptyCollection();
  const lights = [collectionLight(collection)];
  for (const segmentId of SEGMENT_IDS) {
    collection = segmentSession(collection, segmentId).collection;
    lights.push(collectionLight(collection));
  }
  assert.deepEqual(lights.map((l) => l.owned), [0, 1, 2, 3]);
  assert.deepEqual(lights.map((l) => l.level), [0, 1, 2, 4]);
  for (let i = 1; i < lights.length; i += 1) {
    assert.ok(lights[i].ambient > lights[i - 1].ambient, `第 ${i} 檔沒有更亮`);
  }
  assert.equal(lights[0].ambient, 0.42);
  assert.equal(lights[3].ambient, 1);
  assert.equal(lights[3].completeUnlocked, true);
  assert.equal(lights[3].label, "全冊點亮");
});

test("結果頁是真正 3D 翻牌：正面卡圖、背面資訊、可記錄目前是哪一面", () => {
  assert.match(UI_SOURCE, /qflip-front[\s\S]*imgTag\(card\)/);
  assert.match(UI_SOURCE, /qflip-back[\s\S]*cardField\(card, "function"/);
  assert.match(UI_SOURCE, /cardField\(card, "origin"/);
  assert.match(UI_SOURCE, /cardField\(card, "muscles"/);
  assert.match(UI_SOURCE, /dataset\.qface = back \? "back" : "front"/);
  assert.match(UI_SOURCE, /is-flipped[\s\S]*rotateY\(180deg\)/);
  assert.match(UI_SOURCE, /renderCardResult[\s\S]*flipCardMarkup\(card/);
  assert.match(UI_SOURCE, /openCardDetail[\s\S]*flipCardMarkup\(card/);
});

test("卡背可輸出 800×1200 高清 PNG，且下載會帶 -back 後綴", () => {
  assert.match(UI_SOURCE, /export async function drawCardBackCanvas/);
  assert.match(UI_SOURCE, /const w = 400;\s*const h = 600;/);
  assert.match(UI_SOURCE, /a\.download = `qi-pulse-\$\{card\.id\}\$\{suffix\}\.png`/);
  assert.match(UI_SOURCE, /back \? "-back" : ""/);
});

test("翻牌卡背不引入隨機抽卡或虛擬金幣機制", () => {
  assert.doesNotMatch(UI_SOURCE, /Math\.random|coinBalance|goldCoins|gachaRoll|drawRarity/);
});
