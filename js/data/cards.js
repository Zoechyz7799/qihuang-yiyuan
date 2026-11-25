/**
 * Contest-derived 健身气功·易筋經 twelve-stance set.
 * Sequence / cues / checks from Zoechyz7799/qihuang-yiyuan courses.js + motion.js.
 */

/** @typedef {{ zh: string, en: string }} Localized */

/**
 * @typedef {object} StageSpec
 * @property {'prep'|'hold'|'breathe'|'rest'} phase
 * @property {string} clip
 * @property {string} check
 * @property {Localized} cue
 * @property {Localized} breath
 */

/**
 * @typedef {object} Segment
 * @property {string} id
 * @property {Localized} title
 * @property {Localized} short
 * @property {Localized} cue
 * @property {Localized[]} points
 * @property {Localized} source
 * @property {Localized} effect
 * @property {Localized} view
 * @property {Localized} coverage
 * @property {string} pose
 * @property {StageSpec[]} stages
 * @property {{ prep: number, hold: number, breathe: number, rest: number }} durationsMs
 */

/**
 * @typedef {object} MoveSet
 * @property {string} id
 * @property {Localized} title
 * @property {Segment[]} segments
 */

const SOURCE = Object.freeze({
  zh: "招式名稱參照國家體育總局公開的易筋經介紹，此處僅作舒展順序參考",
  en: "Form names follow the General Administration of Sport of China's public Yi Jin Jing introduction; used here only as a stretch-sequence reference.",
});

/** Contest timing ≈ move 2s + hold 3s per step; keep demo playable. */
const DUR = Object.freeze({ prep: 4000, hold: 5500, breathe: 5500, rest: 3500 });

/** Map contest skeleton pose names → Liu Kanshan guide clips. */
export const POSE_CLIP = Object.freeze({
  rest: "idle.webp",
  close: "idle.webp",
  prayer: "idle.webp",
  gather: "idle.webp",
  spread: "sway.webp",
  sky: "ball.webp",
  raise: "ball.webp",
  starL: "sway.webp",
  starR: "sway.webp",
  pullL: "laptop.webp",
  pullR: "laptop.webp",
  lungeL: "laptop.webp",
  lungeR: "laptop.webp",
  push: "wave.webp",
  knifeL: "ball.webp",
  knifeR: "ball.webp",
  squat: "sleep.webp",
  scoop: "sleep.webp",
  clawL: "sway.webp",
  clawR: "sway.webp",
  tigerL: "laptop.webp",
  tigerR: "laptop.webp",
  bowReady: "idle.webp",
  bow: "sleep.webp",
  tailL: "wave.webp",
  tailR: "wave.webp",
});

/**
 * @param {string} pose
 * @param {Localized} cue
 * @param {Localized} breath
 * @param {string} [check]
 */
function stage(phase, pose, cue, breath, check = pose) {
  return Object.freeze({
    phase,
    clip: POSE_CLIP[pose] || "idle.webp",
    check,
    cue: Object.freeze(cue),
    breath: Object.freeze(breath),
  });
}

/**
 * @param {object} spec
 * @returns {import('./cards.js').Segment}
 */
function move(spec) {
  const stages = Object.freeze(spec.stages);
  return Object.freeze({
    id: spec.id,
    title: Object.freeze(spec.title),
    short: Object.freeze(spec.short),
    cue: Object.freeze(spec.cue),
    points: Object.freeze(spec.points.map((p) => Object.freeze(p))),
    source: Object.freeze(SOURCE),
    effect: Object.freeze(spec.effect),
    view: Object.freeze(spec.view),
    coverage: Object.freeze(spec.coverage),
    pose: POSE_CLIP[spec.heroPose] || spec.heroPose || "idle.webp",
    stages,
    durationsMs: Object.freeze({ ...DUR }),
  });
}

/** Stage-synced breath: 起→吸氣, 停→自然呼吸, 收→呼氣 */
export const STAGE_BREATH = Object.freeze({
  rise: Object.freeze({ zh: "吸氣", en: "Inhale" }),
  hold: Object.freeze({ zh: "自然呼吸", en: "Breathe naturally" }),
  close: Object.freeze({ zh: "呼氣", en: "Exhale" }),
});

const BREATH = {
  natural: STAGE_BREATH.hold,
  in: STAGE_BREATH.rise,
  out: STAGE_BREATH.close,
};

/** @param {'prep'|'hold'|'breathe'|'rest'} phase */
export function breathForPhase(phase) {
  if (phase === "prep") return STAGE_BREATH.rise;
  if (phase === "rest") return STAGE_BREATH.close;
  return STAGE_BREATH.hold;
}

