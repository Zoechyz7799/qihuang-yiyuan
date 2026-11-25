/**
 * Liu Kanshan pet presentation. Uses public/poses/* assets.
 * DOM for the pet only; timer state comes from outside.
 */

const CLIPS = Object.freeze({
  idle: "idle.webp",
  sway: "sway.webp",
  sleep: "sleep.webp",
  ball: "ball.webp",
  laptop: "laptop.webp",
  wave: "wave.webp",
});

const IDLE_CYCLE = Object.freeze([
  Object.freeze({ clip: "idle", hold: 2400 }),
  Object.freeze({ clip: "sway", hold: 2600 }),
  Object.freeze({ clip: "sleep", hold: 2800 }),
  Object.freeze({ clip: "ball", hold: 2400 }),
  Object.freeze({ clip: "laptop", hold: 2600 }),
]);

function poseUrl(file) {
  return `./public/poses/${file}`;
}

/**
 * @param {HTMLElement} rig
 */
export function createPet(rig) {
  const image = rig.querySelector(".pet-img");
  let phase = "idle";
  let idleIndex = 0;
  let idleTimer = 0;
  let momentTimer = 0;
  let entered = false;
  const reduce =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  for (const file of Object.values(CLIPS)) {
    const preload = new Image();
    preload.src = poseUrl(file);
  }

  function showClip(name) {
    const src = poseUrl(CLIPS[name] ?? CLIPS.idle);
    if (image.getAttribute("src") === src) return;
    image.src = src;
  }

  function stopIdle() {
    window.clearTimeout(idleTimer);
    idleTimer = 0;
  }

  function runIdle() {
    stopIdle();
    if (phase !== "idle" || momentTimer) return;
    const step = IDLE_CYCLE[idleIndex % IDLE_CYCLE.length];
    showClip(step.clip);
    idleTimer = window.setTimeout(() => {
      idleIndex = (idleIndex + 1) % IDLE_CYCLE.length;
      runIdle();
    }, step.hold);
  }

  function applyPhase() {
    rig.dataset.phase = phase;
    rig.classList.toggle("is-alert", phase === "alert");
    rig.classList.toggle("is-running", phase === "running");
    if (momentTimer) return;
    if (phase === "running") {
      stopIdle();
      rig.classList.remove("is-floating", "is-breathe");
      showClip("laptop");
      return;
    }
    if (phase === "alert") {
      stopIdle();
      rig.classList.remove("is-floating");
      rig.classList.add("is-breathe");
      showClip("wave");
      return;
    }
    rig.classList.remove("is-breathe");
    if (entered || reduce) rig.classList.add("is-floating");
    runIdle();
  }

  function setPhase(next) {
    if (next === phase) return;
    phase = next;
    window.clearTimeout(momentTimer);
    momentTimer = 0;
    applyPhase();
  }

  function playMoment(name) {
    window.clearTimeout(momentTimer);
    stopIdle();
    showClip(name);
    momentTimer = window.setTimeout(() => {
      momentTimer = 0;
      applyPhase();
    }, 2800);
  }

  function replayAlert() {
    phase = "alert";
    window.clearTimeout(momentTimer);
    momentTimer = 0;
    rig.classList.remove("is-peek");
    void rig.offsetWidth;
    rig.classList.add("is-peek");
    applyPhase();
  }

  function setLabel(text) {
    rig.setAttribute("aria-label", text);
  }

  rig.addEventListener("animationend", (event) => {
    if (event.target !== rig || event.animationName !== "crawl-in") return;
    entered = true;
    if (phase === "idle") rig.classList.add("is-floating");
  });

  if (reduce) {
    entered = true;
    rig.classList.add("is-floating");
  }

  showClip("idle");
  runIdle();

  return { setPhase, playMoment, replayAlert, setLabel };
}
