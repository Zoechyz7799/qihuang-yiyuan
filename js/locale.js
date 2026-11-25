/**
 * zh / en copy and language helpers. localStorage key: qimai-lang.
 */

const STORAGE_KEY = "qimai-lang";

export const ENCOURAGEMENTS = Object.freeze({
  zh: Object.freeze([
    "你做得很好，繼續保持！",
    "每一次練習都是進步。",
    "慢慢來，你正在變得更好。",
    "今天的你比昨天更有力量。",
    "深呼吸，感受當下的平靜。",
    "你已經很棒了，繼續加油！",
    "堅持下去，改變正在發生。",
    "你的努力正在被看見。",
    "你就是自己的太陽，照亮著一切。",
  ]),
  en: Object.freeze([
    "You're doing great, keep it up!",
    "Every practice is progress.",
    "Take it slow, you're getting better.",
    "Today's you is stronger than yesterday's.",
    "Take a deep breath, feel the calm of this moment.",
    "You're already amazing, keep going!",
    "Keep going, change is happening.",
    "Your effort is being seen.",
    "You are your own sun, illuminating everything.",
  ]),
});

const COPY = Object.freeze({
  zh: Object.freeze({
    brand: "氣脈陪練",
    tabFlash: "⏰ 時間到",
    min25: "25 分",
    min45: "45 分",
    demo: "10 秒",
    start: "開始",
    stop: "停止",
    dismiss: "知道了",
    alertPractice: "要不要一起伸展一下",
    running: "陪著",
    alertShort: "時間到",
    expand: "展開",
    collapse: "收起",
    notifyTitle: "時間到",
    hint: "點看山進練習；雙擊立刻提醒",
    petLabel: "劉看山。點一下進練習，雙擊立刻提醒。",
    presetsLabel: "時長",
    langLabel: "語言",
    noscript: "這個頁面需要 JavaScript。",
    goPractice: "開始練習",
    dockActionsLabel: "快捷",
    practiceTitle: "練習",
    disclaimerTitle: "練習前請注意",
    disclaimerBody:
      "本練習僅供自我放鬆與伸展參考，非醫療建議。如有不適請立即停止並諮詢專業人士。\n\n畫面僅在本機處理，不會上傳或儲存。可隨時關閉攝像頭。",
    disclaimerSkip: "跳過",
    disclaimerAccept: "我了解了",
    chooseMode: "選擇練習方式",
    chooseSet: "選擇套路",
    modeSegment: "練這一段",
    modeFull: "連續練完整套",
    recommended: "推薦（未完成）",
    begin: "開始",
    phasePrep: "起",
    phaseHold: "停",
    phaseBreathe: "停",
    phaseRest: "收",
    stageRise: "起",
    stageHold: "停",
    stageClose: "收",
    breatheIn: "吸氣",
    breatheNatural: "自然呼吸",
    breatheOut: "呼氣",
    progress: "節奏",
    openCamera: "一鍵開啟本地攝像頭",
    closeCamera: "關閉攝像頭",
    cameraOffHint: "默認不開啟攝像頭。僅在你按下按鈕後才會請求權限。",
    cameraOnHint: "只顯示骨架示意，不顯示實景。畫面僅在本機處理，不會上傳或儲存。",
    cameraError: "攝像頭暫時用不了，沒關係——跟著看山的圖一起練就好。",
    cameraDenied: "沒有攝像頭權限也沒關係，繼續看圖引導即可。",
    cameraBusy: "攝像頭正被占用。你可以先跟著看山練習。",
    poseMissing: "還沒看到你，慢慢走進畫面就好。",
    coachOk: "達標",
    coachAdjust: "再調整",
    coachUnstable: "請調整位置，讓頭部、肩膀、肘部清晰可見",
    elbowEstimate: "肘部約 {deg}° · 攝像頭估算，僅供參考",
    interrupt: "中斷本次",
    finish: "完成",
    doneTitle: "本輪結束",
    todayDuration: "今日時長",
    interruptCount: "中斷次數",
    cardFragment: "碎片卡",
    cardComplete: "完整卡",
    cardPoints: "要點",
    cardSource: "出處",
    cardEffect: "功效 / 克制",
    memoryTitle: "回憶",
    memoryEmpty: "還沒有收集到招式卡。",
    downloadCard: "下載目前這面 PNG",
    backHome: "回桌寵",
    nextSegment: "下一段",
    minutesUnit: "分",
    secondsUnit: "秒",
  }),
  en: Object.freeze({
    brand: "Qi-Pulse",
    tabFlash: "⏰ Time's up",
    min25: "25 min",
    min45: "45 min",
    demo: "10 sec",
    start: "Start",
    stop: "Stop",
    dismiss: "Got it",
    alertPractice: "Let's practice",
    running: "With you",
    alertShort: "Time's up",
    expand: "Open",
    collapse: "Close",
    notifyTitle: "Time's up",
    hint: "Click Kanshan to practice; double-click to alert",
    petLabel: "Kanshan. Click to practice; double-click to alert now.",
    presetsLabel: "Length",
    langLabel: "Language",
    noscript: "This page needs JavaScript.",
    goPractice: "Practice",
    dockActionsLabel: "Shortcuts",
    practiceTitle: "Practice",
    disclaimerTitle: "Before you begin",
    disclaimerBody:
      "This practice is for gentle stretch and relaxation only, not medical advice. Stop if you feel discomfort and seek professional care.\n\nThe picture stays on this device. Nothing is uploaded or stored. You can turn the camera off anytime.",
    disclaimerSkip: "Skip",
    disclaimerAccept: "I understand",
    chooseMode: "Choose a mode",
    chooseSet: "Choose a set",
    modeSegment: "This segment",
    modeFull: "Full set",
    recommended: "Suggested (incomplete)",
    begin: "Begin",
    phasePrep: "Rise",
    phaseHold: "Hold",
    phaseBreathe: "Hold",
    phaseRest: "Close",
    stageRise: "Rise",
    stageHold: "Hold",
    stageClose: "Close",
    breatheIn: "Inhale",
    breatheNatural: "Breathe naturally",
    breatheOut: "Exhale",
    progress: "Rhythm",
    openCamera: "Enable local camera",
    closeCamera: "Turn camera off",
    cameraOffHint: "Camera stays off by default. Permission is requested only when you press the button.",
    cameraOnHint: "Stick figure only — no live video. The picture stays on this device; nothing is uploaded or stored.",
    cameraError: "Camera isn't available right now — follow Kanshan's pictures instead.",
    cameraDenied: "No camera permission needed. Keep following the picture guide.",
    cameraBusy: "Camera is busy. You can still practice with Kanshan.",
    poseMissing: "Can't see you yet — ease into the frame when you're ready.",
    coachOk: "On target",
    coachAdjust: "Adjust again",
    coachUnstable: "Please adjust so your head, shoulders, and elbows are clearly visible",
    elbowEstimate: "Elbow ~{deg}° · camera estimate, for reference only",
    interrupt: "Interrupt",
    finish: "Finish",
    doneTitle: "Round complete",
    todayDuration: "Today",
    interruptCount: "Interrupts",
    cardFragment: "Fragment",
    cardComplete: "Complete card",
    cardPoints: "Key points",
    cardSource: "Source",
    cardEffect: "Effect",
    memoryTitle: "Memory",
    memoryEmpty: "No collected cards yet.",
    downloadCard: "Download this face (PNG)",
    backHome: "Back to pet",
    nextSegment: "Next segment",
    minutesUnit: "min",
    secondsUnit: "sec",
  }),
});