/** @type {MoveSet} */
export const YIJIN_SET = Object.freeze({
  id: "yijin",
  title: Object.freeze({
    zh: "易筋經十二勢",
    en: "Twelve Tendon-Changing Forms",
  }),
  shortTitle: Object.freeze({ zh: "易筋經", en: "Yi Jin Jing" }),
  completeCue: Object.freeze({
    zh: "十二勢皆練完，易筋經整套招式卡完成。",
    en: "All twelve forms practiced — the Yi Jin Jing set card is complete.",
  }),
  completeEffect: Object.freeze({
    zh: "完整易筋經一遍：安定、開展、延展與從容收勢。",
    en: "A full Yi Jin Jing pass: settle, open, lengthen, and close with ease.",
  }),
  segments: Object.freeze([
    move({
      id: "wei1",
      title: { zh: "韦驮献杵第一势", en: "Wei Tuo Presents the Pestle I" },
      short: { zh: "合掌静立", en: "Prayer stance" },
      cue: {
        zh: "合掌静立。从安静的站立开始，留意肩膀是否放松。",
        en: "Standing prayer palms. Begin quietly; soften the shoulders.",
      },
      heroPose: "prayer",
      view: { zh: "正对镜头", en: "Face the camera" },
      coverage: {
        zh: "观察合掌高度、手臂位置和身体中正；掌间用力不作判定。",
        en: "Watch prayer height, arms, and upright posture; palm pressure is not scored.",
      },
      points: [
        { zh: "合掌时腋下留出空间。", en: "Leave space under the arms when palms join." },
        { zh: "两手缓缓来到胸前，轻轻合掌。", en: "Bring both hands to the chest and join the palms lightly." },
        { zh: "保持肩膀放松，手掌轻合。", en: "Keep the shoulders soft with palms lightly joined." },
      ],
      effect: {
        zh: "安定心神，唤醒肩背，为整套练习做好预备。",
        en: "Settles the mind and prepares the upper back for the set.",
      },
      stages: [
        stage("prep", "rest", { zh: "松肩，回到舒适的起始位置", en: "Soften the shoulders; find a comfortable start" }, BREATH.natural, "rest"),
        stage("hold", "prayer", { zh: "两手缓缓来到胸前，轻轻合掌", en: "Bring the hands to the chest and join the palms" }, BREATH.in, "prayer"),
        stage("breathe", "prayer", { zh: "保持肩膀放松，手掌轻合", en: "Keep the shoulders soft; palms stay lightly joined" }, BREATH.out, "prayer"),
        stage("rest", "rest", { zh: "松肩，回到舒适的起始位置", en: "Soften the shoulders; return to start" }, BREATH.natural, "rest"),
      ],
    }),
    move({
      id: "wei2",
      title: { zh: "韦驮献杵第二势", en: "Wei Tuo Presents the Pestle II" },
      short: { zh: "展臂平撑", en: "Arms open level" },
      cue: {
        zh: "展臂平撑。展开双臂，感受身体两侧的空间。",
        en: "Open both arms level and feel the space at your sides.",
      },
      heroPose: "spread",
      view: { zh: "正对镜头", en: "Face the camera" },
      coverage: {
        zh: "观察两臂高度、伸展与身体稳定；掌心朝向不作判定。",
        en: "Watch arm height, reach, and stability; palm facing is not scored.",
      },
      points: [
        { zh: "双臂与肩大致同高，避免耸肩。", en: "Arms near shoulder height; avoid shrugging." },
        { zh: "双臂慢慢向两侧展开。", en: "Open the arms slowly to both sides." },
        { zh: "保持两侧舒展，缓缓收回双手。", en: "Keep both sides open, then draw the hands back." },
      ],
      effect: {
        zh: "打开胸廓与肩带，缓解久坐缩肩。",
        en: "Opens the chest and shoulder girdle after sitting.",
      },
      stages: [
        stage("prep", "prayer", { zh: "两手回到胸前", en: "Return the hands to the chest" }, BREATH.natural, "prayer"),
        stage("hold", "spread", { zh: "双臂慢慢向两侧展开", en: "Open both arms slowly to the sides" }, BREATH.in, "spread"),
        stage("breathe", "spread", { zh: "保持两侧舒展，手腕与肩同高", en: "Keep both sides open; wrists near shoulder height" }, BREATH.out, "spread"),
        stage("rest", "prayer", { zh: "缓缓收回双手", en: "Draw the hands back slowly" }, BREATH.natural, "prayer"),
      ],
    }),
    move({
      id: "wei3",
      title: { zh: "韦驮献杵第三势", en: "Wei Tuo Presents the Pestle III" },
      short: { zh: "双掌上托", en: "Palms lift skyward" },
      cue: {
        zh: "双掌上托。托举时留意向上伸展，收回时体会放松。",
        en: "Lift both palms overhead; notice the lift, then the soft return.",
      },
      heroPose: "sky",
      view: { zh: "正对镜头", en: "Face the camera" },
      coverage: {
        zh: "观察托举高度、肘角和身体稳定；提踵与掌心朝向不作判定。",
        en: "Watch lift height, elbows, and stability; heel-raise is not scored.",
      },
      points: [
        { zh: "站姿上托可轻提脚跟，先保持平衡。", en: "Heels may lift lightly if balance allows." },
        { zh: "双掌慢慢举到头顶上方。", en: "Raise both palms above the crown." },
        { zh: "脚跟轻落，双手缓缓收回。", en: "Lower the heels and draw the hands back." },
      ],
      effect: {
        zh: "延展侧腰与肩臂，提升呼吸空间。",
        en: "Lengthens the side body and widens the breath.",
      },
      stages: [
        stage("prep", "prayer", { zh: "双手准备向上托举", en: "Prepare to lift both palms" }, BREATH.natural, "prayer"),
        stage("hold", "sky", { zh: "双掌慢慢举到头顶上方", en: "Raise both palms above the head" }, BREATH.in, "sky"),
        stage("breathe", "sky", { zh: "舒适伸展，站姿可轻提脚跟", en: "Stretch comfortably; heels may lift lightly" }, BREATH.natural, "sky"),
        stage("rest", "prayer", { zh: "脚跟轻落，双手缓缓收回", en: "Lower the heels and draw the hands back" }, BREATH.out, "prayer"),
      ],
    }),
    move({
      id: "star",
      title: { zh: "摘星换斗势", en: "Plucking Stars / Moving the Dipper" },
      short: { zh: "左右摘星", en: "Alternate star reach" },
      cue: {
        zh: "左右摘星。左右交替时，观察两边动作节奏是否一致。",
        en: "Alternate star reaches; match left and right rhythm.",
      },
      heroPose: "starL",
      view: { zh: "正面略转身，双手留在画面内", en: "Face forward with a slight turn; keep both hands in frame" },
      coverage: {
        zh: "观察左右手位置与躯干稳定；背侧手需清晰可见。",
        en: "Watch both hands and a steady trunk; the rear hand must stay visible.",
      },
      points: [
        { zh: "轻缓转动，抬手时避免挺腹。", en: "Turn gently; avoid thrusting the belly when raising." },
        { zh: "一手向上伸展，另一手轻放身后。", en: "One arm reaches up; the other rests lightly behind." },
        { zh: "换另一侧向上伸展，再缓缓回到正中。", en: "Switch sides, then return slowly to center." },
      ],
      effect: {
        zh: "协调左右侧链，活动肩胸与脊柱旋转。",
        en: "Balances both sides and mobilizes shoulders and spine.",
      },
      stages: [
        stage("prep", "starL", { zh: "一手向上伸展，另一手轻放身后", en: "One arm reaches up; the other rests behind" }, BREATH.in, "starL"),
        stage("hold", "close", { zh: "放松回正，准备换侧", en: "Release to center; prepare to switch" }, BREATH.out, "close"),
        stage("breathe", "starR", { zh: "换另一侧向上伸展", en: "Reach upward on the other side" }, BREATH.in, "starR"),
        stage("rest", "close", { zh: "缓缓回到正中", en: "Return slowly to center" }, BREATH.out, "close"),
      ],
    }),
    move({
      id: "pull",
      title: { zh: "倒拽九牛尾势", en: "Pulling Nine Oxen by Their Tails" },
      short: { zh: "前后牵引", en: "Front–back traction" },
      cue: {
        zh: "前后牵引。名字有力量感，练习时仍需要松柔。",
        en: "Front–back traction: keep the power soft.",
      },
      heroPose: "pullL",
      view: { zh: "斜侧面对镜头，前后腿都要看清", en: "Angled side view; keep both legs visible" },
      coverage: {
        zh: "观察前后腿角度、牵引手臂和躯干；旋拧用力不作判定。",
        en: "Watch lunge angles, traction arms, and trunk; twisting force is not scored.",
      },
      points: [
        { zh: "弓步前后稳定，牵引时保留余力。", en: "Keep the bow stance steady; leave reserve in the pull." },
        { zh: "一脚前出成舒适弓步，双臂前后牵引。", en: "Step into a comfortable bow stance; draw the arms front and back." },
        { zh: "换侧弓步，缓缓转动双臂。", en: "Switch sides and rotate the arms slowly." },
      ],
      effect: {
        zh: "稳定下肢，疏通肩臂前后力线。",
        en: "Steadies the legs and clears front–back arm lines.",
      },
      stages: [
        stage("prep", "pullL", { zh: "一脚前出成舒适弓步，双臂前后牵引", en: "Bow stance with front–back arm traction" }, BREATH.out, "pullL"),
        stage("hold", "rest", { zh: "松肩，回到舒适的起始位置", en: "Soften the shoulders; return to start" }, BREATH.natural, "rest"),
        stage("breathe", "pullR", { zh: "换侧弓步，缓缓转动双臂", en: "Switch sides; rotate the arms slowly" }, BREATH.out, "pullR"),
        stage("rest", "rest", { zh: "松肩回正", en: "Soften and return to center" }, BREATH.natural, "rest"),
      ],
    }),
    move({
      id: "push",
      title: { zh: "出爪亮翅势", en: "Showing Talons and Spreading Wings" },
      short: { zh: "舒展推掌", en: "Palm push" },
      cue: {
        zh: "舒展推掌。向前推出，再缓缓收回。",
        en: "Push the palms forward, then draw them back.",
      },
      heroPose: "push",
      view: { zh: "斜侧面对镜头，展示双掌前伸", en: "Angled side view to show the forward push" },
      coverage: {
        zh: "结合三维关键点观察前伸深度与手肘；呼吸和用力不作判定。",
        en: "Watch reach depth and elbows; breath force is not scored.",
      },
      points: [
        { zh: "推掌时松肩，避免屏气用力。", en: "Soften the shoulders; do not hold the breath." },
        { zh: "双掌缓缓向前推开。", en: "Push both palms forward slowly." },
        { zh: "保持舒适的前伸，再缓缓收回双掌。", en: "Hold a comfortable reach, then retract." },
      ],
      effect: {
        zh: "伸展胸背，释放肩颈紧绷。",
        en: "Opens the chest and eases neck tension.",
      },
      stages: [
        stage("prep", "prayer", { zh: "双手来到胸前，松肩", en: "Hands to the chest; soften the shoulders" }, BREATH.in, "prayer"),
        stage("hold", "push", { zh: "双掌缓缓向前推开", en: "Push both palms forward slowly" }, BREATH.out, "push"),
        stage("breathe", "push", { zh: "保持舒适的前伸", en: "Stay in a comfortable forward reach" }, BREATH.natural, "push"),
        stage("rest", "prayer", { zh: "缓缓收回双掌", en: "Draw the palms back slowly" }, BREATH.in, "prayer"),
      ],
    }),
    move({
      id: "knife",
      title: { zh: "九鬼拔马刀势", en: "Nine Ghosts Drawing Swords" },
      short: { zh: "绕臂展肩", en: "Arm circle, open shoulder" },
      cue: {
        zh: "绕臂展肩。先记住路线，再体会手臂与躯干的配合。",
        en: "Circle the arms to open the shoulders; learn the path first.",
      },
      heroPose: "knifeL",
      view: { zh: "斜侧面对镜头，让头后与背侧手可见", en: "Angled view so the rear hand stays visible" },
      coverage: {
        zh: "观察绕臂位置、背侧手与躯干；遮挡时暂停判定。",
        en: "Watch the arm arc, rear hand, and trunk; pause if occluded.",
      },
      points: [
        { zh: "手臂到舒适位置即可，转头幅度放小。", en: "Stay in a comfortable range; keep the head turn small." },
        { zh: "一手绕到头后，另一手轻贴背部。", en: "One arm arcs behind the head; the other rests on the back." },
        { zh: "换侧缓缓绕臂，轻轻放下双臂。", en: "Switch sides, then lower both arms." },
      ],
      effect: {
        zh: "活动肩袖与上背，改善僵硬转体。",
        en: "Mobilizes the rotator cuff and upper back.",
      },
      stages: [
        stage("prep", "knifeL", { zh: "一手绕到头后，另一手轻贴背部", en: "One arm behind the head; the other on the back" }, BREATH.in, "knifeL"),
        stage("hold", "close", { zh: "松肩回正，准备换侧", en: "Soften to center; prepare to switch" }, BREATH.out, "close"),
        stage("breathe", "knifeR", { zh: "换侧缓缓绕臂", en: "Circle the arms on the other side" }, BREATH.in, "knifeR"),
        stage("rest", "close", { zh: "轻轻放下双臂", en: "Lower both arms gently" }, BREATH.out, "close"),
      ],
    }),
    move({
      id: "squat",
      title: { zh: "三盘落地势", en: "Three Plates Falling to the Ground" },
      short: { zh: "起落有序", en: "Rise and sink" },
      cue: {
        zh: "起落有序。升起与落下都有节奏，先找适合自己的蹲起幅度。",
        en: "Rise and sink with rhythm; choose a steady squat depth.",
      },
      heroPose: "squat",
      view: { zh: "正对镜头，全身入镜", en: "Face the camera; full body in frame" },
      coverage: {
        zh: "观察开步、屈膝、下按和躯干；发声不作判定。",
        en: "Watch stance width, knees, palm press, and trunk.",
      },
      points: [
        { zh: "膝盖沿脚尖方向，保持可控的蹲起幅度。", en: "Knees track over the toes; keep depth controllable." },
        { zh: "缓缓屈膝，双掌下按。", en: "Bend the knees slowly as palms press down." },
        { zh: "稳定重心，缓缓起身，双手收回。", en: "Keep the center steady, then rise and draw the hands in." },
      ],
      effect: {
        zh: "强化下肢与核心，培养可控的起落节奏。",
        en: "Strengthens legs and core with controlled rise and sink.",
      },
      stages: [
        stage("prep", "spread", { zh: "双脚适当分开，双臂展开", en: "Feet apart; arms open" }, BREATH.in, "spread"),
        stage("hold", "squat", { zh: "缓缓屈膝，双掌下按", en: "Bend the knees; palms press down" }, BREATH.out, "squat"),
        stage("breathe", "squat", { zh: "稳定重心，保持舒适幅度", en: "Steady the center; stay in a comfortable depth" }, BREATH.natural, "squat"),
        stage("rest", "close", { zh: "缓缓起身，双手收回", en: "Rise slowly; draw the hands in" }, BREATH.in, "close"),
      ],
    }),
    move({
      id: "claw",
      title: { zh: "青龙探爪势", en: "Black Dragon Searching for Claws" },
      short: { zh: "转身探掌", en: "Turn and reach" },
      cue: {
        zh: "转身探掌。用手臂路径连接转身和回正。",
        en: "Turn and reach; link the turn with the return.",
      },
      heroPose: "clawL",
      view: { zh: "斜侧面对镜头，展示转体探掌", en: "Angled view to show the turning reach" },
      coverage: {
        zh: "观察探掌、转体和膝部；手指形状不作判定。",
        en: "Watch the reach, turn, and knees; finger shape is not scored.",
      },
      points: [
        { zh: "转体与前俯缓慢进行，重心保持稳定。", en: "Turn and fold slowly; keep the center steady." },
        { zh: "向一侧转体探掌，再缓缓向下划弧。", en: "Turn and reach, then arc downward." },
        { zh: "换侧转体探掌，松肩回正。", en: "Repeat on the other side; soften to center." },
      ],
      effect: {
        zh: "活动腰胯旋转，疏通侧身与肩臂。",
        en: "Mobilizes waist rotation and the side body.",
      },
      stages: [
        stage("prep", "clawL", { zh: "向一侧转体探掌，再缓缓向下划弧", en: "Turn, reach, and arc downward" }, BREATH.out, "clawL"),
        stage("hold", "close", { zh: "缓缓回正", en: "Return slowly to center" }, BREATH.in, "close"),
        stage("breathe", "clawR", { zh: "换侧转体探掌", en: "Turn and reach on the other side" }, BREATH.out, "clawR"),
        stage("rest", "close", { zh: "松肩回正", en: "Soften the shoulders back to center" }, BREATH.in, "close"),
      ],
    }),
    move({
      id: "tiger",
      title: { zh: "卧虎扑食势", en: "Tiger Springing on Its Prey" },
      short: { zh: "弓步俯身", en: "Bow-stance fold" },
      cue: {
        zh: "弓步俯身。前后重心变化更明显，先看清路线。",
        en: "Bow-stance fold; learn the weight shift before going deep.",
      },
      heroPose: "tigerL",
      view: { zh: "斜侧面对镜头，前后脚与双手入镜", en: "Angled view; both feet and hands in frame" },
      coverage: {
        zh: "观察弓步、俯身和双手下探；手指支撑力不作判定。",
        en: "Watch the lunge, fold, and downward reach.",
      },
      points: [
        { zh: "前方留出空间，俯身幅度以稳定舒适为准。", en: "Leave space in front; fold only as far as stays steady." },
        { zh: "一脚前出，缓缓俯身向前下方伸手。", en: "Step forward and reach toward the front corner." },
        { zh: "换侧弓步，轻缓前伸。", en: "Switch sides and reach forward lightly." },
      ],
      effect: {
        zh: "锻炼前后重心转换，拉伸后链与肩。",
        en: "Trains front–back weight shift; lengthens the back line.",
      },
      stages: [
        stage("prep", "tigerL", { zh: "一脚前出，缓缓俯身向前下方伸手", en: "Step forward and fold toward the front corner" }, BREATH.out, "tigerL"),
        stage("hold", "rest", { zh: "松肩回到起始", en: "Soften and return to start" }, BREATH.natural, "rest"),
        stage("breathe", "tigerR", { zh: "换侧弓步，轻缓前伸", en: "Switch sides; reach forward lightly" }, BREATH.out, "tigerR"),
        stage("rest", "rest", { zh: "松肩回正", en: "Soften back to center" }, BREATH.natural, "rest"),
      ],
    }),
    move({
      id: "bow",
      title: { zh: "打躬势", en: "Bowing Down" },
      short: { zh: "缓缓前屈", en: "Slow forward fold" },
      cue: {
        zh: "缓缓前屈。把一次前屈拆成缓慢的小过程，起身也留出时间。",
        en: "Fold forward in slow pieces; rise with the same patience.",
      },
      heroPose: "bow",
      view: { zh: "斜侧面对镜头，展示前屈幅度", en: "Angled view to show the fold depth" },
      coverage: {
        zh: "观察前屈、手臂位置与膝部；脊柱逐节顺序不作判定。",
        en: "Watch the fold, arms, and knees; vertebra-by-vertebra order is not scored.",
      },
      points: [
        { zh: "按舒适范围前屈，起身时保持缓慢。", en: "Fold only as far as feels easeful; rise slowly." },
        { zh: "上体缓慢前屈，双肘自然展开。", en: "Fold the torso slowly with soft elbows." },
        { zh: "停留在舒适位置，慢慢起身回正。", en: "Pause, then rise back to standing." },
      ],
      effect: {
        zh: "放松腰背与后侧肌群，带回安静收束。",
        en: "Releases the back body and returns to quiet close.",
      },
      stages: [
        stage("prep", "bowReady", { zh: "双手轻放头后，准备前屈", en: "Hands lightly behind the head" }, BREATH.natural, "bowReady"),
        stage("hold", "bow", { zh: "上体缓慢前屈，双肘自然展开", en: "Fold forward slowly; elbows soft" }, BREATH.out, "bow"),
        stage("breathe", "bow", { zh: "停留在舒适位置，保持呼吸", en: "Pause in a comfortable fold; keep breathing" }, BREATH.natural, "bow"),
        stage("rest", "prayer", { zh: "慢慢起身回正", en: "Rise slowly back to center" }, BREATH.in, "prayer"),
      ],
    }),
    move({
      id: "tail",
      title: { zh: "掉尾势", en: "Swinging the Tail" },
      short: { zh: "轻缓摆转", en: "Gentle side sway" },
      cue: {
        zh: "轻缓摆转。在整套接近结束时，继续把动作做得从容。",
        en: "Gentle side swings as the set closes — stay unhurried.",
      },
      heroPose: "tailL",
      view: { zh: "斜侧面对镜头，双手与双脚留在画面中", en: "Angled view; hands and feet in frame" },
      coverage: {
        zh: "观察前屈、双手位置与摆转；深层脊柱活动不作判定。",
        en: "Watch the fold, hand placement, and sway.",
      },
      points: [
        { zh: "俯身和摆动幅度放小，双手位置尽量稳定。", en: "Keep the fold and sway small; steady the hands." },
        { zh: "缓缓前俯，双手下垂，轻向一侧摆转。", en: "Fold slightly, arms hanging, sway to one side." },
        { zh: "轻向另一侧摆转，慢慢起身，准备收势。", en: "Sway the other way, then rise to close." },
      ],
      effect: {
        zh: "松解腰骶，平稳过渡到收势。",
        en: "Softens the low back and eases into the closing.",
      },
      stages: [
        stage("prep", "tailL", { zh: "缓缓前俯，双手下垂，轻向一侧摆转", en: "Fold slightly and sway to one side" }, BREATH.natural, "tailL"),
        stage("hold", "close", { zh: "慢慢回正", en: "Return slowly to center" }, BREATH.natural, "close"),
        stage("breathe", "tailR", { zh: "缓缓前俯，轻向另一侧摆转", en: "Fold slightly and sway the other way" }, BREATH.natural, "tailR"),
        stage("rest", "close", { zh: "慢慢起身，准备收势", en: "Rise slowly and prepare to close" }, BREATH.natural, "close"),
      ],
    }),
  ]),
});


