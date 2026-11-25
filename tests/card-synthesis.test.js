/**
 * 招式卡與碎片合成系統 — 確定性發放回歸測試。
 * 重點：集齊 3 張碎片自動合成完整卡、只合成一次、沒有隨機 / 金幣。
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  CARD_CATALOG,
  CARD_STORAGE_KEY,
  CARD_TOTAL,
  FRAGMENT_CARDS,
  MASTER_CARD,
  MASTER_CARD_ID,
  WUSHU_CARD_SET_ID,
  WUSHU_THREE_SET,
  cardById,
  fragmentBySegmentId,
} from "../js/data/cards.js";
import {
  CARD_EVENT,
  collectionCards,
  collectionProgress,
  emptyCollection,
  isFragmentUnlocked,
  loadCollection,
  normalizeCollection,
  recommendSegmentIndex,
  saveCollection,
  segmentIsUnlocked,
  settleSession,
} from "../js/core/cardFSM.js";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

function fakeStorage(seed = {}) {
  const data = new Map(Object.entries(seed));
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
    _data: data,
  };
}

const SEGMENT_IDS = WUSHU_THREE_SET.segments.map((seg) => seg.id);

/** 一輪「練這一段」的確定性結算。 */
function segmentSession(collection, segmentId, finished = true) {
  return settleSession(collection, {
    setId: WUSHU_CARD_SET_ID,
    mode: "segment",
    completedSegmentIds: [segmentId],
    finished,
  });
}

test("資料層：4 張卡結構完整，欄位齊備，圖片檔案確實存在", () => {
  assert.equal(CARD_CATALOG.length, 4);
  assert.equal(FRAGMENT_CARDS.length, CARD_TOTAL);
  assert.equal(MASTER_CARD.id, MASTER_CARD_ID);
  assert.equal(MASTER_CARD.type, "complete");
  assert.equal(MASTER_CARD.requiredFragments, CARD_TOTAL);
  assert.equal(MASTER_CARD.fragmentIndex, null);
  assert.equal(MASTER_CARD.segmentId, null);

  const ids = CARD_CATALOG.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length, "card ids must be unique");

  const indices = FRAGMENT_CARDS.map((c) => c.fragmentIndex).sort();
  assert.deepEqual(indices, [1, 2, 3]);
  assert.deepEqual(
    FRAGMENT_CARDS.map((c) => c.segmentId),
    SEGMENT_IDS,
    "每一張碎片都要對應武術三式的一個段落",
  );

  for (const card of CARD_CATALOG) {
    for (const field of ["id", "type", "titleZh", "titleEn", "imageUrl"]) {
      assert.ok(card[field], `${card.id} 缺少 ${field}`);
    }
    for (const field of ["keyPoints", "origin", "benefit"]) {
      assert.ok(card[`${field}Zh`], `${card.id} 缺少 ${field}Zh`);
      assert.ok(card[`${field}En`], `${card.id} 缺少 ${field}En`);
    }
    assert.ok(Array.isArray(card.keyPointsZh) && card.keyPointsZh.length > 0);
    assert.ok(card.imageUrl.startsWith("./public/cards/"));
    assert.ok(existsSync(join(ROOT, card.imageUrl)), `${card.imageUrl} 不存在`);
    if (card.imageFallbackUrl) {
      assert.ok(existsSync(join(ROOT, card.imageFallbackUrl)), `${card.imageFallbackUrl} 不存在`);
    }
  }

  for (const id of SEGMENT_IDS) {
    assert.ok(fragmentBySegmentId(id), `找不到 ${id} 對應的碎片卡`);
  }
  assert.equal(cardById("does-not-exist"), null);
});

test("cardFSM 可執行程式碼不含隨機、機率或虛擬金幣", () => {
  const source = readFileSync(join(ROOT, "js/core/cardFSM.js"), "utf8");
  // 只檢查可執行程式碼；註解裡的「no gacha / no currency」說明不應算違規。
  const code = source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  assert.doesNotMatch(code, /Math\.random|crypto\.randomUUID/);
  assert.doesNotMatch(code, /\bcoin|\bcurrency|\bgacha|\bprobability|\bdropRate\b/i);
});

