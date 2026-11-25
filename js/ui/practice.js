/**
 * Practice page UI layer. Wires practiceFSM + cameraFSM + cards + locale.
 */

import {
  createPracticeFSM,
  PRACTICE_MODE,
  PRACTICE_PHASE,
  PRACTICE_SCREEN,
} from "../core/practiceFSM.js";
import { createCameraFSM } from "../core/cameraFSM.js";
import {
  applySession,
  breathForPhase,
  getSet,
  loadProgress,
  loadSelectedSetId,
  poseUrl,
  saveProgress,
  saveSelectedSetId,
  stageForPhase,
  WUSHU_CARD_SET_ID,
  MASTER_CARD_ID,
  FRAGMENT_CARDS,
} from "../data/cards.js";
import {
  cancelSpeech,
  getCopy,
  getVoiceOverride,
  listSpeechVoices,
  loadLang,
  rankVoiceScore,
  saveLang,
  setVoiceOverride,
  speakText,
  unlockSpeech,
  voiceGender,
} from "../locale.js";
import { createSoundscape } from "./soundscape.js";
import { angle as jointAngle } from "../core/coach.js";
import { createPoseTracker } from "../../pose-worker.js";
// Interactive lesson (old 氣脈陪練 4.0 teaching loop) — additive imports only.
import { createInteractiveLesson, LESSON_STATUS, shouldGateLesson } from "../core/interactiveLesson.js";
import { createKanshanCoach } from "./kanshanCoach.js";
import { sampleDemo, demoAmount, demoPoseFor } from "../data/demoPoses.js";
// Deterministic card collection / synthesis (no gacha, no coins).
import {
  loadCollection,
  saveCollection,
  settleSession,
  segmentIsUnlocked,
} from "../core/cardFSM.js";
import {
  applyInkLight,
  injectCardStyles,
  renderCardResult,
  renderMemory,
  renderDeck,
  openCardAlbum,
  openCardDetail,
  playCardReveal,
  drawCardCanvas,
  drawCardBackCanvas,
  downloadCardImage,
  escapeHtml,
} from "./cardUI.js";

/** Kanshan guide clips for 起 / 停 / 收 (+ brief done/nod on target). */
const KANSHAN_STAGE = Object.freeze({
  rise: "idle.webp",
  hold: "sway.webp",
  close: "wave.webp",
  done: "wave.webp",
});

/** Fuller body: shoulders–elbows–wrists, torso, hips–knees–ankles (+ neck to nose). */
const STICK_BONES = Object.freeze([
  [11, 12], // shoulders
  [11, 13],
  [13, 15], // left arm
  [12, 14],
  [14, 16], // right arm
  [11, 23],
  [12, 24], // torso sides
  [23, 24], // hips
  [23, 25],
  [25, 27], // left leg
  [24, 26],
  [26, 28], // right leg
  [11, 0],
  [12, 0], // neck / head anchors
]);

const STICK_JOINTS = Object.freeze([
  0, // nose / head center
  11,
  12, // shoulders
  13,
  14, // elbows
  15,
  16, // wrists
  23,
  24, // hips
  25,
  26, // knees
  27,
  28, // ankles
]);