function wushuMove(spec) {
  const rise = STAGE_BREATH.rise;
  const hold = STAGE_BREATH.hold;
  const close = STAGE_BREATH.close;
  const stages = Object.freeze([
    stage("prep", "rest", spec.riseCue, rise, "rest"),
    stage("hold", spec.heroPose, spec.holdCue, hold, spec.check || "rest"),
    stage("breathe", spec.heroPose, spec.holdCue, hold, spec.check || "rest"),
    stage("rest", "rest", spec.closeCue, close, "rest"),
  ]);
  return Object.freeze({
    id: spec.id,
    title: Object.freeze(spec.title),
    short: Object.freeze(spec.short),
    cue: Object.freeze(spec.cue),
    points: Object.freeze(spec.points.map((p) => Object.freeze(p))),
    source: Object.freeze(spec.source),
    effect: Object.freeze(spec.effect),
    view: Object.freeze(spec.view || { zh: "正對鏡頭", en: "Face the camera" }),
    coverage: Object.freeze(spec.coverage || { zh: "跟著看山圖示節奏練習。", en: "Follow Kanshan's guide rhythm." }),
    pose: POSE_CLIP[spec.heroPose] || spec.pose || "idle.webp",
    stages,
    durationsMs: Object.freeze(spec.durationsMs || { prep: 3000, hold: 5000, breathe: 6000, rest: 2000 }),
  });
}