export function getCopy(lang) {
  return COPY[lang] ?? COPY.zh;
}

export function loadLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "zh") return saved;
  } catch {
    /* private mode */
  }
  return "zh";
}

export function saveLang(lang) {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* private mode */
  }
}

export function pickEncouragement(lines, previous = "", random = Math.random) {
  const choices = lines.filter((line) => line !== previous);
  const pool = choices.length > 0 ? choices : lines;
  const index = Math.min(pool.length - 1, Math.floor(random() * pool.length));
  return pool[index];
}

/**
 * 語音偏好：預設自動挑女聲（macOS 上 en-US 第一個通常是 Alex 男聲，
 * 聽起來像老男人）。使用者也可以從練習頁的下拉選單指定任何系統聲音。
 */
const VOICE_KEY = "qimai-voice";

const FEMALE_HINT =
  /\b(samantha|victoria|zira|aria|jenny|sonia|fiona|kate|serena|moira|tessa|karen|susan|allison|ava|hazel|joanna|salli|kimberly|emma|amy|linda|nora|zoe|shelley|sandy|kathy|eva|ivy|luna|clara|paula|ting-ting|mei-jia|sin-ji|huihui|yaoyao|female|woman|google us english|女聲|女声)\b/i;
const MALE_HINT =
  /\b(alex|daniel|fred|tom|aaron|arthur|oliver|david|gordon|guy|mark|ryan|george|evan|grandpa|junior|reed|rocko|rishi|maged|majed|yunyang|kangkang|male|man|microsoft guy|男聲|男声)\b/i;

/** 自然／高品質女聲（macOS 的 Samantha、Windows 的 Aria/Zira、Edge 自然語音…）。 */
const NATURAL_HINT =
  /\b(samantha|ava|allison|susan|victoria|serena|zira|aria|jenny|sonia|premium|enhanced|siri|neural|natural|google|online)\b/i;
/** macOS 的舊式新奇語音，雖然是女聲但機械感重，不要拿來當導引音。 */
const NOVELTY_HINT =
  /\b(kathy|sandy|shelley|grandma|junior|reed|rocko|albert|bad news|good news|bahh|bells|boing|bubbles|cellos|deranged|trinoids|whisper|wobble|zarvox)\b/i;

let voiceCache = [];
let voicesWired = false;

function allVoices() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
  try {
    const list = window.speechSynthesis.getVoices() || [];
    if (list.length) voiceCache = list;
  } catch {
    /* headless / permission restricted */
  }
  return voiceCache;
}