export function bootPractice(root = document) {
  const langZh = root.querySelector("#lang-zh");
  const langEn = root.querySelector("#lang-en");
  const voiceSelect = root.querySelector("#voice-select");
  const soundToggle = root.querySelector("#sound-toggle");
  const titleEl = root.querySelector("#practice-title");
  const screens = {
    disclaimer: root.querySelector("#screen-disclaimer"),
    choose: root.querySelector("#screen-choose"),
    active: root.querySelector("#screen-active"),
    done: root.querySelector("#screen-done"),
  };

  const disclaimerTitle = root.querySelector("#disclaimer-title");
  const disclaimerBody = root.querySelector("#disclaimer-body");
  const disclaimerSkip = root.querySelector("#disclaimer-skip");
  const disclaimerAccept = root.querySelector("#disclaimer-accept");

  const chooseSetTitle = root.querySelector("#choose-set-title");
  const setYijinBtn = root.querySelector("#set-yijin");
  const setWushuBtn = root.querySelector("#set-wushu");
  const setYijinLabel = root.querySelector("#set-yijin-label");
  const setWushuLabel = root.querySelector("#set-wushu-label");
  const chooseTitle = root.querySelector("#choose-title");
  const modeSegmentBtn = root.querySelector("#mode-segment");
  const modeFullBtn = root.querySelector("#mode-full");
  const segmentRecommend = root.querySelector("#segment-recommend");
  const beginBtn = root.querySelector("#begin");

  const guideStage = root.querySelector("#guide-stage");
  const guidePose = root.querySelector("#guide-pose");
  const stageBadge = root.querySelector("#stage-badge");
  const progressFill = root.querySelector("#progress-fill");
  const phaseLabel = root.querySelector("#phase-label");
  const breathLabel = root.querySelector("#breath-label");
  const cueLabel = root.querySelector("#cue-label");
  const segmentLabel = root.querySelector("#segment-label");
  const interruptBtn = root.querySelector("#interrupt");
  const finishBtn = root.querySelector("#finish");

  const cameraHint = root.querySelector("#camera-hint");
  const cameraToggle = root.querySelector("#camera-toggle");
  const cameraStage = root.querySelector("#camera-stage");
  const cameraPreview = root.querySelector("#camera-preview");
  // Prefer #poseCanvas; fall back to legacy #pose-overlay.
  const poseCanvas =
    root.querySelector("#poseCanvas") || root.querySelector("#pose-overlay");
  const poseAngle = root.querySelector("#pose-angle");
  const poseReadout = root.querySelector("#pose-readout");
  const cameraPrivacyChip = root.querySelector("#camera-privacy-chip");

  const doneTitle = root.querySelector("#done-title");
  const todayDuration = root.querySelector("#today-duration");
  const interruptCount = root.querySelector("#interrupt-count");
  const cardResult = root.querySelector("#card-result");
  const downloadBtn = root.querySelector("#download-card");
  const backHome = root.querySelector("#back-home");
  const memoryTitle = root.querySelector("#memory-title");
  const memoryGrid = root.querySelector("#memory-grid");

  let lang = loadLang();
  let progress = loadProgress();
  let cardCollection = loadCollection();
  let sessionOutcome = null;
  let displayCard = null;
  // 三國殺式卡冊：練習前卡牆、完成後翻卡入冊儀式。
  let deckSection = null;
  let pickedSegmentId = "";
  const unlockParam = new URLSearchParams(window.location.search).get("unlock");
  let revealPending = false;
  let newlyUnlockedIds = [];
  let newBadgesConsumed = false;
  let selectedMode = PRACTICE_MODE.segment;
  let lastPose = null;
  let tickTimer = 0;
  let activeCheck = "rest";
  let lastSpokenKey = "";
  let donePoseUntil = 0;
  let lastCoachReady = false;
  let lastNearTarget = false;
  let audioCtx = null;
  // 首頁卡冊點暗卡會用 ?unlock= 深連結進來，直接幫使用者選好武術三式與該式。
  let activeSet = getSet(unlockParam ? WUSHU_CARD_SET_ID : loadSelectedSetId());
  // Wushu segments are "done" when their fragment is unlocked, so the FSM's
  // recommendedIndex naturally guides the user to the next missing fragment.
  const segmentDone = (id) =>
    activeSet.id === WUSHU_CARD_SET_ID
      ? segmentIsUnlocked(cardCollection, id)
      : Boolean(progress.completedSegments[id]);
  let practice = createPracticeFSM({
    set: activeSet,
    isComplete: segmentDone,
  });

  // --- Interactive lesson state (additive; no existing behaviour removed) ---
  let demoCanvas = null;
  let kanshan = null;
  let demoRaf = 0;
  let bypassMode = false;
  let bypassBtn = null;
  const nowPerf = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
  const lesson = createInteractiveLesson({
    now: nowPerf,
    onPass: () => {
      playTargetBeep();
      render();
    },
  });

  // 離線中國風配樂（五聲音階 + 鼓點），可關閉；不請求任何權限。
  const sound = createSoundscape();

  const poseTracker = createPoseTracker({
    video: cameraPreview,
    onPose: (pose) => {
      lastPose = pose;
      lesson.feed({
        cameraOn: Boolean(cameraPreview.srcObject),
        detected: pose.detected,
        coach: pose.coach,
        timestamp: nowPerf(),
      });
      paintPose();
      paintLessonReadout();
    },
  });

  const camera = createCameraFSM({
    onStream: async (stream) => {
      cameraPreview.classList.add("is-on");
      // Keep opacity 0 — do not use visibility:hidden/display:none (stalls decode).
      cameraPreview.style.opacity = "0";
      cameraPreview.style.visibility = "visible";
      if (cameraStage) cameraStage.hidden = false;
      await poseTracker.attach(stream);
      poseTracker.setCheck(activeCheck, "standing");
      // Layout then size canvas; drawPose runs from onPose.
      requestAnimationFrame(() => {
        ensurePoseCanvasSize();
        drawPose(lastPose?.landmarks || null, Boolean(lastPose?.coach?.ready));
      });
    },
    onStop: async () => {
      await poseTracker.detach();
      cameraPreview.classList.remove("is-on");
      if (cameraStage) cameraStage.hidden = true;
      drawPose(null, false, { clearOnly: true });
      lastPose = null;
      lastCoachReady = false;
      lastNearTarget = false;
      donePoseUntil = 0;
      lesson.feed({ cameraOn: false, detected: false, coach: null, timestamp: nowPerf() });
      paintPose();
      paintLessonReadout();
    },
  });

  langZh.addEventListener("click", () => setLang("zh"));
  langEn.addEventListener("click", () => setLang("en"));
  soundToggle?.addEventListener("click", () => {
    sound.toggle();
    paintSoundToggle();
  });
  voiceSelect?.addEventListener("change", () => {
    setVoiceOverride(voiceSelect.value || "");
    // 立刻試聽一小句，讓使用者確認選到的聲音。
    unlockSpeech("en");
    speakText("Ready", "en");
  });
  try {
    window.speechSynthesis?.addEventListener?.("voiceschanged", () => paintVoiceOptions());
  } catch {
    /* optional */
  }
  disclaimerSkip.addEventListener("click", () => {
    practice.skipDisclaimer();
    render();
  });
  disclaimerAccept.addEventListener("click", () => {
    practice.acceptDisclaimer();
    render();
  });
  setYijinBtn?.addEventListener("click", () => selectSet("yijin"));
  setWushuBtn?.addEventListener("click", () => selectSet("wushu-three"));
  modeSegmentBtn.addEventListener("click", () => {
    selectedMode = PRACTICE_MODE.segment;
    const state = practice.getState();
    practice.selectMode(PRACTICE_MODE.segment, state.recommendedIndex);
    render();
  });
  modeFullBtn.addEventListener("click", () => {
    selectedMode = PRACTICE_MODE.full;
    practice.selectMode(PRACTICE_MODE.full, 0);
    render();
  });
  beginBtn.addEventListener("click", () => {
    unlockSpeech(lang);
    paintVoiceOptions();
    sound.start();
    lastSpokenKey = "";
    donePoseUntil = 0;
    lastCoachReady = false;
    lastNearTarget = false;
    lesson.reset();
    lesson.setBypass(bypassMode);
    practice.selectMode(selectedMode, practice.getState().segmentIndex);
    practice.begin();
    armTick();
    render();
    speakCue();
  });
  window.addEventListener("resize", () => {
    if (camera.getState().active) {
      ensurePoseCanvasSize();
      drawPose(lastPose?.landmarks || null, Boolean(lastPose?.coach?.ready));
    }
  });
  interruptBtn.addEventListener("click", () => {
    const event = practice.interrupt();
    clearInterval(tickTimer);
    cancelSpeech();
    sound.stop();
    persistSession(event.state);
    void camera.stop();
    render();
  });
  finishBtn.addEventListener("click", () => {
    const event = practice.finishEarly();
    clearInterval(tickTimer);
    cancelSpeech();
    sound.stop();
    persistSession(event.state);
    void camera.stop();
    render();
  });
  cameraToggle.addEventListener("click", async () => {
    const state = camera.getState();
    if (state.active || state.phase === "requesting") {
      await camera.stop();
    } else {
      // Unlock short beep AudioContext on the same user gesture as camera start.
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) {
          if (!audioCtx) audioCtx = new AC();
          void audioCtx.resume();
        }
      } catch {
        /* optional */
      }
      await camera.start({ video: { facingMode: "user" }, audio: false });
    }
    render();
  });
  downloadBtn.addEventListener("click", () => downloadCard());
  window.addEventListener("pagehide", () => {
    camera.hardStop();
    cancelSpeech();
    sound.dispose();
    if (demoRaf) cancelAnimationFrame(demoRaf);
    demoRaf = 0;
  });
  window.addEventListener("beforeunload", () => {
    camera.hardStop();
    sound.stop();
  });

  injectCardStyles(root);
  setupDemoStage();
  setupBypassButton();
  setupDeckSection();
  if (unlockParam) {
    saveSelectedSetId(WUSHU_CARD_SET_ID);
    const index = activeSet.segments.findIndex((seg) => seg.id === unlockParam);
    if (index >= 0) {
      selectedMode = PRACTICE_MODE.segment;
      practice.selectMode(PRACTICE_MODE.segment, index);
      pickedSegmentId = unlockParam;
    }
  }
  applyLanguage();
  render();

  function armTick() {
    clearInterval(tickTimer);
    tickTimer = window.setInterval(() => {
      const state = practice.getState();
      const spec = state.segment ? stageForPhase(state.segment, state.phase) : null;
      // Old teaching loop: Kanshan demonstrates, you copy the move, and the
      // coach must confirm the shape for 1.2 s before the lesson advances.
      // Only "hold" is scored; prep / breathe / rest keep their rhythm.
      // 默認無攝像頭模式：沒開鏡頭就照原節奏走完（不判定），不會卡在
      // 「等待入鏡」；一鍵開鏡頭後才啟用「看山確認達標 1.2s」的判定。
      const cameraActive = camera.getState().active;
      const gated = shouldGateLesson({
        screen: state.screen,
        phase: state.phase,
        cameraActive,
        bypass: bypassMode,
        hasCheck: Boolean(spec?.check),
      });
      lesson.setStage({
        key: `${activeSet.id}|${state.segmentIndex}|${state.segment?.id || ""}|${state.phase}|${cameraActive ? "cam" : "no-cam"}`,
        check: spec?.check || "rest",
        gated,
      });
      lesson.probe();
      if (!lesson.getState().canAdvance) {
        render();
        return;
      }
      const event = practice.tick();
      render();
      if (event?.type === "phase" || event?.type === "segment") {
        sound.beat(stageOf(event.state.phase));
        speakCue();
      }
      if (event?.type === "completed") {
        clearInterval(tickTimer);
        sound.stop();
        persistSession(event.state);
        void camera.stop();
        render();
      }
    }, 200);
  }

  function selectSet(id) {
    const next = getSet(id);
    if (next.id === activeSet.id) {
      render();
      return;
    }
    activeSet = next;
    saveSelectedSetId(next.id);
    selectedMode = PRACTICE_MODE.segment;
    pickedSegmentId = "";
    lesson.reset();
    lesson.setBypass(bypassMode);
    const screen = practice.getState().screen;
    practice = createPracticeFSM({
      set: activeSet,
      isComplete: segmentDone,
    });
    // Set picker lives on the choose screen; keep the user there after switching.
    if (screen !== PRACTICE_SCREEN.disclaimer) {
      practice.skipDisclaimer();
    }
    render();
  }

  function persistSession(state) {
    progress = applySession(progress, activeSet, state.completedSegmentIds, {
      durationMs: state.elapsedMs,
      interrupts: state.interrupts,
      finished: state.finished,
    });
    saveProgress(progress);
    // Deterministic settlement: segment → that fragment; full → all three +
    // automatic master-card synthesis. No randomness, no currency.
    sessionOutcome = settleSession(cardCollection, {
      setId: activeSet.id,
      mode: state.mode,
      completedSegmentIds: state.completedSegmentIds,
      finished: state.finished,
    });
    cardCollection = sessionOutcome.collection;
    saveCollection(cardCollection);
    displayCard = sessionOutcome.displayCard;
    newlyUnlockedIds = [...(sessionOutcome.unlockedFragmentIds || [])];
    if (sessionOutcome.justSynthesized) newlyUnlockedIds.push(MASTER_CARD_ID);
    newBadgesConsumed = false;
    revealPending = Boolean(displayCard);
  }

  function setLang(next) {
    if (next === lang) return;
    lang = next;
    saveLang(lang);
    applyLanguage();
    render();
    if (practice.getState().screen === PRACTICE_SCREEN.active) {
      speakCue();
    } else {
      cancelSpeech();
    }
  }

  function applyLanguage() {
    const copy = getCopy(lang);
    document.documentElement.lang = lang === "en" ? "en" : "zh-Hant";
    langZh.setAttribute("aria-pressed", lang === "zh" ? "true" : "false");
    langEn.setAttribute("aria-pressed", lang === "en" ? "true" : "false");
    titleEl.textContent = copy.practiceTitle;
    document.title = `${copy.practiceTitle} · ${copy.brand}`;
    disclaimerTitle.textContent = copy.disclaimerTitle;
    disclaimerBody.textContent = copy.disclaimerBody;
    disclaimerSkip.textContent = copy.disclaimerSkip;
    disclaimerAccept.textContent = copy.disclaimerAccept;
    if (chooseSetTitle) chooseSetTitle.textContent = copy.chooseSet;
    if (setYijinLabel) {
      const yijin = getSet("yijin");
      setYijinLabel.textContent = yijin.title[lang] || yijin.title.zh;
    }
    if (setWushuLabel) {
      const wushu = getSet("wushu-three");
      setWushuLabel.textContent = wushu.title[lang] || wushu.title.zh;
    }
    chooseTitle.textContent = copy.chooseMode;
    modeSegmentBtn.querySelector(".mode-label").textContent = copy.modeSegment;
    modeFullBtn.querySelector(".mode-label").textContent = copy.modeFull;
    beginBtn.textContent = copy.begin;
    interruptBtn.textContent = copy.interrupt;
    finishBtn.textContent = copy.finish;
    doneTitle.textContent = copy.doneTitle;
    downloadBtn.textContent = copy.downloadCard;
    backHome.textContent = copy.backHome;
    memoryTitle.textContent = copy.memoryTitle;
    root.querySelector("#stat-today-label").textContent = copy.todayDuration;
    root.querySelector("#stat-interrupt-label").textContent = copy.interruptCount;
    root.querySelector(".progress-track")?.setAttribute("aria-label", copy.progress);
    updateBypassLabel();
    paintSoundToggle();
    paintVoiceOptions();
  }

  function render() {
    const copy = getCopy(lang);
    const state = practice.getState();
    const cam = camera.getState();

    for (const [name, el] of Object.entries(screens)) {
      el.hidden = state.screen !== name;
    }

    setYijinBtn?.setAttribute("aria-pressed", activeSet.id === "yijin" ? "true" : "false");
    setWushuBtn?.setAttribute(
      "aria-pressed",
      activeSet.id === "wushu-three" ? "true" : "false",
    );
    const rec = activeSet.segments[state.recommendedIndex];
    segmentRecommend.textContent = rec
      ? `${copy.recommended}: ${rec.title[lang] || rec.title.zh}`
      : "";
    modeSegmentBtn.setAttribute("aria-pressed", selectedMode === PRACTICE_MODE.segment ? "true" : "false");
    modeFullBtn.setAttribute("aria-pressed", selectedMode === PRACTICE_MODE.full ? "true" : "false");

    if (state.screen === PRACTICE_SCREEN.active && state.segment) {
      paintGuide(state, copy);
    }
    if (state.screen === PRACTICE_SCREEN.choose) {
      paintDeck();
    }

    cameraToggle.textContent = cam.active ? copy.closeCamera : copy.openCamera;
    cameraHint.textContent = friendlyCameraHint(copy, cam);
    if (cameraPrivacyChip) {
      cameraPrivacyChip.textContent =
        lang === "en"
          ? "The picture stays on this device. Nothing is uploaded or stored."
          : "畫面僅在本機處理，不會上傳或儲存。";
    }
    paintPose();
    paintLessonReadout();

    const today = progress.today;
    todayDuration.textContent = formatDuration(today.durationMs, copy);
    interruptCount.textContent = String(today.interrupts);

    if (state.screen === PRACTICE_SCREEN.done) {
      paintCardResult(copy);
      paintMemory(copy);
      // 結算後立刻把「墨氣」補到練習頁卡牆，回上一頁就能看到亮了一檔。
      applyInkLight(deckSection, cardCollection);
      if (revealPending) {
        revealPending = false;
        void playCardReveal({
          card: displayCard,
          outcome: sessionOutcome,
          lang,
          doc: root,
          onExpand: openAlbum,
        });
      }
    }
  }

  function paintGuide(state, copy) {
    const seg = state.segment;
    const stageSpec = stageForPhase(seg, state.phase);
    const stage = stageOf(state.phase);
    const showingDone = Date.now() < donePoseUntil;
    const clip = showingDone
      ? KANSHAN_STAGE.done
      : KANSHAN_STAGE[stage] || stageSpec?.clip || seg.pose || "idle.webp";
    const src = poseUrl(clip);
    if (guidePose.getAttribute("src") !== src) guidePose.src = src;
    guideStage.dataset.phase = state.phase;
    guideStage.dataset.stage = showingDone ? "done" : stage;
    guideStage.dataset.check = stageSpec?.check || "";
    guideStage.dataset.move = seg.id;
    guideStage.classList.toggle("is-inhale", stage === "rise" && !showingDone);
    guideStage.classList.toggle("is-exhale", stage === "close" && !showingDone);
    guideStage.classList.toggle("is-natural", stage === "hold" && !showingDone);
    guideStage.classList.toggle("is-done", showingDone);
    stageBadge.textContent = showingDone
      ? getCopy(lang).coachOk
      : stageBadgeText(copy, stage);
    segmentLabel.textContent = seg.title[lang] || seg.title.zh;
    const cue =
      (stageSpec?.cue && (stageSpec.cue[lang] || stageSpec.cue.zh)) ||
      seg.cue[lang] ||
      seg.cue.zh;
    cueLabel.textContent = cue;
    phaseLabel.textContent = phaseText(copy, state.phase);
    const breath = breathForPhase(state.phase);
    const breathText = breath[lang] || breath.zh;
    breathLabel.hidden = false;
    breathLabel.textContent = breathText;
    breathLabel.dataset.breath =
      stage === "rise" ? "in" : stage === "close" ? "out" : "natural";
    // While a move is being checked, the bar shows the 1.2 s hold progress
    // instead of the (already expired) timed phase progress.
    const ls = lesson.getState();
    const waiting =
      ls.gated && !ls.bypass && !ls.ready && state.phase === PRACTICE_PHASE.hold;
    progressFill.style.width = `${Math.round((waiting ? ls.progress : state.phaseProgress) * 100)}%`;
    syncTrackerCheck(stageSpec?.check || "rest");
  }

  function syncTrackerCheck(check) {
    const next = check || "rest";
    if (next === activeCheck) return;
    activeCheck = next;
    poseTracker.setCheck(next, "standing");
  }

  function friendlyCameraHint(copy, cam) {
    if (cam.active) return copy.cameraOnHint;
    if (cam.phase !== "error") {
      const ls = lesson.getState();
      if (ls.gated && !ls.bypass) {
        return lang === "en"
          ? "Turn on the camera — Kanshan checks your move before the lesson continues (40–50 cm is fine)."
          : "請按「一鍵開啟本地攝像頭」— 看山會確認動作達標才繼續（40–50cm 即可，不必後退 1 米）。";
      }
      return copy.cameraOffHint;
    }
    const raw = String(cam.error || "").toLowerCase();
    if (raw.includes("notallowed") || raw.includes("permission") || raw.includes("denied")) {
      return copy.cameraDenied;
    }
    if (raw.includes("notreadable") || raw.includes("trackstart") || raw.includes("busy") || raw.includes("in use")) {
      return copy.cameraBusy;
    }
    return copy.cameraError;
  }

  function paintPose() {
    const copy = getCopy(lang);
    const camOn = camera.getState().active;
    if (cameraStage) cameraStage.hidden = !camOn;
    if (!camOn) {
      drawPose(null, false, { clearOnly: true });
      if (poseAngle) {
        poseAngle.hidden = true;
        poseAngle.textContent = "";
      }
      poseReadout.textContent = "";
      poseReadout.dataset.status = "";
      return;
    }

    if (lastPose?.error) {
      drawPose(null, false, { tip: copy.cameraError });
      if (poseAngle) poseAngle.hidden = true;
      poseReadout.dataset.status = "error";
      poseReadout.textContent = copy.cameraError;
      lastCoachReady = false;
      return;
    }

    const landmarks = lastPose?.landmarks || null;
    const hasLandmarks =
      lastPose?.detected && Array.isArray(landmarks) && landmarks.length >= 25;
    const coach = lastPose?.coach || null;
    const ready = Boolean(hasLandmarks && coach?.ready);
    const nearTarget =
      ready ||
      Boolean(
        hasLandmarks &&
          coach?.tracking &&
          coach.total > 0 &&
          coach.passed / coach.total >= 0.85,
      );
    const okLabel = lang === "en" ? "Nice" : "達標";
    const adjustLabel = lang === "en" ? "Adjust again" : "再調整";

    // Always draw: fuller skeleton when landmarks exist; otherwise tip on canvas.
    if (hasLandmarks) {
      drawPose(landmarks, ready || nearTarget, {
        badge: ready ? okLabel : nearTarget ? adjustLabel : "",
      });
      const elbowDeg = estimateElbowDegrees(landmarks);
      if (poseAngle) {
        if (elbowDeg != null) {
          poseAngle.hidden = false;
          poseAngle.textContent = copy.elbowEstimate.replace(
            "{deg}",
            String(Math.round(elbowDeg / 5) * 5),
          );
        } else {
          poseAngle.hidden = true;
          poseAngle.textContent = "";
        }
      }
    } else {
      drawPose(null, false, { tip: copy.coachUnstable });
      if (poseAngle) {
        poseAngle.hidden = true;
        poseAngle.textContent = "";
      }
      lastCoachReady = false;
      lastNearTarget = false;
      poseReadout.dataset.status = "unstable";
      poseReadout.textContent = copy.coachUnstable;
      return;
    }

    if (nearTarget && !lastNearTarget) {
      donePoseUntil = Date.now() + 1600;
      const state = practice.getState();
      if (state.screen === PRACTICE_SCREEN.active) {
        paintGuide(state, copy);
      }
      if (ready) playTargetBeep();
    }
    lastNearTarget = nearTarget;
    lastCoachReady = ready;

    const framingIssue =
      coach &&
      (!coach.tracking ||
        coach.code === "missing" ||
        coach.code === "framing" ||
        coach.code === "geometry");
    if (framingIssue) {
      poseReadout.dataset.status = "unstable";
      poseReadout.textContent = copy.coachUnstable;
      return;
    }

    if (ready) {
      poseReadout.dataset.status = "ok";
      poseReadout.textContent = `✓ ${okLabel}`;
      return;
    }
    poseReadout.dataset.status = "adjust";
    poseReadout.textContent = `· ${adjustLabel}`;
  }

  // ---------------------------------------------------------------------
  // Interactive lesson: Kanshan demonstrates the move, the camera checks
  // the user's shape, and only a confirmed 1.2 s hold advances the lesson.
  // Everything here is additive; the existing UI keeps every other screen.
  // ---------------------------------------------------------------------

  function setupDemoStage() {
    if (!guideStage) return;
    demoCanvas = document.createElement("canvas");
    demoCanvas.className = "kanshan-demo";
    demoCanvas.setAttribute("aria-hidden", "true");
    Object.assign(demoCanvas.style, {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
      display: "block",
      zIndex: "0",
      pointerEvents: "none",
    });
    guideStage.insertBefore(demoCanvas, guideStage.firstChild);
    // The static sticker becomes a fallback only; the live rig takes over.
    if (guidePose) guidePose.style.display = "none";
    kanshan = createKanshanCoach(demoCanvas);
    const loop = () => {
      demoRaf = window.requestAnimationFrame(loop);
      drawDemo();
    };
    demoRaf = window.requestAnimationFrame(loop);
  }

  function setupBypassButton() {
    const actions = interruptBtn?.parentElement;
    if (!actions) return;
    bypassBtn = document.createElement("button");
    bypassBtn.type = "button";
    bypassBtn.className = "secondary";
    bypassBtn.id = "lesson-bypass";
    bypassBtn.setAttribute("aria-pressed", "false");
    actions.insertBefore(bypassBtn, interruptBtn);
    bypassBtn.addEventListener("click", () => {
      bypassMode = !bypassMode;
      lesson.setBypass(bypassMode);
      updateBypassLabel();
      render();
    });
    updateBypassLabel();
  }

  function updateBypassLabel() {
    if (!bypassBtn) return;
    bypassBtn.textContent = bypassMode
      ? lang === "en"
        ? "Back to AI coaching"
        : "回到 AI 陪練"
      : lang === "en"
        ? "Follow along only (no scoring)"
        : "僅跟練（不判定）";
    bypassBtn.setAttribute("aria-pressed", bypassMode ? "true" : "false");
  }

  function paintSoundToggle() {
    if (!soundToggle) return;
    const on = sound.isEnabled();
    soundToggle.textContent = lang === "en" ? (on ? "Music on" : "Music off") : on ? "音樂 開" : "音樂 關";
    soundToggle.setAttribute("aria-pressed", on ? "true" : "false");
    soundToggle.setAttribute("aria-label", lang === "en" ? "Toggle Chinese pentatonic music" : "切換中國風配樂");
  }

  /** EN 模式才顯示：列出系統可用的英文語音，女聲優先並標註。 */
  function paintVoiceOptions() {
    if (!voiceSelect) return;
    voiceSelect.hidden = lang !== "en";
    if (lang !== "en") return;
    const voices = listSpeechVoices("en").slice().sort(
      (a, b) => rankVoiceScore(b, "en") - rankVoiceScore(a, "en") ||
        String(a.name).localeCompare(String(b.name)),
    );
    const options = voices.map((voice) => {
      const gender = voiceGender(voice);
      const tag = gender === "female" ? " · 女聲" : gender === "male" ? " · 男聲" : "";
      const name = String(voice.name || voice.voiceURI || "");
      return `<option value="${escapeHtml(name)}">${escapeHtml(name + tag)}</option>`;
    });
    voiceSelect.innerHTML = `<option value="">${lang === "en" ? "Auto · female voice first" : "自動（優先女聲）"}</option>${options.join("")}`;
    voiceSelect.setAttribute("aria-label", lang === "en" ? "English voice" : "英文語音");
    const override = getVoiceOverride();
    voiceSelect.value = voices.some((v) => v.name === override) ? override : "";
  }

  // ---------------------------------------------------------------------
  // 三國殺式招式卡冊：練習前先看卡牆（未解鎖是水墨剪影卡背），
  // 完成招式後翻卡解鎖並收入卡冊。發放條件完全確定性。
  // ---------------------------------------------------------------------

  function setupDeckSection() {
    const choose = screens.choose;
    if (!choose) return;
    deckSection = document.createElement("section");
    deckSection.id = "qcard-deck";
    deckSection.setAttribute("aria-label", lang === "en" ? "Card album" : "招式卡冊");
    const actions = choose.querySelector(".actions");
    if (actions) choose.insertBefore(deckSection, actions);
    else choose.appendChild(deckSection);
  }

  function consumeNewIds() {
    if (newBadgesConsumed) return [];
    newBadgesConsumed = true;
    return newlyUnlockedIds;
  }

  function pickedLabel() {
    const seg = activeSet.segments.find((s) => s.id === pickedSegmentId);
    return seg ? seg.title[lang] || seg.title.zh : "";
  }

  /** 點暗卡 = 選好那一式去練；若人在易筋經，自動切到武術三式。 */
  function pickSegment(segmentId) {
    if (activeSet.id !== WUSHU_CARD_SET_ID) selectSet(WUSHU_CARD_SET_ID);
    const index = activeSet.segments.findIndex((seg) => seg.id === segmentId);
    if (index < 0) return;
    selectedMode = PRACTICE_MODE.segment;
    practice.selectMode(PRACTICE_MODE.segment, index);
    pickedSegmentId = segmentId;
    render();
  }

  function paintDeck() {
    if (!deckSection) return;
    renderDeck(deckSection, {
      collection: cardCollection,
      lang,
      doc: root,
      activeSetId: activeSet.id,
      pickedSegmentId,
      pickedLabel: pickedLabel(),
      newlyUnlockedIds: consumeNewIds(),
      onPick: pickSegment,
      onOpen: (card) => openCardDetail(card, { lang, doc: root, onDownload: downloadAnyCard }),
      onExpand: openAlbum,
    });
  }

  function openAlbum() {
    openCardAlbum({
      collection: cardCollection,
      lang,
      doc: root,
      activeSetId: activeSet.id,
      pickedSegmentId,
      pickedLabel: pickedLabel(),
      onPick: pickSegment,
      onDownload: downloadAnyCard,
    });
  }

  /** 卡面 1280×800 / 卡背 800×1200，皆為高清 PNG。 */
  async function downloadAnyCard(card, face = "front") {
    const canvas = document.createElement("canvas");
    if (face === "back") {
      await drawCardBackCanvas(canvas, card, { lang });
      await downloadCardImage(canvas, card, "-back");
    } else {
      await drawCardCanvas(canvas, card, { lang });
      await downloadCardImage(canvas, card);
    }
  }

  function drawDemo() {
    if (!kanshan) return;
    const state = practice.getState();
    if (state.screen !== PRACTICE_SCREEN.active || !state.segment) return;
    const spec = stageForPhase(state.segment, state.phase);
    const target = demoPoseFor(state.segment.id, spec?.check || "rest");
    const amount = demoAmount(state.phase, state.phaseProgress);
    const points = sampleDemo("rest", target, amount);
    const ls = lesson.getState();
    kanshan.draw(points, { pose: target, ready: ls.ready, label: demoLabel(ls) });
  }

  function demoLabel(ls) {
    if (ls.bypass) return lang === "en" ? "Follow along · no scoring" : "僅跟練 · 不判定";
    if (!ls.gated) return lang === "en" ? "Watch Kanshan demonstrate" : "看山示範中 · 跟著做";
    switch (ls.status) {
      case LESSON_STATUS.passed:
        return lang === "en" ? "On target!" : "達標！";
      case LESSON_STATUS.waitingCamera:
        return lang === "en" ? "Turn on the camera" : "請開啟攝像頭";
      case LESSON_STATUS.framing:
        return lang === "en" ? "Step into frame" : "讓頭肩肘入鏡";
      case LESSON_STATUS.holding:
        return `${lang === "en" ? "Hold" : "保持"} ${Math.round(ls.progress * 100)}%`;
      case LESSON_STATUS.adjusting:
        return lang === "en" ? "Copy the glowing hands" : "跟著發光的手手調整";
      default:
        return lang === "en" ? "Copy the glowing hands" : "跟著發光的手手做";
    }
  }

  /** Teaching feedback lives in the existing readout; no new DOM chrome. */
  function paintLessonReadout() {
    if (!poseReadout) return;
    const state = practice.getState();
    const ls = lesson.getState();
    if (state.screen !== PRACTICE_SCREEN.active || !ls.gated) return;
    const copy = getCopy(lang);
    let text = "";
    let statusValue = "";
    if (ls.bypass) {
      text = lang === "en" ? "· Follow along (no scoring)" : "· 僅跟練中，不判定動作";
    } else if (ls.status === LESSON_STATUS.passed) {
      text = `✓ ${copy.coachOk} · ${lang === "en" ? "next move" : "準備下一動"}`;
      statusValue = "ok";
    } else if (ls.status === LESSON_STATUS.waitingCamera) {
      text = lang === "en" ? "· Turn on the camera to be checked" : "· 請開啟本地攝像頭，看山才能確認動作";
      statusValue = "unstable";
    } else if (ls.status === LESSON_STATUS.framing) {
      text = ls.detail
        ? `· ${ls.detail}`
        : lang === "en"
          ? "· Step into frame — head, shoulders and elbows visible"
          : "· 讓頭、肩、肘清晰入鏡（40–50cm 即可）";
      statusValue = "unstable";
    } else if (ls.status === LESSON_STATUS.holding) {
      const pct = Math.round(ls.progress * 100);
      text = lang === "en" ? `· Hold it ${pct}%` : `· 動作到位，保持 ${pct}%`;
      statusValue = "ok";
    } else if (ls.status === LESSON_STATUS.adjusting) {
      text = ls.detail ? `· ${ls.detail}` : `· ${copy.coachAdjust}`;
      statusValue = "adjust";
    } else {
      text = lang === "en" ? "· Copy Kanshan's glowing hands" : "· 跟著看山發光的手手做";
    }
    poseReadout.dataset.status = statusValue;
    poseReadout.textContent = text;
  }

  function ensurePoseCanvasSize() {
    if (!poseCanvas) return { w: 640, h: 480 };
    const stageW = Math.max(1, cameraStage?.clientWidth || 0);
    const stageH = Math.max(1, cameraStage?.clientHeight || 0);
    const vw = cameraPreview?.videoWidth || 0;
    const vh = cameraPreview?.videoHeight || 0;
    let w = 640;
    let h = 480;
    if (stageW > 1 && stageH > 1) {
      w = Math.round(stageW);
      h = Math.round(stageH);
    } else if (vw > 0 && vh > 0) {
      w = vw;
      h = vh;
    }
    // Cap backing store but keep aspect.
    const maxW = 960;
    if (w > maxW) {
      h = Math.round((h * maxW) / w);
      w = maxW;
    }
    if (poseCanvas.width !== w) poseCanvas.width = w;
    if (poseCanvas.height !== h) poseCanvas.height = h;
    return { w, h };
  }

  /**
   * Fuller stick figure from MediaPipe landmarks, or a tip when missing.
   * Never paints the live video frame.
   */
  function drawPose(landmarks, ready = false, options = {}) {
    if (!poseCanvas) return;
    const { w, h } = ensurePoseCanvasSize();
    const ctx = poseCanvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#15201c";
    ctx.fillRect(0, 0, w, h);
    if (options.clearOnly) return;

    const list = Array.isArray(landmarks) ? landmarks : null;
    const usable =
      list &&
      list.length >= 29 &&
      list[11] &&
      list[12] &&
      Number.isFinite(list[11].x) &&
      Number.isFinite(list[12].x);

    if (!usable) {
      const tip =
        options.tip ||
        getCopy(lang).coachUnstable ||
        "請調整位置，讓頭部、肩膀、肘部清晰可見";
      ctx.fillStyle = "rgba(232, 245, 239, 0.92)";
      ctx.font = `600 ${Math.max(14, Math.round(w * 0.035))}px Nunito, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      wrapCanvasText(ctx, tip, w / 2, h / 2, w * 0.82, Math.max(20, h * 0.06));
      return;
    }

    const limb = ready ? "rgba(240, 210, 120, 0.95)" : "rgba(170, 230, 195, 0.95)";
    const joint = ready ? "#f5d76e" : "rgba(245, 255, 250, 0.98)";
    const jointStroke = ready ? "#ffe9a8" : "rgba(200, 240, 220, 0.9)";
    ctx.lineWidth = Math.max(3.5, w * 0.014);
    ctx.strokeStyle = limb;
    ctx.fillStyle = joint;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const pt = (id) => {
      const p = list[id];
      if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return null;
      // Mirror X to match selfie-facing camera.
      return { x: (1 - p.x) * w, y: p.y * h };
    };

    // Clear limbs first.
    for (const [a, b] of STICK_BONES) {
      const pa = pt(a);
      const pb = pt(b);
      if (!pa || !pb) continue;
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.stroke();
    }

    // Head circle from nose + ear span when available.
    const nose = pt(0);
    if (nose) {
      const earL = pt(7);
      const earR = pt(8);
      let headR = Math.max(10, w * 0.045);
      if (earL && earR) {
        headR = Math.max(headR, Math.hypot(earL.x - earR.x, earL.y - earR.y) * 0.55);
      }
      ctx.beginPath();
      ctx.arc(nose.x, nose.y - headR * 0.15, headR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = ready ? "rgba(245, 215, 110, 0.35)" : "rgba(180, 230, 200, 0.2)";
      ctx.fill();
      ctx.fillStyle = joint;
    }

    // Joint dots: head, shoulders, elbows, wrists, hips, knees, ankles.
    for (const id of STICK_JOINTS) {
      const p = pt(id);
      if (!p) continue;
      const r =
        id === 0
          ? Math.max(5, w * 0.018)
          : id === 15 || id === 16 || id === 27 || id === 28
            ? Math.max(4, w * 0.014)
            : Math.max(5, w * 0.017);
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = joint;
      ctx.fill();
      ctx.lineWidth = Math.max(1.5, w * 0.004);
      ctx.strokeStyle = jointStroke;
      ctx.stroke();
    }

    if (options.badge) {
      ctx.fillStyle = ready ? "rgba(245, 215, 110, 0.95)" : "rgba(200, 230, 210, 0.9)";
      ctx.font = `800 ${Math.max(16, Math.round(w * 0.048))}px Nunito, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(options.badge, w / 2, Math.max(10, h * 0.04));
    }
  }

  /** Soft chime on 達標 — Web Audio only, no assets. */
  function playTargetBeep() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!audioCtx) audioCtx = new AC();
      if (audioCtx.state === "suspended") void audioCtx.resume();
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.08);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    } catch {
      /* audio optional */
    }
  }

  function wrapCanvasText(ctx, text, cx, cy, maxWidth, lineHeight) {
    const chars = String(text);
    const lines = [];
    let line = "";
    for (const ch of chars) {
      const test = line + ch;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = ch;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    const startY = cy - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((ln, i) => ctx.fillText(ln, cx, startY + i * lineHeight));
  }

  function estimateElbowDegrees(landmarks) {
    if (!landmarks) return null;
    const aspect =
      cameraPreview.videoWidth && cameraPreview.videoHeight
        ? cameraPreview.videoWidth / cameraPreview.videoHeight
        : 4 / 3;
    const scaled = (p) =>
      p && Number.isFinite(p.x) && Number.isFinite(p.y)
        ? { x: p.x * aspect, y: p.y }
        : null;
    const left = jointAngle(
      scaled(landmarks[11]),
      scaled(landmarks[13]),
      scaled(landmarks[15]),
    );
    const right = jointAngle(
      scaled(landmarks[12]),
      scaled(landmarks[14]),
      scaled(landmarks[16]),
    );
    const vals = [left, right].filter((n) => Number.isFinite(n));
    if (!vals.length) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }

  function paintCardResult() {
    renderCardResult(cardResult, {
      card: displayCard,
      outcome: sessionOutcome,
      collection: cardCollection,
      lang,
      setTitle: activeSet.title[lang] || activeSet.title.zh,
      onOpenAlbum: openAlbum,
      nonCardSet: activeSet.id !== WUSHU_CARD_SET_ID,
      onSwitchSet: () => {
        const missing = FRAGMENT_CARDS.find((c) => !cardCollection.fragments.includes(c.id));
        window.location.href = `practice.html?unlock=${encodeURIComponent(missing?.segmentId || "ready-fists")}`;
      },
    });
    const canvas = root.querySelector("#card-canvas");
    if (!canvas || !displayCard) {
      downloadBtn.hidden = true;
      return;
    }
    downloadBtn.hidden = false;
    // High-resolution PNG backing store (2x); drawn from the card catalog.
    void drawCardCanvas(canvas, displayCard, { lang });
  }

  function paintMemory() {
    renderMemory(memoryGrid, {
      collection: cardCollection,
      lang,
      newlyUnlockedIds: consumeNewIds(),
      onOpen: (card) =>
        openCardDetail(card, { lang, doc: root, onDownload: downloadAnyCard }),
      onExpand: openAlbum,
    });
  }

  function speakCue() {
    const state = practice.getState();
    if (!state.segment || state.screen !== PRACTICE_SCREEN.active) {
      cancelSpeech();
      return;
    }
    const copy = getCopy(lang);
    const stage = stageOf(state.phase);
    // Speak only when Rise/Hold/Close (or segment) changes — no per-frame spam.
    // hold + breathe both map to Hold, so they share one spoken key.
    const key = `${state.segmentIndex}|${stage}|${lang}`;
    if (key === lastSpokenKey) return;
    lastSpokenKey = key;
    const breath = breathForPhase(state.phase);
    const stageWord = stageBadgeText(copy, stage);
    const breathWord = breath[lang] || breath.zh;
    speakText(`${stageWord}. ${breathWord}`, lang);
  }

  async function downloadCard() {
    const canvas = root.querySelector("#card-canvas");
    if (!canvas || !displayCard) return;
    // 下載使用者目前看到的那一面：正面卡圖或翻過來的資訊卡背。
    const back = cardResult.dataset.qface === "back";
    if (back) {
      await drawCardBackCanvas(canvas, displayCard, { lang });
      await downloadCardImage(canvas, displayCard, "-back");
    } else {
      await drawCardCanvas(canvas, displayCard, { lang });
      await downloadCardImage(canvas, displayCard);
    }
  }
}