/** Classic three-form stretch set (kept selectable alongside 易筋經). */
export const WUSHU_THREE_SET = Object.freeze({
  id: "wushu-three",
  title: Object.freeze({ zh: "武術三式", en: "Wushu Three" }),
  shortTitle: Object.freeze({ zh: "三式", en: "Three Forms" }),
  completeCue: Object.freeze({
    zh: "三式皆練完，整套招式卡完成。",
    en: "All three techniques practiced — the set card is complete.",
  }),
  completeEffect: Object.freeze({
    zh: "穩定下盤、開肩、釋放久坐張力。",
    en: "Steadies the base, opens the shoulders, eases desk tension.",
  }),
  segments: Object.freeze([
    wushuMove({
      id: "ready-fists",
      title: { zh: "并步對拳", en: "Ready Stance & Twin Fists" },
      short: { zh: "對拳預備", en: "Ready fists" },
      cue: {
        zh: "雙腳並立與肩同寬，雙手握拳收於腰間，目視前方。",
        en: "Feet under the shoulders; fists at the waist; eyes forward.",
      },
      riseCue: { zh: "鬆肩，雙腳站穩", en: "Soften the shoulders; plant the feet" },
      holdCue: { zh: "雙手握拳收於腰間，目視前方", en: "Fists at the waist; eyes forward" },
      closeCue: { zh: "輕輕放鬆雙手", en: "Ease the hands" },
      heroPose: "rest",
      check: "rest",
      pose: "idle.webp",
      points: [
        { zh: "雙腳並立與肩同寬，雙手握拳收於腰間，目視前方。", en: "Feet under the shoulders; fists at the waist; eyes forward." },
      ],
      source: { zh: "長拳基本功", en: "Changquan fundamentals" },
      effect: { zh: "穩定下盤，喚醒肩背。", en: "Steadies the base and wakes the shoulders and back." },
      durationsMs: { prep: 3000, hold: 5000, breathe: 6000, rest: 2000 },
    }),
    wushuMove({
      id: "heroic-block",
      title: { zh: "馬步架掌", en: "Heroic Overhead Block" },
      short: { zh: "馬步架掌", en: "Horse-stance block" },
      cue: {
        zh: "馬步站穩，一手上架護頭，一手下按，核心收緊。",
        en: "Horse stance; one palm guards overhead, the other presses down.",
      },
      riseCue: { zh: "開步成馬步，準備架掌", en: "Open into horse stance" },
      holdCue: { zh: "一手上架護頭，一手下按", en: "One palm overhead, one pressing down" },
      closeCue: { zh: "緩緩收回雙手", en: "Draw the hands back slowly" },
      heroPose: "sky",
      check: "sky",
      pose: "laptop.webp",
      points: [
        { zh: "馬步站穩，一手上架護頭，一手下按，核心收緊。", en: "Horse stance; one palm guards overhead, the other presses down." },
      ],
      source: { zh: "長拳/少林基本功", en: "Changquan / Shaolin basics" },
      effect: { zh: "開肩、強化核心穩定。", en: "Opens the shoulders and strengthens core stability." },
      durationsMs: { prep: 3000, hold: 6000, breathe: 6000, rest: 2000 },
    }),
    wushuMove({
      id: "bow-push",
      title: { zh: "弓步推掌", en: "Bow-Stance Palm Push" },
      short: { zh: "弓步推掌", en: "Bow-stance push" },
      cue: {
        zh: "前弓後蹬，雙手向前推掌，腰腹發力。",
        en: "Front knee bent, rear leg drives; palms push forward.",
      },
      riseCue: { zh: "前腳跨出，準備推掌", en: "Step forward; prepare to push" },
      holdCue: { zh: "雙手向前推掌，腰腹發力", en: "Push both palms forward from the waist" },
      closeCue: { zh: "收回雙掌，站穩", en: "Draw the palms back; stand steady" },
      heroPose: "push",
      check: "push",
      pose: "sway.webp",
      points: [
        { zh: "前弓後蹬，雙手向前推掌，腰腹發力。", en: "Front knee bent, rear leg drives; palms push forward." },
      ],
      source: { zh: "長拳/太極推手基礎", en: "Changquan / Taiji push-hands base" },
      effect: { zh: "拉伸髖部與肩，釋放久坐張力。", en: "Stretches hips and shoulders; eases desk tension." },
      durationsMs: { prep: 3000, hold: 5000, breathe: 5000, rest: 2000 },
    }),
  ]),
});

