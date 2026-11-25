/**
 * Card collection FSM — deterministic fragment / synthesis settlement.
 *
 * Design rules (no randomness, no virtual currency, no gacha):
 *   - "segment" practice unlocks exactly the fragment mapped to that segment.
 *   - "full" practice unlocks all fragments at once.
 *   - Owning all three fragments automatically synthesizes the master card.
 *   - An interrupted session never awards anything.
 *   - The same input always produces exactly the same state.
 *
 * Pure logic + injectable storage: no DOM, no timer, no Date.now().
 */

import {
  CARD_STORAGE_KEY,
  FRAGMENT_CARDS,
  MASTER_CARD,
  WUSHU_CARD_SET_ID,
  cardById,
  fragmentBySegmentId,
} from "../data/cards.js";

export const CARD_EVENT = Object.freeze({
  none: "none",
  fragment: "fragment",
  complete: "complete",
  interrupted: "interrupted",
});

export const COLLECTION_VERSION = 1;

/** @returns {{version:number, fragments:string[], completeUnlocked:boolean}} */
export function emptyCollection() {
  return { version: COLLECTION_VERSION, fragments: [], completeUnlocked: false };
}

/** Tolerate old / hand-edited localStorage payloads. */
export function normalizeCollection(raw) {
  const base = emptyCollection();
  const ids = Array.isArray(raw?.fragments) ? raw.fragments : [];
  const known = new Set(FRAGMENT_CARDS.map((card) => card.id));
  const unique = [...new Set(ids.filter((id) => typeof id === "string" && known.has(id)))];
  unique.sort((a, b) => (cardById(a)?.fragmentIndex ?? 99) - (cardById(b)?.fragmentIndex ?? 99));
  return {
    version: COLLECTION_VERSION,
    fragments: unique,
    completeUnlocked: Boolean(raw?.completeUnlocked),
  };
}

function safeStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/** @param {Storage|{getItem:(k:string)=>string|null}} [storage] */
export function loadCollection(storage = safeStorage()) {
  try {
    const raw = storage?.getItem(CARD_STORAGE_KEY);
    return raw ? normalizeCollection(JSON.parse(raw)) : emptyCollection();
  } catch {
    return emptyCollection();
  }
}

/** @param {Storage|{setItem:(k:string,v:string)=>void}} [storage] */
export function saveCollection(collection, storage = safeStorage()) {
  const next = normalizeCollection(collection);
  try {
    storage?.setItem(CARD_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* private mode / quota — keep the in-memory state anyway */
  }
  return next;
}

export function isFragmentUnlocked(collection, fragmentId) {
  return Boolean(collection?.fragments?.includes(fragmentId));
}

export function segmentIsUnlocked(collection, segmentId) {
  const card = fragmentBySegmentId(segmentId);
  return card ? isFragmentUnlocked(collection, card.id) : false;
}

/** @returns {{owned:number,total:number,ratio:number,completeUnlocked:boolean}} */
export function collectionProgress(collection) {
  const total = FRAGMENT_CARDS.length;
  const owned = normalizeCollection(collection).fragments.length;
  return {
    owned,
    total,
    ratio: total > 0 ? Math.min(1, owned / total) : 0,
    completeUnlocked: Boolean(collection?.completeUnlocked),
  };
}

/**
 * 「做完一招就亮一點」：完全由已解鎖碎片數推導，不存新狀態、不設新門檻。
 * ambient 由 0.42 逐檔升到 1，供 UI 控制整冊墨氣亮度。
 */
export function collectionLight(collection) {
  const progress = collectionProgress(collection);
  const { owned, total, ratio, completeUnlocked } = progress;
  return {
    owned,
    total,
    ratio,
    completeUnlocked,
    steps: owned,
    level: completeUnlocked ? total + 1 : owned,
    maxLevel: total + 1,
    ambient: 0.42 + 0.58 * ratio,
    label: completeUnlocked ? "全冊點亮" : `墨氣 ${owned}/${total}`,
  };
}

/** First segment whose fragment is still missing; 0 when all are unlocked. */
export function recommendSegmentIndex(collection, segments) {
  const list = Array.isArray(segments) ? segments : [];
  const index = list.findIndex((seg) => {
    const card = fragmentBySegmentId(seg?.id);
    return card ? !isFragmentUnlocked(collection, card.id) : false;
  });
  return index >= 0 ? index : 0;
}

/** Catalog + unlock state, in display order (3 fragments then master card). */
export function collectionCards(collection) {
  const state = normalizeCollection(collection);
  return [...FRAGMENT_CARDS, MASTER_CARD].map((card) => ({
    card,
    unlocked:
      card.type === "complete"
        ? state.completeUnlocked
        : state.fragments.includes(card.id),
  }));
}

function outcome(collection, unlockedFragmentIds, justSynthesized, event, displayCard) {
  return {
    collection,
    unlockedFragmentIds,
    justSynthesized,
    completeUnlocked: collection.completeUnlocked,
    event,
    progress: collectionProgress(collection),
    displayCard,
  };
}

/**
 * Deterministic settlement after a practice session.
 *
 * @param {object} collection current collection state
 * @param {object} options
 * @param {string} options.setId
 * @param {'segment'|'full'} options.mode
 * @param {string[]} [options.completedSegmentIds]
 * @param {boolean} [options.finished]
 */
export function settleSession(collection, options = {}) {
  const state = normalizeCollection(collection);
  const next = { ...state, fragments: [...state.fragments] };
  const { setId, mode, completedSegmentIds = [], finished = true } = options;

  if (!finished) return outcome(next, [], false, CARD_EVENT.interrupted, null);
  // The card catalog covers the wushu golden three only; other sets keep
  // their own progress stats without awarding wushu fragments.
  if (setId !== WUSHU_CARD_SET_ID) return outcome(next, [], false, CARD_EVENT.none, null);

  const targetIds =
    mode === "full"
      ? FRAGMENT_CARDS.map((card) => card.id)
      : completedSegmentIds
          .map((segmentId) => fragmentBySegmentId(segmentId)?.id)
          .filter(Boolean);

  const unlocked = [];
  for (const id of targetIds) {
    if (!next.fragments.includes(id)) {
      next.fragments.push(id);
      unlocked.push(id);
    }
  }
  next.fragments.sort(
    (a, b) => (cardById(a)?.fragmentIndex ?? 99) - (cardById(b)?.fragmentIndex ?? 99),
  );

  // 三式合氣：3 張碎片集齊即自動合成，且只觸發一次。
  let justSynthesized = false;
  if (next.fragments.length >= FRAGMENT_CARDS.length && !next.completeUnlocked) {
    next.completeUnlocked = true;
    justSynthesized = true;
  }

  const event = justSynthesized
    ? CARD_EVENT.complete
    : unlocked.length > 0
      ? CARD_EVENT.fragment
      : CARD_EVENT.none;
  const displayCard = justSynthesized
    ? MASTER_CARD
    : unlocked.length > 0
      ? cardById(unlocked[unlocked.length - 1])
      : null;

  return outcome(next, unlocked, justSynthesized, event, displayCard);
}
