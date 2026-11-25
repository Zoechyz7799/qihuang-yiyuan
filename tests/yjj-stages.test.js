/**
 * Yi Jin Jing + dual-set + breath stage sync.
 * Run: node --test tests/yjj-stages.test.js
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  SAMPLE_SET,
  YIJIN_SET,
  WUSHU_THREE_SET,
  SET_ORDER,
  breathForPhase,
  getSet,
  stageForPhase,
  POSE_CLIP,
  poseUrl,
} from "../js/data/cards.js";
import { supported } from "../js/core/coach.js";

const PHASES = ["prep", "hold", "breathe", "rest"];
const CLIPS = new Set(Object.values(POSE_CLIP));

describe("yijin set", () => {
  it("uses set id yijin with twelve named forms", () => {
    assert.equal(YIJIN_SET.id, "yijin");
    assert.equal(SAMPLE_SET.id, "yijin");
    assert.equal(YIJIN_SET.segments.length, 12);
    assert.match(YIJIN_SET.title.zh, /易筋經/);
    assert.match(YIJIN_SET.title.en, /Tendon-Changing/i);
  });

  it("keeps wushu-three selectable alongside yijin", () => {
    assert.equal(WUSHU_THREE_SET.id, "wushu-three");
    assert.equal(WUSHU_THREE_SET.segments.length, 3);
    assert.deepEqual(SET_ORDER, ["yijin", "wushu-three"]);
    assert.equal(getSet("yijin").id, "yijin");
    assert.equal(getSet("wushu-three").id, "wushu-three");
    assert.equal(getSet("yijinjing-12").id, "yijin");
  });

  it("each yijin move has prep/hold/breathe/rest with clip + check + cues", () => {
    for (const seg of YIJIN_SET.segments) {
      assert.ok(Array.isArray(seg.stages), `${seg.id} stages`);
      assert.equal(seg.stages.length, 4, `${seg.id} four stages`);
      for (const phase of PHASES) {
        const st = stageForPhase(seg, phase);
        assert.ok(st, `${seg.id} ${phase}`);
        assert.ok(st.clip.endsWith(".webp"), `${seg.id} ${phase} clip`);
        assert.ok(CLIPS.has(st.clip) || st.clip === seg.pose, `${seg.id} known clip`);
        assert.ok(st.check, `${seg.id} ${phase} check`);
        assert.ok(st.cue?.zh && st.cue?.en, `${seg.id} ${phase} cue`);
        assert.ok(poseUrl(st.clip).includes("/poses/"), "pose url");
      }
    }
  });

  it("coach supports every yijin stage check target", () => {
    const set = new Set(supported);
    for (const seg of YIJIN_SET.segments) {
      for (const st of seg.stages) {
        assert.ok(set.has(st.check), `${seg.id} check ${st.check}`);
      }
    }
  });

  it("breath syncs to 起吸 / 停自然 / 收呼", () => {
    assert.equal(breathForPhase("prep").zh, "吸氣");
    assert.equal(breathForPhase("prep").en, "Inhale");
    assert.equal(breathForPhase("hold").zh, "自然呼吸");
    assert.equal(breathForPhase("breathe").en, "Breathe naturally");
    assert.equal(breathForPhase("rest").zh, "呼氣");
    assert.equal(breathForPhase("rest").en, "Exhale");
  });

  it("source note is stretch-sequence reference only", () => {
    const src = YIJIN_SET.segments[0].source;
    assert.match(src.zh, /舒展順序參考/);
    assert.match(src.en, /stretch-sequence reference/i);
  });
});