/** @deprecated Alias kept for older tests; prefer YIJIN_SET / getSet(). */
export const SAMPLE_SET = YIJIN_SET;

/** Optional legacy id → yijin. */
export const YIJINJING_12_ALIAS = "yijinjing-12";

export const SETS = Object.freeze({
  yijin: YIJIN_SET,
  "wushu-three": WUSHU_THREE_SET,
});

export const SET_ORDER = Object.freeze(["yijin", "wushu-three"]);

/** @param {string} id */
export function getSet(id) {
  if (id === YIJINJING_12_ALIAS) return YIJIN_SET;
  return SETS[id] || YIJIN_SET;
}

/**
 * 默認選「武術三式」：招式卡冊只對應這一套，若默認停在易筋經，
 * 使用者照正常流程練完會一張卡都拿不到（真實發生過的坑）。
 */
export const DEFAULT_SET_ID = "wushu-three";

export function loadSelectedSetId() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SET_ID;
    const parsed = JSON.parse(raw);
    const id = parsed?.selectedSetId;
    if (id === YIJINJING_12_ALIAS) return "yijin";
    if (SETS[id]) return id;
  } catch {
    /* private mode */
  }
  return DEFAULT_SET_ID;
}

/** @param {string} id */
export function saveSelectedSetId(id) {
  const next = SETS[id] ? id : DEFAULT_SET_ID;
  try {
    let prev = {};
    try {
      prev = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") || {};
    } catch {
      prev = {};
    }
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ ...prev, selectedSetId: next }),
    );
  } catch {
    /* private mode */
  }
  return next;
}