test("emptyCollection / normalizeCollection：容錯、去重、依碎片順序排列", () => {
  assert.deepEqual(emptyCollection(), {
    version: 1,
    fragments: [],
    completeUnlocked: false,
  });

  const messy = {
    version: 99,
    fragments: [
      FRAGMENT_CARDS[2].id,
      "unknown-card",
      FRAGMENT_CARDS[0].id,
      FRAGMENT_CARDS[2].id,
      42,
    ],
    completeUnlocked: "yes",
  };
  assert.deepEqual(normalizeCollection(messy), {
    version: 1,
    fragments: [FRAGMENT_CARDS[0].id, FRAGMENT_CARDS[2].id],
    completeUnlocked: true,
  });
  assert.deepEqual(normalizeCollection(null), emptyCollection());
});

test("局部練習：只解鎖該段落對應的碎片卡，不提前合成", () => {
  const out = segmentSession(emptyCollection(), SEGMENT_IDS[1]);
  assert.equal(out.event, CARD_EVENT.fragment);
  assert.deepEqual(out.unlockedFragmentIds, [FRAGMENT_CARDS[1].id]);
  assert.equal(out.justSynthesized, false);
  assert.equal(out.completeUnlocked, false);
  assert.equal(out.displayCard.id, FRAGMENT_CARDS[1].id);
  assert.deepEqual(out.progress, { owned: 1, total: 3, ratio: 1 / 3, completeUnlocked: false });
  assert.equal(segmentIsUnlocked(out.collection, SEGMENT_IDS[1]), true);
  assert.equal(segmentIsUnlocked(out.collection, SEGMENT_IDS[0]), false);
  assert.equal(isFragmentUnlocked(out.collection, FRAGMENT_CARDS[1].id), true);
});

test("連續練完整套：一次解鎖全部碎片並合成完整卡", () => {
  const out = settleSession(emptyCollection(), {
    setId: WUSHU_CARD_SET_ID,
    mode: "full",
    completedSegmentIds: [],
    finished: true,
  });
  assert.equal(out.event, CARD_EVENT.complete);
  assert.equal(out.justSynthesized, true);
  assert.equal(out.completeUnlocked, true);
  assert.equal(out.displayCard.id, MASTER_CARD_ID);
  assert.deepEqual(
    out.unlockedFragmentIds,
    FRAGMENT_CARDS.map((c) => c.id),
  );
  assert.equal(out.progress.owned, 3);
});

test("集齊 3 張碎片自動合成完整卡（分三次局部練習）", () => {
  let collection = emptyCollection();
  const events = [];
  for (const segmentId of SEGMENT_IDS) {
    const out = segmentSession(collection, segmentId);
    collection = out.collection;
    events.push(out);
  }

  assert.deepEqual(
    collection.fragments,
    FRAGMENT_CARDS.map((c) => c.id),
    "三張碎片應全部集齊",
  );
  assert.equal(collection.completeUnlocked, true, "3/3 時必須自動合成完整卡");
  assert.deepEqual(
    events.map((e) => e.justSynthesized),
    [false, false, true],
    "只有集齊第 3 張的那一次觸發合成",
  );
  assert.deepEqual(
    events.map((e) => e.event),
    [CARD_EVENT.fragment, CARD_EVENT.fragment, CARD_EVENT.complete],
  );
  assert.equal(events[2].displayCard.id, MASTER_CARD_ID);
  assert.equal(events[2].progress.owned, 3);
  assert.equal(events[2].progress.ratio, 1);
});