function stageOf(phase) {
  if (phase === PRACTICE_PHASE.prep) return "rise";
  if (phase === PRACTICE_PHASE.rest) return "close";
  return "hold";
}

/** Short English tips for contest coach codes (messages stay zh in coach.js). */
function coachTipEn(coach) {
  const map = {
    ready: "Hold this shape a moment",
    missing: "Step into frame — head and shoulders visible",
    framing: "Adjust so head, shoulders, and elbows are clear",
    distance: "Move a little closer so shoulders read clearly",
    geometry: "Camera frame not ready yet",
    unsupported: "This step has no check — keep following the guide",
  };
  if (coach.ready) return map.ready;
  if (map[coach.code]) return map[coach.code];
  if (coach.message) return coach.message;
  return "Keep following the guide";
}

function stageBadgeText(copy, stage) {
  if (stage === "rise") return copy.stageRise;
  if (stage === "close") return copy.stageClose;
  return copy.stageHold;
}

function phaseText(copy, phase) {
  if (phase === PRACTICE_PHASE.prep) return copy.phasePrep;
  if (phase === PRACTICE_PHASE.hold) return copy.phaseHold;
  if (phase === PRACTICE_PHASE.breathe) return copy.phaseBreathe;
  return copy.phaseRest;
}

function formatDuration(ms, copy) {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m <= 0) return `${s} ${copy.secondsUnit}`;
  return `${m} ${copy.minutesUnit} ${s} ${copy.secondsUnit}`;
}

// Card rendering / PNG export now lives in js/ui/cardUI.js (single source of
// truth for both the result panel and the memory album detail dialog).