/** @deprecated Prefer segment.stages; kept for older callers. */
export const STAGE_POSES = Object.freeze({
  prep: "idle.webp",
  hold: "laptop.webp",
  breathe: "sway.webp",
  rest: "wave.webp",
});

export const PROGRESS_KEY = "qimai-progress";
export const SETTINGS_KEY = "qimai-settings";

/**
 * @param {Segment} segment
 * @param {string} phase
 */
export function stageForPhase(segment, phase) {
  return segment.stages?.find((s) => s.phase === phase) || null;
}

/**
 * @typedef {object} ProgressStore
 * @property {Record<string, boolean>} completedSegments
 * @property {Record<string, { fragment: boolean, complete: boolean, earnedAt?: number }>} cards
 * @property {{ date: string, durationMs: number, interrupts: number }} today
 */

/** @returns {ProgressStore} */
export function emptyProgress() {
  return {
    completedSegments: {},
    cards: {},
    today: { date: todayKey(), durationMs: 0, interrupts: 0 },
  };
}

export function todayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** @returns {ProgressStore} */
export function loadProgress() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return emptyProgress();
    const parsed = JSON.parse(raw);
    const base = emptyProgress();
    const today = parsed?.today?.date === todayKey() ? parsed.today : base.today;
    return {
      completedSegments: { ...base.completedSegments, ...(parsed.completedSegments || {}) },
      cards: { ...base.cards, ...(parsed.cards || {}) },
      today,
    };
  } catch {
    return emptyProgress();
  }
}

/** @param {ProgressStore} progress */
export function saveProgress(progress) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    /* private mode */
  }
}

export function fragmentCount(progress, set) {
  return set.segments.filter((seg) => progress.completedSegments[seg.id]).length;
}

export function isSetComplete(progress, set) {
  return set.segments.every((seg) => progress.completedSegments[seg.id]);
}

/**
 * @param {ProgressStore} progress
 * @param {MoveSet} set
 * @param {string[]} segmentIds
 * @param {{ durationMs: number, interrupts: number, finished: boolean }} session
 */
export function applySession(progress, set, segmentIds, session) {
  const next = {
    completedSegments: { ...progress.completedSegments },
    cards: { ...progress.cards },
    today: { ...progress.today },
  };

  if (next.today.date !== todayKey()) {
    next.today = { date: todayKey(), durationMs: 0, interrupts: 0 };
  }
  next.today.durationMs += Math.max(0, session.durationMs || 0);
  next.today.interrupts += Math.max(0, session.interrupts || 0);

  for (const id of segmentIds) {
    next.completedSegments[id] = true;
    next.cards[`${set.id}:${id}`] = {
      fragment: true,
      complete: false,
      earnedAt: Date.now(),
    };
  }

  if (isSetComplete(next, set)) {
    next.cards[`${set.id}:SET`] = {
      fragment: false,
      complete: true,
      earnedAt: Date.now(),
    };
  }

  return next;
}

/**
 * @param {MoveSet} set
 * @param {string} segmentId
 * @param {'zh'|'en'} lang
 * @param {{ fragment: boolean, complete: boolean }} cardState
 * @param {ProgressStore} [progress]
 */