test("完整卡只合成一次：重複結算不再觸發動效、不重複發卡", () => {
  let collection = emptyCollection();
  for (const segmentId of SEGMENT_IDS) {
    collection = segmentSession(collection, segmentId).collection;
  }
  const replay = segmentSession(collection, SEGMENT_IDS[0]);
  assert.equal(replay.event, CARD_EVENT.none);
  assert.equal(replay.justSynthesized, false);
  assert.deepEqual(replay.unlockedFragmentIds, []);
  assert.equal(replay.displayCard, null);
  assert.deepEqual(replay.collection.fragments, collection.fragments);
  assert.equal(replay.collection.completeUnlocked, true);
});

test("中斷的練習不發任何卡；非武術套路不誤發武術碎片", () => {
  const interrupted = segmentSession(emptyCollection(), SEGMENT_IDS[0], false);
  assert.equal(interrupted.event, CARD_EVENT.interrupted);
  assert.deepEqual(interrupted.collection.fragments, []);
  assert.equal(interrupted.displayCard, null);

  const otherSet = settleSession(emptyCollection(), {
    setId: "yijin",
    mode: "full",
    completedSegmentIds: ["wei1"],
    finished: true,
  });
  assert.equal(otherSet.event, CARD_EVENT.none);
  assert.deepEqual(otherSet.collection.fragments, []);
  assert.equal(otherSet.completeUnlocked, false);
});

test("確定性：相同輸入永遠產生完全相同的狀態", () => {
  const input = emptyCollection();
  const a = segmentSession(input, SEGMENT_IDS[2]);
  const b = segmentSession(input, SEGMENT_IDS[2]);
  assert.deepEqual(a, b);
  assert.deepEqual(input, emptyCollection(), "結算不得修改傳入的 collection");
});

test("localStorage 持久化：寫入後可還原，毀損資料安全退回空卡冊", () => {
  const storage = fakeStorage();
  assert.deepEqual(loadCollection(storage), emptyCollection());

  let collection = emptyCollection();
  for (const segmentId of SEGMENT_IDS) {
    collection = segmentSession(collection, segmentId).collection;
  }
  saveCollection(collection, storage);
  assert.ok(storage._data.has(CARD_STORAGE_KEY));
  assert.deepEqual(loadCollection(storage), collection);

  const broken = fakeStorage({ [CARD_STORAGE_KEY]: "{not-json" });
  assert.deepEqual(loadCollection(broken), emptyCollection());

  const hostile = fakeStorage({
    [CARD_STORAGE_KEY]: JSON.stringify({ fragments: ["fake", 7], completeUnlocked: 1 }),
  });
  assert.deepEqual(loadCollection(hostile), {
    version: 1,
    fragments: [],
    completeUnlocked: true,
  });

  // 無痕模式（storage 為 null）不得丟例外。
  assert.deepEqual(loadCollection(null), emptyCollection());
  assert.deepEqual(saveCollection(collection, null), collection);
});

test("推薦索引優先引導到尚未解鎖碎片的段落", () => {
  let collection = segmentSession(emptyCollection(), SEGMENT_IDS[0]).collection;
  assert.equal(recommendSegmentIndex(collection, WUSHU_THREE_SET.segments), 1);

  collection = segmentSession(collection, SEGMENT_IDS[1]).collection;
  assert.equal(recommendSegmentIndex(collection, WUSHU_THREE_SET.segments), 2);

  collection = segmentSession(collection, SEGMENT_IDS[2]).collection;
  assert.equal(recommendSegmentIndex(collection, WUSHU_THREE_SET.segments), 0);
  assert.equal(collectionProgress(collection).completeUnlocked, true);
});

test("卡冊狀態：未解鎖是鎖定態，合成後完整卡才解鎖", () => {
  const partial = segmentSession(emptyCollection(), SEGMENT_IDS[0]).collection;
  const partialItems = collectionCards(partial);
  assert.equal(partialItems.length, 4);
  assert.deepEqual(
    partialItems.map((i) => i.unlocked),
    [true, false, false, false],
  );

  let complete = partial;
  for (const segmentId of SEGMENT_IDS.slice(1)) {
    complete = segmentSession(complete, segmentId).collection;
  }
  assert.deepEqual(
    collectionCards(complete).map((i) => i.unlocked),
    [true, true, true, true],
  );
});