function warmVoices() {
  allVoices();
  if (voicesWired || typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    const synth = window.speechSynthesis;
    if (typeof synth.addEventListener === "function") {
      synth.addEventListener("voiceschanged", allVoices);
      voicesWired = true;
    }
  } catch {
    /* optional */
  }
}

if (typeof window !== "undefined") warmVoices();

/** @param {'zh'|'en'} lang */
export function listSpeechVoices(lang = "en") {
  return allVoices().filter((v) => {
    const code = `${v.lang || ""}`.toLowerCase().replace("_", "-");
    return lang === "en" ? /^en\b/.test(code) : /^(zh|cmn|yue)/.test(code);
  });
}

export function getVoiceOverride() {
  try {
    return localStorage.getItem(VOICE_KEY) || "";
  } catch {
    return "";
  }
}

/** @param {string} name empty string = 回到自動（優先女聲） */
export function setVoiceOverride(name) {
  try {
    if (name) localStorage.setItem(VOICE_KEY, name);
    else localStorage.removeItem(VOICE_KEY);
  } catch {
    /* private mode */
  }
  return getVoiceOverride();
}

function voiceScore(voice, lang) {
  const name = `${voice.name || ""} ${voice.voiceURI || ""}`;
  const code = `${voice.lang || ""}`.toLowerCase().replace("_", "-");
  if (lang === "en" && !/^en\b/.test(code)) return Number.NEGATIVE_INFINITY;
  if (lang !== "en" && !/^(zh|cmn|yue)/.test(code)) return Number.NEGATIVE_INFINITY;

  let score = lang === "en"
    ? code === "en-us" ? 30 : code === "en-gb" ? 26 : 12
    : /^zh-cn/.test(code) ? 30 : 18;

  if (FEMALE_HINT.test(name)) score += 140;
  else if (MALE_HINT.test(name)) score -= 140;

  // 高品質 / 自然語音優先，但仍讓明確女聲勝過男聲。
  if (NATURAL_HINT.test(name)) score += 30;
  if (NOVELTY_HINT.test(name)) score -= 45;
  if (voice.localService) score += 6;
  if (voice.default) score -= 3;
  return score;
}

/** 供練習頁把「最推薦」的語音排在最前面。 */
export function rankVoiceScore(voice, lang = "en") {
  return voiceScore(voice, lang);
}

/**
 * Prefer a natural female voice; fall back to the least-bad local option.
 * @param {string} text
 * @param {'zh'|'en'} [lang]
 */
export function speakText(text, lang = "zh") {
  if (!("speechSynthesis" in window) || !text) return;
  try {
    warmVoices();
    const utterance = new SpeechSynthesisUtterance(String(text));
    const voice = pickVoice(lang);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = lang === "en" ? "en-US" : "zh-CN";
    }
    // 0.9 偏慢會更顯老氣；稍微提高音高與語速，聽起來輕亮一些。
    utterance.rate = lang === "en" ? 1.0 : 0.95;
    utterance.pitch = 1.06;
    utterance.volume = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  } catch {
    /* speech can be missing in headless sessions */
  }
}

/** @deprecated Prefer speakText(text, 'en') */
export function speakEnglish(text) {
  speakText(text, "en");
}

/**
 * @param {'zh'|'en'} lang
 */
export function unlockSpeech(lang = "en") {
  if (!("speechSynthesis" in window)) return;
  try {
    // Voices can load asynchronously; warm the list and cache it on voiceschanged.
    warmVoices();
    const voice = pickVoice(lang);
    const utterance = new SpeechSynthesisUtterance(" ");
    utterance.volume = 0;
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = lang === "en" ? "en-US" : "zh-CN";
    }
    window.speechSynthesis.speak(utterance);
  } catch {
    /* ignore */
  }
}

/**
 * @param {'zh'|'en'} lang
 * @returns {SpeechSynthesisVoice | null}
 */
/** 可單測的純函式：從給定語音清單挑一個（女聲優先、可指定覆寫）。 */
export function pickVoiceFromList(voices, lang = "en", override = "") {
  if (!Array.isArray(voices) || !voices.length) return null;
  if (override) {
    const chosen = voices.find((v) => v.name === override || v.voiceURI === override);
    if (chosen) return chosen;
  }
  const ranked = voices
    .map((voice) => ({ voice, score: voiceScore(voice, lang) }))
    .filter((entry) => Number.isFinite(entry.score))
    .sort((a, b) => b.score - a.score);
  return ranked.length ? ranked[0].voice : null;
}

function pickVoice(lang) {
  return pickVoiceFromList(allVoices(), lang, getVoiceOverride());
}

/** 供練習頁語音下拉標示性別。 */
export function voiceGender(voice) {
  const name = `${voice?.name || ""} ${voice?.voiceURI || ""}`;
  if (FEMALE_HINT.test(name)) return "female";
  if (MALE_HINT.test(name)) return "male";
  return "unknown";
}

/** 目前實際會被採用的語音名稱（供 UI / 除錯顯示）。 */
export function activeVoiceName(lang = "en") {
  return pickVoice(lang)?.name || "";
}

export function cancelSpeech() {
  if ("speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      /* ignore */
    }
  }
}