export function buildCardPayload(set, segmentId, lang, cardState, progress) {
  const segment = set.segments.find((s) => s.id === segmentId);
  const isSet = segmentId === "SET";
  const total = set.segments.length;
  const earned = progress ? fragmentCount(progress, set) : cardState.complete ? total : 1;
  const title = isSet
    ? set.title[lang] || set.title.zh
    : segment?.title[lang] || segment?.title.zh || segmentId;
  const cue = isSet
    ? set.completeCue?.[lang] || set.completeCue?.zh || set.title[lang] || set.title.zh
    : segment?.cue[lang] || segment?.cue.zh || "";
  const points = isSet
    ? set.segments.map((s) => s.title[lang] || s.title.zh)
    : (segment?.points || []).map((p) => p[lang] || p.zh);
  const source = isSet
    ? SOURCE[lang] || SOURCE.zh
    : segment?.source?.[lang] || segment?.source?.zh || SOURCE[lang] || SOURCE.zh;
  const effect = isSet
    ? set.completeEffect?.[lang] || set.completeEffect?.zh || ""
    : segment?.effect[lang] || segment?.effect.zh || "";
  const image = isSet ? "wave.webp" : segment?.pose || "idle.webp";
  const kind = isSet && cardState.complete ? "complete" : "fragment";
  const kindLabel =
    kind === "complete"
      ? lang === "en"
        ? "Complete card"
        : "完整卡"
      : lang === "en"
        ? `Fragment ${Math.max(1, Math.min(earned, total))}/${total}`
        : `碎片卡 ${Math.max(1, Math.min(earned, total))}/${total}`;

  return {
    setId: set.id,
    segmentId,
    title,
    cue,
    points,
    source,
    effect,
    image,
    kind,
    kindLabel,
    fragmentIndex: Math.max(1, Math.min(earned, total)),
    fragmentTotal: total,
    lang,
  };
}

/**
 * @param {ProgressStore} progress
 * @param {MoveSet} set
 * @param {'zh'|'en'} lang
 */
export function listCollectedCards(progress, set, lang) {
  const items = [];
  for (const seg of set.segments) {
    const key = `${set.id}:${seg.id}`;
    const state = progress.cards[key];
    if (!state) continue;
    items.push(buildCardPayload(set, seg.id, lang, state, progress));
  }
  const setKey = `${set.id}:SET`;
  if (progress.cards[setKey]?.complete) {
    items.push(buildCardPayload(set, "SET", lang, progress.cards[setKey], progress));
  }
  return items;
}

/**
 * @param {ProgressStore} progress
 * @param {MoveSet} set
 * @param {string[]} segmentIds
 * @param {'zh'|'en'} lang
 */
export function endCardForSession(progress, set, segmentIds, lang) {
  if (isSetComplete(progress, set) && progress.cards[`${set.id}:SET`]?.complete) {
    return buildCardPayload(set, "SET", lang, progress.cards[`${set.id}:SET`], progress);
  }
  const lastId = segmentIds.at(-1);
  if (!lastId) return null;
  const state = progress.cards[`${set.id}:${lastId}`] || { fragment: true, complete: false };
  return buildCardPayload(set, lastId, lang, state, progress);
}

export function poseUrl(file) {
  return `./public/poses/${file}`;
}

/* =====================================================================
 * 招式卡與碎片合成系統 · 標準結構化配置
 * ---------------------------------------------------------------------
 * 這一區是「美工 / 內容配置位」：imageUrl 指向 public/cards/ 的水墨卡面，
 * imageFallbackUrl 指向同名 SVG 佔位圖（PNG 缺檔時自動退回）。
 * 之後美工直接換掉同名檔案即可，不需要改任何程式碼。
 * 發放規則完全確定性（見 js/core/cardFSM.js），沒有隨機抽卡、沒有虛擬金幣；
 * 「翻卡入冊」只是解鎖儀式，不改變發放條件。
 * ===================================================================== */

export const CARD_STORAGE_KEY = "qimai-card-collection";
export const WUSHU_CARD_SET_ID = "wushu-three";
export const MASTER_CARD_ID = "wushu-master";
export const CARD_TOTAL = 3;

/**
 * @typedef {object} CardSpec
 * @property {string} id
 * @property {'fragment'|'complete'} type
 * @property {number|null} fragmentIndex 1/2/3；完整卡為 null（由 3 張碎片合成，見 requiredFragments）
 * @property {string|null} segmentId
 * @property {string} titleZh
 * @property {string} titleEn
 * @property {string} imageUrl
 * @property {string} [imageFallbackUrl]
 * @property {string[]} keyPointsZh
 * @property {string[]} keyPointsEn
 * @property {string} originZh
 * @property {string} originEn
 * @property {string} functionZh
 * @property {string} functionEn
 * @property {string} musclesZh
 * @property {string} musclesEn
 * @property {string} benefitZh
 * @property {string} benefitEn
 */

/** @type {CardSpec[]} */
export const CARD_CATALOG = Object.freeze([
  Object.freeze({
    id: "wushu-fragment-1",
    type: "fragment",
    fragmentIndex: 1,
    segmentId: "ready-fists",
    titleZh: "并步對拳",
    titleEn: "Ready Stance & Twin Fists",
    imageUrl: "./public/cards/wushu-fragment-1.png",
    imageFallbackUrl: "./public/cards/wushu-fragment-1.svg",
    keyPointsZh: ["雙腳並立與肩同寬，膝蓋不鎖死。", "雙手握拳收於腰間，肩肘自然下沉。", "目視前方，先站穩再起勢。"],
    keyPointsEn: ["Feet under the shoulders; keep the knees soft.", "Fists rest at the waist; shoulders and elbows stay loose.", "Look ahead and settle your stance before moving."],
    originZh: "長拳基本功・預備式；傳統套路多以「並步對拳」起勢，先正身、再運氣。",
    originEn: "Changquan fundamentals: the ready stance opens a form by settling posture before movement.",
    functionZh: "讓肩頸從聳起的位置慢慢放下來，先找回身體中線與呼吸節奏，作為一套動作的起點。",
    functionEn: "Settles raised shoulders, re-finds your midline and breathing rhythm, and marks the starting point of the set.",
    musclesZh: "斜方肌上束、肩胛提肌、頸深屈肌；以溫和放鬆與本體感覺為主，不是肌力訓練。",
    musclesEn: "Upper trapezius, levator scapulae and deep neck flexors — gentle release and body awareness, not strength training.",
    benefitZh: "久坐後先找回中線與呼吸節奏，讓肩頸從聳起的位置慢慢放下來；屬舒展參考，非醫療建議。",
    benefitEn: "A gentle way to re-find your midline after sitting and let raised shoulders settle. Stretch reference only, not medical advice.",
  }),
  Object.freeze({
    id: "wushu-fragment-2",
    type: "fragment",
    fragmentIndex: 2,
    segmentId: "heroic-block",
    titleZh: "馬步架掌",
    titleEn: "Heroic Overhead Block",
    imageUrl: "./public/cards/wushu-fragment-2.png",
    imageFallbackUrl: "./public/cards/wushu-fragment-2.svg",
    keyPointsZh: ["開步成馬步，重心落在兩腳之間。", "一手上架護頭，另一手向下按掌。", "核心輕收，肩膀不跟著聳起。"],
    keyPointsEn: ["Open into a horse stance, weight centred between both feet.", "One palm guards overhead while the other presses down.", "Lightly engage the core without shrugging the shoulders."],
    originZh: "長拳／少林基本功・架掌與馬步的組合，講究「上架下按、上下相合」。",
    originEn: "Changquan / Shaolin basics: an overhead block paired with horse stance, balancing upper and lower intent.",
    functionZh: "一手上架、一手下按，同時打開肩帶與上背，讓久坐後緊繃的胸口有空間伸展開來。",
    functionEn: "One palm reaches while the other presses, opening the shoulder girdle and upper back after long sitting.",
    musclesZh: "三角肌、前鋸肌、胸小肌、胸椎伸展肌群；配合馬步的臀中肌與股四頭肌穩定。",
    musclesEn: "Deltoids, serratus anterior, pectoralis minor and thoracic extensors, with gluteus medius and quadriceps stabilising the horse stance.",
    benefitZh: "上舉與下按同時打開肩帶、活動胸椎，適合久坐後的溫和伸展；幅度以舒適為準。",
    benefitEn: "The reach-and-press pairing gently opens the shoulder girdle and upper back after desk work. Stay within a comfortable range.",
  }),
  Object.freeze({
    id: "wushu-fragment-3",
    type: "fragment",
    fragmentIndex: 3,
    segmentId: "bow-push",
    titleZh: "弓步推掌",
    titleEn: "Bow-Stance Palm Push",
    imageUrl: "./public/cards/wushu-fragment-3.png",
    imageFallbackUrl: "./public/cards/wushu-fragment-3.svg",
    keyPointsZh: ["前腳屈膝成弓步，後腿向後蹬伸。", "雙掌向前推出，手肘保留餘量。", "腰腹帶動，不用手臂硬推。"],
    keyPointsEn: ["Bend the front knee into a bow stance; the rear leg drives back.", "Push both palms forward, keeping a little softness in the elbows.", "Let the waist lead rather than forcing with the arms."],
    originZh: "長拳／太極推手基礎・弓步推掌，強調「力由腰發、形於手」。",
    originEn: "Changquan / Taiji push-hands basics: the bow-stance palm push, led from the waist rather than the arms.",
    functionZh: "用腰腹帶動雙掌前推，溫和活動髖部與肩胸，提醒身體用整體協調而不是聳肩硬推。",
    functionEn: "Leads the push from the waist, gently mobilising hips and shoulders and encouraging whole-body coordination over shrugging.",
    musclesZh: "髂腰肌（髖屈肌）、臀大肌、腹斜肌、胸大肌與肱三頭肌；重點在協調而非出力。",
    musclesEn: "Iliopsoas, gluteus maximus, obliques, pectoralis major and triceps — coordination rather than force.",
    benefitZh: "溫和活動髖部與肩胸，提醒身體用整體而非聳肩用力；不作為疼痛治療或訓練處方。",
    benefitEn: "A gentle hip and shoulder opener that encourages whole-body movement over shrugging. Not a treatment or training prescription.",
  }),
  Object.freeze({
    id: MASTER_CARD_ID,
    type: "complete",
    // 完整卡不是第 N 張碎片：欄位保留但標為不適用，並用 requiredFragments 明確合成條件。
    fragmentIndex: null,
    requiredFragments: CARD_TOTAL,
    segmentId: null,
    titleZh: "三式合氣・武術黃金三式全套",
    titleEn: "Three Forms in One · Complete Master Card",
    imageUrl: "./public/cards/wushu-master.png",
    imageFallbackUrl: "./public/cards/wushu-master.svg",
    keyPointsZh: ["並步對拳：先站穩、再起勢。", "馬步架掌：上架下按，打開肩帶。", "弓步推掌：腰腹帶動，從容收勢。"],
    keyPointsEn: ["Ready stance: settle first, then begin.", "Overhead block: reach and press to open the shoulders.", "Bow-stance push: lead from the waist and close with ease."],
    originZh: "三式串連為一套入門長拳小品，依「起・架・推」順序銜接，供舒展順序參考。",
    originEn: "Three beginner Changquan moves linked as settle → open → push, used only as a stretch-sequence reference.",
    functionZh: "把「站穩 → 打开 → 推出 → 收勢」串成一輪，作為完整的溫和舒展紀錄。",
    functionEn: "Links settle, open, push and close into one complete round of gentle mobility work.",
    musclesZh: "綜合三式：肩頸帶、上背與胸椎、髖部與核心；依序活動，不是連續訓練處方。",
    musclesEn: "Combines the shoulder/neck band, upper back and thoracic spine, hips and core in sequence — not a training prescription.",
    benefitZh: "集齊三式代表完成一輪溫和的肩頸與髖部舒展；此卡僅作練習紀錄，不含任何療效宣稱。",
    benefitEn: "Collecting all three marks one round of gentle shoulder, neck and hip mobility work. A practice record only, with no therapeutic claim.",
  }),
]);

/** @type {CardSpec[]} */
export const FRAGMENT_CARDS = Object.freeze(
  CARD_CATALOG.filter((card) => card.type === "fragment"),
);

/** @type {CardSpec} */
export const MASTER_CARD = CARD_CATALOG.find((card) => card.type === "complete");

/** @param {string} id */
export function cardById(id) {
  return CARD_CATALOG.find((card) => card.id === id) || null;
}

/** @param {string} segmentId */
export function fragmentBySegmentId(segmentId) {
  return FRAGMENT_CARDS.find((card) => card.segmentId === segmentId) || null;
}

/** @param {string} file */
export function cardImageUrl(file) {
  return `./public/cards/${file}`;
}

/** 依語言取 Zh/En 欄位，例如 cardField(card, 'title', 'en')。 */
export function cardField(card, field, lang = "zh") {
  return card?.[`${field}${lang === "en" ? "En" : "Zh"}`] ?? "";
}
