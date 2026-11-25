/**
 * Card UI — 三國殺式水墨卡冊、確定性翻卡解鎖、結果頁、合成進度、
 * 大圖詳情與高清 PNG 匯出。
 *
 * 只負責表現層：解鎖規則在 js/core/cardFSM.js，內容在 js/data/cards.js。
 * 「翻卡 / 入冊」是完成招式後的固定獎勵儀式，沒有隨機、沒有機率、沒有金幣。
 */

import {
  CARD_CATALOG,
  FRAGMENT_CARDS,
  MASTER_CARD,
  WUSHU_CARD_SET_ID,
  cardById,
  cardField,
} from "../data/cards.js";
import { collectionCards, collectionLight, collectionProgress } from "../core/cardFSM.js";

const STYLE_ID = "qcard-styles";

const CSS = `
/* ---- 首頁卡冊入口 ---- */
.qcard-entry{border:1px solid rgba(47,111,94,.45);background:rgba(255,255,252,.92);color:#2f6f5e;border-radius:999px;padding:6px 14px;font:inherit;cursor:pointer;box-shadow:0 4px 14px rgba(28,42,38,.1)}
.qcard-entry:hover{background:#2f6f5e;color:#fff}

/* ---- 結果頁：類型、合成進度、發光升級 ---- */
.qcard-head{display:flex;flex-wrap:wrap;gap:8px;align-items:baseline;justify-content:space-between;margin:0 2px 10px}
.qcard-head-left{display:flex;flex-wrap:wrap;gap:8px;align-items:baseline}
.qcard-kind{font-weight:800;font-size:1.05rem;color:var(--accent,#2f6f5e)}
.qcard-set{font-size:.85rem;color:var(--muted,#5a6b64)}
.qcard-album-btn{border:1px solid rgba(47,111,94,.35);background:rgba(255,255,252,.9);color:#2f6f5e;border-radius:999px;padding:5px 13px;font:inherit;font-size:.8rem;cursor:pointer}
.qcard-album-btn:hover{background:#2f6f5e;color:#fff}
.qcard-synth{border:1px solid var(--line,rgba(47,111,94,.18));border-radius:14px;padding:10px 12px;margin-bottom:12px;background:rgba(255,255,252,.7)}
.qcard-synth-head{display:flex;justify-content:space-between;font-size:.85rem;color:var(--muted,#5a6b64);margin-bottom:8px}
.qcard-synth-head strong{color:var(--accent,#2f6f5e)}
.qcard-synth-track{height:9px;border-radius:999px;background:rgba(47,111,94,.12);overflow:hidden}
.qcard-synth-fill{height:100%;border-radius:999px;background:linear-gradient(90deg,#6fb79a,#d8b45c);transition:width .6s ease}
.qcard-synth-dots{display:flex;gap:6px;margin-top:9px}
.qcard-synth-dot{flex:1;height:5px;border-radius:999px;background:rgba(47,111,94,.14)}
.qcard-synth-dot.is-on{background:#c6972f;box-shadow:0 0 8px rgba(198,151,47,.55)}
.qcard-banner{position:relative;overflow:hidden;text-align:center;border-radius:14px;padding:11px 14px;margin-bottom:12px;font-weight:800;letter-spacing:.08em;color:#6b4f14;background:linear-gradient(100deg,#f7e9bd,#fff8e2,#f7e9bd);border:1px solid rgba(198,151,47,.45);animation:qcard-synthesis 1.9s ease-out 1}
.qcard-banner::after{content:"";position:absolute;top:0;left:-60%;width:40%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.9),transparent);animation:qcard-sweep 1.6s ease-out .25s 1}
.tech-card.is-synthesized{animation:qcard-cardglow 1.9s ease-out 1}
@keyframes qcard-synthesis{0%{opacity:0;transform:translateY(-8px) scale(.97);box-shadow:0 0 0 rgba(198,151,47,0)}35%{opacity:1;transform:none;box-shadow:0 0 34px rgba(224,183,74,.85)}100%{box-shadow:0 0 12px rgba(198,151,47,.35)}}
@keyframes qcard-sweep{to{left:130%}}
@keyframes qcard-cardglow{0%{box-shadow:0 0 0 rgba(198,151,47,0)}40%{box-shadow:0 0 42px rgba(224,183,74,.9)}100%{box-shadow:var(--glow,0 0 24px rgba(47,111,94,.12))}}
.qcard-sub{margin:0 0 6px;color:var(--muted,#5a6b64);font-size:.88rem}
.card-result .tech-card-art{min-height:190px;background:rgba(255,255,252,.55)}
.card-result .tech-card-art img{width:min(170px,100%);border-radius:9px;box-shadow:0 8px 20px rgba(28,42,38,.18)}
.card-result .tech-card.is-complete .tech-card-art img{box-shadow:0 0 24px rgba(214,176,86,.7)}

/* ---- 收集流程引導：讓人一眼看懂「卡要怎麼拿」 ---- */
.qroute{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin:0 0 10px}
.qroute-step{position:relative;border:1px solid rgba(47,111,94,.18);border-radius:10px;padding:7px 6px;background:rgba(255,255,252,.6);text-align:center;font-size:.68rem;line-height:1.35;color:#5a6b64}
.qroute-step b{display:block;font-family:serif;font-size:.9rem;color:#8b9290;margin-bottom:2px}
.qroute-step.is-done{background:rgba(47,111,94,.1);border-color:rgba(47,111,94,.35);color:#2f6f5e}
.qroute-step.is-done b{color:#2f6f5e}
.qroute-step.is-current{background:linear-gradient(150deg,#fff6e2,#f7e9c4);border-color:rgba(198,151,47,.6);color:#6b4f14;box-shadow:0 0 12px rgba(198,151,47,.3)}
.qroute-step.is-current b{color:#a5791f}
.qroute-hint{margin:0 0 10px;font-size:.76rem;line-height:1.55;color:#5a6b64}
.qroute-cta{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:0 0 12px}
.qroute-cta button{border-radius:999px;padding:8px 16px;font:inherit;font-size:.8rem;cursor:pointer;border:1px solid transparent;background:#a5352b;color:#fff9ee;font-weight:800}
.qroute-cta button:hover{filter:brightness(1.08)}
.qroute-cta span{font-size:.74rem;color:#5a6b64}
.qlit{display:flex;align-items:center;gap:8px;margin:0 0 10px;font-size:.74rem;color:#5a6b64}
.qlit-track{flex:1;height:7px;border-radius:999px;background:rgba(47,111,94,.12);overflow:hidden}
.qlit-fill{height:100%;border-radius:999px;background:linear-gradient(90deg,#8aa89a,#e0b74a);transition:width .8s ease}
.qlit strong{color:#a5791f;white-space:nowrap}
@media(max-width:560px){.qroute{grid-template-columns:repeat(2,minmax(0,1fr))}}

/* ---- 翻牌：正面是卡，翻過來才看資訊 ---- */
.qflip-stage{display:flex;flex-direction:column;align-items:center;gap:10px;margin:8px 0 14px}
.qflip{position:relative;width:min(330px,84vw);aspect-ratio:5/7.5;perspective:1400px;cursor:pointer;background:transparent;border:0;padding:0;font:inherit;color:inherit}
.qflip-inner{position:absolute;inset:0;transform-style:preserve-3d;transition:transform .9s cubic-bezier(.22,.8,.25,1);border-radius:14px;box-shadow:0 16px 40px rgba(28,42,38,.22)}
.qflip.is-flipped .qflip-inner{transform:rotateY(180deg)}
.qflip.is-new .qflip-inner{animation:qflip-ignite 1.7s ease-out 1}
@keyframes qflip-ignite{0%{filter:brightness(.3) saturate(.35);opacity:.3}45%{filter:brightness(.78) saturate(.75);opacity:.9}100%{filter:none;opacity:1}}
.qflip-face{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;border-radius:14px;overflow:hidden;border:1px solid rgba(70,60,40,.3)}
.qflip-front{background:#f8f6f0}
.qflip-front img{width:100%;height:100%;object-fit:cover;display:block}
.qflip-front-title{position:absolute;bottom:0;left:0;right:0;padding:30px 10px 12px;background:linear-gradient(transparent,rgba(18,28,24,.82));color:#fff9e8;text-align:center}
.qflip-front-title strong{display:block;font-family:serif;font-size:1.08rem;letter-spacing:.1em}
.qflip-front-title em{display:block;font-style:normal;font-size:.66rem;opacity:.86;margin-top:3px;line-height:1.35}
.qflip-no{position:absolute;top:10px;left:10px;z-index:2;font-family:serif;font-weight:800;color:#fff;background:rgba(150,55,40,.9);border-radius:4px;padding:2px 7px;font-size:.82rem}
.qflip-complete .qflip-front{box-shadow:inset 0 0 0 2px rgba(214,176,86,.85),inset 0 0 40px rgba(230,195,105,.55)}
.qflip-back{transform:rotateY(180deg);background:linear-gradient(155deg,#f8f4e9,#ece7d8);padding:18px 18px 26px;color:#243630;overflow:auto}
.qflip-back::before{content:"";position:absolute;inset:8px;border:1px solid rgba(47,111,94,.3);border-radius:8px;pointer-events:none}
.qflip-back h4{margin:0 0 5px;font-family:serif;font-size:.86rem;letter-spacing:.12em;color:#a5352b;border-bottom:1px solid rgba(165,53,43,.25);padding-bottom:4px}
.qflip-back p{margin:0 0 11px;font-size:.8rem;line-height:1.58;color:#33423b}
.qflip-back ul{margin:0 0 10px;padding-left:1.15em;font-size:.78rem;line-height:1.55;color:#33423b}
.qflip-back li{margin-bottom:3px}
.qflip-seal{position:absolute;right:14px;bottom:10px;font-family:serif;color:rgba(150,55,40,.82);border:1.5px solid rgba(150,55,40,.6);border-radius:4px;padding:1px 5px;font-size:.8rem}
.qflip-disclaimer{font-size:.68rem!important;color:#6f7a73!important;margin-top:4px!important;line-height:1.5!important}
.qflip-toggle{border:1px solid rgba(47,111,94,.4);background:rgba(255,255,252,.92);color:#2f6f5e;border-radius:999px;padding:8px 18px;font:inherit;font-size:.82rem;cursor:pointer}
.qflip-toggle:hover{background:#2f6f5e;color:#fff}
.qflip-hint{margin:0;font-size:.74rem;color:var(--muted,#5a6b64);text-align:center;line-height:1.5}
.qflip.is-large{width:min(390px,88vw)}
.qflip.is-large .qflip-back p{font-size:.86rem}
.qflip.is-large .qflip-back ul{font-size:.83rem}
.qflip.is-large .qflip-back h4{font-size:.92rem}
.qflip.is-large .qflip-back{padding:22px 22px 30px}
/* 英文卡背文案較長：單獨收緊字級與行距，翻過來不必捲動。 */
.qflip-stage.is-en .qflip-back{padding:16px 16px 24px;scrollbar-width:thin}
.qflip-stage.is-en .qflip-back h4{font-size:.82rem;margin-bottom:4px;padding-bottom:3px}
.qflip-stage.is-en .qflip-back p{font-size:.74rem;line-height:1.48;margin-bottom:8px}
.qflip-stage.is-en .qflip-back ul{font-size:.72rem;line-height:1.48;margin-bottom:8px}
.qflip-stage.is-en .qflip-back li{margin-bottom:2px}
.qflip-stage.is-en .qflip-disclaimer{font-size:.62rem!important;line-height:1.42!important}
.qflip-stage.is-en .qflip.is-large .qflip-back{padding:20px 20px 28px}
.qflip-stage.is-en .qflip.is-large .qflip-back h4{font-size:.9rem}
.qflip-stage.is-en .qflip.is-large .qflip-back p{font-size:.82rem}
.qflip-stage.is-en .qflip.is-large .qflip-back ul{font-size:.8rem}
.card-canvas-wrap{display:none}
@media(prefers-reduced-motion:reduce){.qflip.is-new .qflip-inner{animation:none}.qflip-inner{transition:none}}

/* ---- 三國殺式卡牆 ---- */
.qdeck{position:relative;border:1px solid rgba(47,111,94,.22);border-radius:18px;padding:14px;margin:0 0 16px;background:linear-gradient(160deg,rgba(250,248,241,.97),rgba(238,244,238,.94));box-shadow:0 6px 22px rgba(28,42,38,.07)}
.qdeck::before{content:"";position:absolute;inset:0;border-radius:18px;pointer-events:none;background:radial-gradient(70% 55% at 50% 12%,var(--qcard-glow,transparent),transparent 72%)}
.qdeck>*{position:relative}
.qdeck-grid .qcard-tile.is-locked .qcard-tile-inner{filter:brightness(var(--qcard-ambient,1))}
.qdeck-head{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:10px}
.qdeck-kicker{display:block;font-size:.7rem;letter-spacing:.2em;color:#a5791f;font-weight:800;margin-bottom:2px}
.qdeck-head strong{font-size:1.02rem;color:#2f6f5e}
.qdeck-open{border:1px solid rgba(47,111,94,.35);background:rgba(255,255,252,.9);color:#2f6f5e;border-radius:999px;padding:6px 14px;font:inherit;font-size:.82rem;cursor:pointer}
.qdeck-open:hover{background:#2f6f5e;color:#fff}
.qdeck-track{height:6px;border-radius:999px;background:rgba(47,111,94,.13);overflow:hidden;margin-bottom:12px}
.qdeck-fill{height:100%;background:linear-gradient(90deg,#6fb79a,#d8b45c);transition:width .6s ease}
.qdeck-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
.qcard-tile{display:block;width:100%;padding:0;border:0;background:transparent;text-align:left;color:inherit;font:inherit;cursor:pointer;perspective:900px}
.qcard-tile:disabled{cursor:default}
.qcard-tile-inner{position:relative;display:block;width:100%;aspect-ratio:5/7;transform-style:preserve-3d;transition:transform .8s cubic-bezier(.22,.8,.25,1)}
.qcard-tile.is-locked .qcard-tile-inner{transform:rotateY(180deg)}
.qcard-tile.is-new .qcard-tile-inner{animation:qcard-flipin 1.05s cubic-bezier(.22,.8,.25,1) 1}
@keyframes qcard-flipin{0%{transform:rotateY(180deg) scale(.92)}60%{transform:rotateY(-8deg) scale(1.03)}100%{transform:rotateY(0) scale(1)}}
.qcard-tile:not(:disabled):hover .qcard-tile-inner{transform:translateY(-3px)}
.qcard-tile.is-locked:not(:disabled):hover .qcard-tile-inner{transform:rotateY(172deg) translateY(-3px)}
.qcard-face{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;border-radius:10px;overflow:hidden;border:1px solid rgba(70,60,40,.28);box-shadow:0 5px 14px rgba(30,40,35,.16)}
.qcard-face--front{background:#f8f6f0}
.qcard-face--front img{width:100%;height:100%;object-fit:cover;display:block}
.qcard-face--back{transform:rotateY(180deg);background:linear-gradient(150deg,#efeae0,#e0e6dc);display:grid;place-items:center}
.qcard-face--back::before{content:"";position:absolute;inset:9px;border:1px solid rgba(47,111,94,.32);border-radius:6px;z-index:2;pointer-events:none}
.qcard-face--back::after{content:"";position:absolute;width:72%;aspect-ratio:1;border:2px solid rgba(30,45,40,.14);border-radius:50%;box-shadow:0 0 0 12px rgba(30,45,40,.045),inset 0 0 0 10px rgba(30,45,40,.045);pointer-events:none}
.qcard-back-silhouette{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:grayscale(1) brightness(.38) contrast(.85);opacity:.46;mix-blend-mode:multiply}
.qcard-back-seal{position:relative;z-index:3;font-family:serif;font-size:2rem;line-height:1;color:rgba(150,55,40,.9);border:2px solid rgba(150,55,40,.75);border-radius:6px;padding:3px 9px;background:rgba(250,246,236,.82)}
.qcard-back-text{position:absolute;bottom:14%;z-index:3;font-size:.66rem;letter-spacing:.32em;color:rgba(40,55,48,.8)}
.qcard-back-lock{position:absolute;top:12%;z-index:3;font-size:.66rem;letter-spacing:.12em;color:rgba(40,55,48,.8)}
.qcard-back-no{position:absolute;top:9px;right:10px;z-index:3;font-family:serif;font-weight:800;font-size:.9rem;color:rgba(150,55,40,.75);border:1px solid rgba(150,55,40,.45);border-radius:3px;padding:0 4px;background:rgba(250,246,236,.6)}
.qcard-front-no{position:absolute;top:8px;left:8px;z-index:2;font-family:serif;font-weight:800;color:#fff;background:rgba(150,55,40,.88);border-radius:4px;padding:2px 7px;font-size:.74rem}
.qcard-front-glow{position:absolute;inset:0;box-shadow:inset 0 0 0 2px rgba(214,176,86,.75),inset 0 0 30px rgba(230,195,105,.5);pointer-events:none}
.qcard-tile.is-complete .qcard-face--front{box-shadow:0 0 18px rgba(214,176,86,.6)}
.qcard-caption{display:block;margin-top:7px;text-align:center}
.qcard-caption strong{display:block;font-size:.82rem;color:#243630}
.qcard-caption em{display:block;font-style:normal;font-size:.7rem;color:#5a6b64;margin-top:2px;line-height:1.35}
.qcard-new{display:inline-block;margin-left:5px;color:#a5791f;font-weight:800;font-size:.66rem;letter-spacing:.06em}
.qdeck-note{margin:16px 0 0;font-size:.75rem;color:#5a6b64;line-height:1.6}
@media(max-width:560px){.qdeck-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}

/* ---- 回憶功法卡冊 ---- */
.memory-grid.qcard-album-grid{grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
@media(max-width:560px){.memory-grid.qcard-album-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
.memory-grid .qcard-tile-inner{box-shadow:none}

/* ---- 卡冊大圖 modal ---- */
.qalbum-modal{position:fixed;inset:0;z-index:70;display:grid;place-items:center;padding:18px}
.qalbum-backdrop{position:absolute;inset:0;background:rgba(20,32,28,.62);backdrop-filter:blur(4px)}
.qalbum-panel{position:relative;z-index:1;width:min(880px,96vw);max-height:90vh;overflow:auto;border-radius:20px;padding:20px;background:linear-gradient(150deg,#fbfaf5,#eef5ef);border:1px solid rgba(47,111,94,.3);box-shadow:0 24px 70px rgba(16,30,25,.4)}
.qalbum-panel>h3{margin:0 0 3px;font-size:1.25rem;color:#243630}
.qalbum-close{position:absolute;right:14px;top:14px;border:1px solid rgba(47,111,94,.25);background:rgba(255,255,252,.9);border-radius:999px;width:32px;height:32px;cursor:pointer;font-size:1rem;color:#2f6f5e}
.qalbum-panel .qdeck{margin:14px 0 0;box-shadow:none}
.qalbum-panel .qdeck-grid{gap:12px}
@media(max-width:600px){.qalbum-panel .qdeck-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}

/* ---- 大圖詳情 modal ---- */
.qcard-modal{position:fixed;inset:0;z-index:75;display:grid;place-items:center;padding:20px}
.qcard-modal-backdrop{position:absolute;inset:0;background:rgba(20,32,28,.58);backdrop-filter:blur(3px)}
.qcard-modal-panel{position:relative;z-index:1;width:min(760px,94vw);max-height:88vh;overflow:auto;border-radius:20px;padding:20px;background:linear-gradient(150deg,#fbfaf5,#eef5ef);border:1px solid rgba(47,111,94,.28);box-shadow:0 24px 70px rgba(16,30,25,.35);display:grid;grid-template-columns:minmax(150px,38%) 1fr;gap:18px}
.qcard-modal-art{width:100%;height:auto;border-radius:14px;background:#fff;border:1px solid rgba(47,111,94,.15)}
.qcard-modal-panel h3{margin:2px 0 4px;font-size:1.35rem}
.qcard-modal-panel .qcard-sub{margin-bottom:12px}
.qcard-modal-panel ul{margin:4px 0 12px;padding-left:1.15em}
.qcard-modal-panel li{margin-bottom:4px}
.qcard-modal-close{position:absolute;right:12px;top:12px;border:1px solid rgba(47,111,94,.25);background:rgba(255,255,252,.9);border-radius:999px;width:32px;height:32px;cursor:pointer;font-size:1rem;color:#2f6f5e}
.qcard-modal-panel.qcard-modal-flip{display:block;text-align:center;width:min(430px,94vw)}
.qcard-modal-flip .qflip-stage{margin:12px 0 6px}
.qcard-modal-flip .qflip-hint{margin-bottom:10px}
.qcard-modal-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;justify-content:center}
.qcard-modal-actions button{border-radius:999px;padding:8px 16px;border:1px solid transparent;background:#2f6f5e;color:#fff;cursor:pointer;font:inherit}
.qcard-modal-actions button.qcard-ghost{background:transparent;border-color:rgba(47,111,94,.35);color:#2f6f5e}
@media(max-width:560px){.qcard-modal-panel{grid-template-columns:1fr}.qcard-modal-art{max-width:230px;margin:0 auto}}

/* ---- 翻卡解鎖儀式 ---- */
.qreveal{position:fixed;inset:0;z-index:85;display:grid;place-items:center;padding:20px;background:rgba(18,28,24,.74);backdrop-filter:blur(5px);animation:qreveal-in .3s ease-out}
@keyframes qreveal-in{from{opacity:0}to{opacity:1}}
.qreveal-inner{text-align:center;max-width:min(440px,92vw)}
.qreveal-kicker{color:#f0d99a;letter-spacing:.26em;font-size:.76rem;font-weight:800}
.qreveal.is-synthesis .qreveal-kicker{color:#ffe6a0}
.qreveal .qcard-tile{width:min(230px,60vw);margin:18px auto 10px;pointer-events:none}
.qreveal .qcard-tile-inner{transition:transform .9s cubic-bezier(.22,.8,.25,1);box-shadow:0 18px 50px rgba(0,0,0,.45)}
.qreveal .qcard-tile-inner{transform:rotateY(180deg)}
.qreveal.is-flipped .qcard-tile-inner{transform:rotateY(0)}
.qreveal.is-flipped .qcard-face--front{animation:qreveal-glow 1.5s ease-out 1}
@keyframes qreveal-glow{0%{box-shadow:0 0 0 rgba(228,190,96,0)}35%{box-shadow:0 0 46px 12px rgba(238,202,110,.85)}100%{box-shadow:0 8px 26px rgba(20,30,25,.5)}}
.qreveal .qcard-caption strong{color:#fff9e8;font-size:1rem}
.qreveal .qcard-caption em{color:rgba(245,241,228,.8)}
.qreveal h2{margin:12px 0 3px;color:#fff9e8;font-size:1.4rem}
.qreveal p{margin:2px 0;color:rgba(245,241,228,.85);font-size:.88rem;line-height:1.55}
.qreveal-actions{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:18px}
.qreveal-actions button{border-radius:999px;padding:9px 18px;font:inherit;cursor:pointer;border:1px solid transparent;background:#d8b45c;color:#3b2d0b;font-weight:800}
.qreveal-actions button.qreveal-ghost{background:transparent;border-color:rgba(245,241,228,.5);color:#fff9e8;font-weight:500}
@media(prefers-reduced-motion:reduce){.qcard-banner,.qcard-banner::after,.tech-card.is-synthesized,.qcard-tile.is-new .qcard-tile-inner,.qreveal,.qreveal.is-flipped .qcard-face--front{animation:none}.qcard-tile-inner,.qreveal .qcard-tile-inner{transition:none}}
`;

export function injectCardStyles(doc = document) {
  if (!doc?.head || doc.getElementById?.(STYLE_ID)) return;
  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = CSS;
  doc.head.appendChild(style);
}

export function cardTitle(card, lang = "zh") {
  return cardField(card, "title", lang);
}

export function cardKindLabel(card, lang = "zh") {
  if (card.type === "complete") {
    return lang === "en" ? "Glowing Complete Master Card" : "發光完整卡";
  }
  const index = card.fragmentIndex ?? 1;
  return lang === "en"
    ? `Fragment (${index}/${FRAGMENT_CARDS.length})`
    : `碎片卡（${index}/${FRAGMENT_CARDS.length}）`;
}

function tileNumber(card) {
  if (card.type === "complete") return "合";
  return ["壹", "貳", "參"][(card.fragmentIndex ?? 1) - 1] || "勢";
}

function imgTag(card, className = "") {
  return `<img class="${className}" src="${escapeHtml(card.imageUrl)}" data-fallback="${escapeHtml(card.imageFallbackUrl || "")}" alt="" draggable="false" />`;
}

/** Wire PNG → SVG placeholder fallback for every card image in a container. */
function wireImageFallback(container) {
  if (!container?.querySelectorAll) return;
  container.querySelectorAll("img[data-fallback]").forEach((img) => {
    img.addEventListener(
      "error",
      () => {
        const alt = img.dataset.fallback;
        if (!alt || img.dataset.fallbackApplied) return;
        img.dataset.fallbackApplied = "1";
        img.src = alt;
      },
      { once: true },
    );
  });
}

/** A single 三國殺式 card tile: front = ink artwork, back = ink silhouette. */
function tileMarkup(card, options = {}) {
  const { unlocked, lang = "zh", isNew = false } = options;
  const title = unlocked
    ? cardTitle(card, lang)
    : lang === "en"
      ? "Locked"
      : "未解鎖";
  const sub = unlocked
    ? cardKindLabel(card, lang)
    : card.type === "complete"
      ? lang === "en"
        ? "Collect 3 to synthesize"
        : "集齊 3 張合成"
      : lang === "en"
        ? "Finish this form to flip"
        : "完成該式翻卡";
  return `
    <span class="qcard-tile-inner">
      <span class="qcard-face qcard-face--front">
        ${imgTag(card)}
        <span class="qcard-front-no">${tileNumber(card)}</span>
        ${card.type === "complete" ? '<span class="qcard-front-glow"></span>' : ""}
      </span>
      <span class="qcard-face qcard-face--back">
        ${imgTag(card, "qcard-back-silhouette")}
        <span class="qcard-back-no">${tileNumber(card)}</span>
        <span class="qcard-back-lock">${lang === "en" ? "SEALED" : "未解鎖"}</span>
        <span class="qcard-back-seal">氣</span>
        <span class="qcard-back-text">氣脈陪練</span>
      </span>
    </span>
    <span class="qcard-caption">
      <strong>${escapeHtml(title)}${isNew ? `<span class="qcard-new">${lang === "en" ? "NEW" : "新入冊"}</span>` : ""}</strong>
      <em>${escapeHtml(sub)}</em>
    </span>`;
}

/** 真正的翻牌：正面只有卡，翻過來才是功用 / 出處 / 針對肌群 / 要點。 */
function flipCardMarkup(card, options = {}) {
  const { lang = "zh", large = false, isNew = false } = options;
  const en = lang === "en";
  const points = (cardField(card, "keyPoints", lang) || [])
    .map((p) => `<li>${escapeHtml(p)}</li>`)
    .join("");
  const section = (label, value) =>
    `<h4>${escapeHtml(label)}</h4><p>${escapeHtml(value)}</p>`;
  return `
    <div class="qflip-stage ${en ? "is-en" : ""}">
      <div class="qflip ${card.type === "complete" ? "qflip-complete" : ""} ${large ? "is-large" : ""} ${isNew ? "is-new" : ""}" role="button" tabindex="0" aria-label="${en ? "Flip the card" : "翻牌看卡背資訊"}">
        <div class="qflip-inner">
          <div class="qflip-face qflip-front">
            ${imgTag(card)}
            <span class="qflip-no">${tileNumber(card)}</span>
            <div class="qflip-front-title">
              <strong>${escapeHtml(cardField(card, "title", "zh"))}</strong>
              <em>${escapeHtml(cardField(card, "title", "en"))}</em>
            </div>
          </div>
          <div class="qflip-face qflip-back">
            ${section(en ? "FUNCTION" : "功用", cardField(card, "function", lang))}
            ${section(en ? "ORIGIN" : "傳統武術出處", cardField(card, "origin", lang))}
            ${section(en ? "MUSCLES INVOLVED" : "針對肌群", cardField(card, "muscles", lang))}
            <h4>${en ? "KEY POINTS" : "核心要點"}</h4>
            <ul>${points}</ul>
            <p class="qflip-disclaimer">${escapeHtml(cardField(card, "benefit", lang))}</p>
            <span class="qflip-seal">氣</span>
          </div>
        </div>
      </div>
      <button type="button" class="qflip-toggle">${en ? "Flip to the info back" : "翻到背面・看功用 / 出處 / 肌群"}</button>
      <p class="qflip-hint">${en ? "Tap the card or the button to flip. Downloads export the face you are looking at." : "點卡片或按按鈕翻面；下載會輸出你目前看到的那一面。"}</p>
    </div>`;
}

function wireFlip(container, options = {}) {
  const { lang = "zh", onFlip = null } = options;
  const flip = container.querySelector(".qflip");
  const toggle = container.querySelector(".qflip-toggle");
  wireImageFallback(container);
  if (!flip) return null;
  const setFace = (back) => {
    flip.classList.toggle("is-flipped", back);
    container.dataset.qface = back ? "back" : "front";
    if (toggle) {
      toggle.textContent = back
        ? lang === "en" ? "Flip back to the art" : "翻回卡面"
        : lang === "en" ? "Flip to the info back" : "翻到背面・看功用 / 出處 / 肌群";
    }
    if (onFlip) onFlip(back);
  };
  const toggleIt = () => setFace(!flip.classList.contains("is-flipped"));
  flip.addEventListener("click", toggleIt);
  flip.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleIt();
    }
  });
  toggle?.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleIt();
  });
  setFace(false);
  return { isBack: () => flip.classList.contains("is-flipped") };
}

function deckGridMarkup(collection, options = {}) {
  const { lang = "zh", newlyUnlockedIds = [], pickable = true } = options;
  return collectionCards(collection)
    .map(({ card, unlocked }) => {
      const isNew = unlocked && newlyUnlockedIds.includes(card.id);
      const canPick = pickable && !unlocked && card.type === "fragment";
      const classes = [
        "qcard-tile",
        card.type === "complete" ? "is-complete" : "",
        unlocked ? "" : "is-locked",
        isNew ? "is-new" : "",
      ]
        .filter(Boolean)
        .join(" ");
      return `<button type="button" class="${classes}" data-card-id="${escapeHtml(card.id)}" ${card.segmentId ? `data-segment-id="${escapeHtml(card.segmentId)}"` : ""} ${!unlocked && !canPick ? "disabled" : ""}>${tileMarkup(card, { unlocked, lang, isNew })}</button>`;
    })
    .join("");
}

/** 四步收集流程，讓人一眼看懂「卡要怎麼拿」。 */
function routeMarkup(collection, options = {}) {
  const { lang = "zh", activeSetId = "", pickedSegmentId = "", pickedLabel = "" } = options;
  const light = collectionLight(collection);
  const rightSet = activeSetId === "" || activeSetId === WUSHU_CARD_SET_ID;
  const steps = [
    {
      zh: "選「武術三式」",
      en: "Pick Wushu Three",
      done: rightSet,
    },
    {
      zh: "按開始練一式",
      en: "Press Start",
      done: Boolean(pickedSegmentId) || light.owned > 0,
    },
    {
      zh: "完成就翻卡入冊",
      en: "Finish → flip card",
      done: light.owned > 0,
    },
    {
      zh: "集齊 3 張合成",
      en: "Collect 3 → master",
      done: light.level >= light.maxLevel,
    },
  ];
  const current = steps.findIndex((s) => !s.done);
  const chips = steps
    .map((s, i) => {
      const cls = s.done ? "is-done" : i === current ? "is-current" : "";
      return `<div class="qroute-step ${cls}"><b>${["壹", "貳", "參", "肆"][i]}</b>${escapeHtml(lang === "en" ? s.en : s.zh)}</div>`;
    })
    .join("");
  const hint = pickedSegmentId
    ? lang === "en"
      ? `Ready: ${pickedLabel || "your move"}. Press Start → finish the form → the card flips into your album.`
      : `已選好：${pickedLabel || "這一式"} → 按「開始」練完，卡片就會翻開收入卡冊。`
    : rightSet
      ? lang === "en"
        ? "Pick any dark card below → Start → finish the form → the card flips into your album."
        : "點下面任一張暗卡 → 按「開始」→ 練完這一式 → 卡片就會翻開收入卡冊。"
      : lang === "en"
        ? "You are on Yi Jin Jing (stretch only, no cards). Pick a dark card below to switch to Wushu Three automatically."
        : "你現在在「易筋經十二勢」（純舒展，不發卡）。點下面任一張暗卡，會自動切到「武術三式」並選好該式。";
  const firstMissing = collectionCards(collection).find(
    ({ card, unlocked }) => card.type === "fragment" && !unlocked,
  );
  const ctaLabel = firstMissing
    ? lang === "en"
      ? "Go unlock the next card"
      : "一鍵去練下一張卡"
    : lang === "en"
      ? "Open full album"
      : "查看完整卡冊";
  return `
    <div class="qroute">${chips}</div>
    <p class="qroute-hint">${hint}</p>
    <div class="qroute-cta">
      <button type="button" class="qroute-cta-btn" ${firstMissing ? `data-segment-id="${escapeHtml(firstMissing.card.segmentId)}"` : 'data-open-album="1"'}>${ctaLabel}</button>
      <span>${lang === "en" ? "Deterministic: no random draws, no coins" : "固定發放，沒有隨機抽卡、沒有金幣"}</span>
    </div>`;
}

function deckMarkup(collection, options = {}) {
  const { lang = "zh", showOpenButton = true, showNote = true, showRoute = true } = options;
  const progress = collectionProgress(collection);
  const light = collectionLight(collection);
  const headLabel =
    lang === "en" ? "WUSHU THREE · CARD ALBUM" : "武術黃金三式・招式卡冊";
  const progressLabel =
    lang === "en"
      ? `Collected ${progress.owned}/${progress.total}`
      : `已集齊 ${progress.owned}/${progress.total}`;
  const note =
    lang === "en"
      ? "Deterministic unlock: finish the matching form to flip its card. Collect all 3 to auto-synthesize the master card. No random draws, no coins."
      : "完成對應招式即可翻卡解鎖；集齊 3 張碎片自動合成完整卡。固定發放，沒有隨機抽卡、沒有虛擬金幣。";
  return `
    <div class="qdeck-head">
      <div>
        <span class="qdeck-kicker">${headLabel}</span>
        <strong>${progressLabel}${progress.completeUnlocked ? (lang === "en" ? " · Master card unlocked" : " · 完整卡已解鎖") : ""}</strong>
      </div>
      ${showOpenButton ? `<button type="button" class="qdeck-open">${lang === "en" ? "Open album" : "展開卡冊"}</button>` : ""}
    </div>
    <div class="qlit"><span>${lang === "en" ? "Ink glow" : "墨氣點亮"}</span><span class="qlit-track"><span class="qlit-fill" style="width:${Math.round(light.ratio * 100)}%"></span></span><strong>${light.label}</strong></div>
    <div class="qdeck-track"><div class="qdeck-fill" style="width:${Math.round(progress.ratio * 100)}%"></div></div>
    ${showRoute ? routeMarkup(collection, options) : ""}
    <div class="qdeck-grid">${deckGridMarkup(collection, options)}</div>
    ${showNote ? `<p class="qdeck-note">${note}</p>` : ""}`;
}

function wireDeck(container, options = {}) {
  const { onPick = () => {}, onOpen = () => {}, onExpand = () => {} } = options;
  wireImageFallback(container);
  const expand = container.querySelector(".qdeck-open");
  if (expand) expand.addEventListener("click", onExpand);
  const cta = container.querySelector(".qroute-cta-btn");
  if (cta) {
    cta.addEventListener("click", () => {
      if (cta.dataset.segmentId) onPick(cta.dataset.segmentId);
      else onExpand();
    });
  }
  container.querySelectorAll(".qcard-tile").forEach((button) => {
    button.addEventListener("click", () => {
      const card = cardById(button.dataset.cardId);
      if (!card) return;
      if (button.classList.contains("is-locked")) {
        if (button.dataset.segmentId) onPick(button.dataset.segmentId);
      } else {
        onOpen(card);
      }
    });
  });
}

/**
 * 三國殺式卡牆：練習前就能看到 4 張卡（3 碎片 + 1 完整卡），
 * 未解鎖是水墨剪影卡背，點未解鎖碎片卡會直接選到對應招式去解鎖。
 */
export function renderDeck(container, options = {}) {
  if (!container) return;
  const { doc = document } = options;
  injectCardStyles(doc);
  container.innerHTML = deckMarkup(options.collection, options);
  applyInkLight(container, options.collection);
  wireDeck(container, options);
}

/** 做完一招就亮一點：整冊墨氣與未解鎖剪影隨收集進度提亮。 */
export function applyInkLight(element, collection) {
  if (!element) return;
  const light = collectionLight(collection);
  element.style.setProperty("--qcard-ambient", String(light.ambient.toFixed(2)));
  element.style.setProperty(
    "--qcard-glow",
    `rgba(224,183,74,${(0.05 + 0.24 * light.ratio).toFixed(3)})`,
  );
}

/** 全螢幕卡冊 modal（首頁與練習頁共用）。 */
export function openCardAlbum(options = {}) {
  const { collection, lang = "zh", doc = document, onDownload = null, onPick = null } = options;
  injectCardStyles(doc);
  doc.querySelector(".qalbum-modal")?.remove();
  const modal = doc.createElement("div");
  modal.className = "qalbum-modal";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.innerHTML = `
    <div class="qalbum-backdrop"></div>
    <div class="qalbum-panel">
      <button type="button" class="qalbum-close" aria-label="Close">✕</button>
      <h3>${lang === "en" ? "Card Album" : "招式卡冊"}</h3>
      <p class="qcard-sub">${lang === "en" ? "Tap an unlocked card for the full view and PNG download." : "點已解鎖的卡看大圖、下載 PNG；未解鎖的卡完成該式就會翻開。"}</p>
      <div class="qdeck">${deckMarkup(collection, { ...options, showOpenButton: false })}</div>
    </div>`;
  doc.body.appendChild(modal);
  applyInkLight(modal.querySelector(".qdeck"), collection);

  wireDeck(modal.querySelector(".qdeck"), {
    onPick: onPick || (() => {}),
    onOpen: (card) => openCardDetail(card, { lang, doc, onDownload }),
  });
  const close = () => {
    modal.remove();
    doc.removeEventListener("keydown", onKey);
  };
  function onKey(event) {
    if (event.key === "Escape") close();
  }
  doc.addEventListener("keydown", onKey);
  modal.querySelector(".qalbum-backdrop").addEventListener("click", close);
  modal.querySelector(".qalbum-close").addEventListener("click", close);
  return close;
}

/**
 * 完成招式後的「翻卡解鎖 → 收入卡冊」儀式。
 * 卡片永遠是本輪確定性結算出的那一張，沒有抽取行為。
 */
export function playCardReveal(options = {}) {
  const { card, outcome = null, lang = "zh", doc = document, onExpand = null } = options;
  if (!card) return Promise.resolve(false);
  injectCardStyles(doc);
  doc.querySelector(".qreveal")?.remove();

  const synthesized = Boolean(outcome?.justSynthesized);
  const kicker = synthesized
    ? lang === "en"
      ? "THREE FORMS IN ONE · SYNTHESIZED"
      : "三式合氣・合成完整卡"
    : lang === "en"
      ? "FORM COMPLETE · CARD UNLOCKED"
      : "招式完成・翻卡解鎖";
  const headline = synthesized
    ? lang === "en"
      ? "Master Card Unlocked"
      : "發光完整卡解鎖"
    : lang === "en"
      ? "Added to your album"
      : "已收入招式卡冊";
  const desc = synthesized
    ? lang === "en"
      ? "All 3 fragments collected — the complete card is now yours."
      : "三張碎片集齊，自動合成全套完整卡，已收進卡冊。"
    : lang === "en"
      ? `Card ${card.fragmentIndex}/${FRAGMENT_CARDS.length} — finish the other forms to complete the set.`
      : `第 ${card.fragmentIndex}/${FRAGMENT_CARDS.length} 張碎片已入冊，練完其餘招式就能合成完整卡。`;

  const overlay = doc.createElement("div");
  overlay.className = `qreveal${synthesized ? " is-synthesis" : ""}`;
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.innerHTML = `
    <div class="qreveal-inner">
      <span class="qreveal-kicker">${kicker}</span>
      <div class="qcard-tile ${card.type === "complete" ? "is-complete" : ""}">${tileMarkup(card, { unlocked: true, lang })}</div>
      <h2>${escapeHtml(cardTitle(card, lang))}</h2>
      <p><strong>${headline}</strong></p>
      <p>${desc}</p>
      <div class="qreveal-actions">
        ${onExpand ? `<button type="button" class="qreveal-album">${lang === "en" ? "Open album" : "查看卡冊"}</button>` : ""}
        <button type="button" class="qreveal-ghost qreveal-dismiss">${lang === "en" ? "Continue" : "繼續"}</button>
      </div>
    </div>`;
  doc.body.appendChild(overlay);
  wireImageFallback(overlay);

  return new Promise((resolve) => {
    let closed = false;
    let autoTimer = 0;
    let flipTimer = 0;
    const finish = (expand) => {
      if (closed) return;
      closed = true;
      clearTimeout(autoTimer);
      clearTimeout(flipTimer);
      doc.removeEventListener("keydown", onKey);
      overlay.remove();
      if (expand && onExpand) onExpand();
      resolve(expand);
    };
    function onKey(event) {
      if (event.key === "Escape") finish(false);
    }
    doc.addEventListener("keydown", onKey);
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) finish(false);
    });
    overlay.querySelector(".qreveal-dismiss").addEventListener("click", () => finish(false));
    overlay
      .querySelector(".qreveal-album")
      ?.addEventListener("click", () => finish(true));
    const reduced = doc.defaultView?.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    flipTimer = globalThis.setTimeout(() => overlay.classList.add("is-flipped"), reduced ? 0 : 420);
    autoTimer = globalThis.setTimeout(() => finish(false), synthesized ? 4800 : 3800);
  });
}

/** 結果頁的「墨氣點亮」條：每完成一招就亮一檔。 */
function lightMarkup(collection, lang = "zh") {
  const light = collectionLight(collection);
  const label = lang === "en"
    ? (light.completeUnlocked ? "Album fully lit" : `Ink glow ${light.owned}/${light.total}`)
    : light.label;
  return `<div class="qlit"><span>${lang === "en" ? "Ink glow" : "墨氣點亮"}</span><span class="qlit-track"><span class="qlit-fill" style="width:${Math.round(light.ratio * 100)}%"></span></span><strong>${escapeHtml(label)}</strong></div>`;
}

/**
 * End-of-session panel: earned card + synthesis progress + glow banner.
 */
export function renderCardResult(container, options = {}) {
  const {
    card,
    outcome,
    collection,
    lang = "zh",
    setTitle = "",
    onOpenAlbum = null,
    nonCardSet = false,
    onSwitchSet = null,
  } = options;
  const progress = collectionProgress(collection);
  const kindLabel = card ? cardKindLabel(card, lang) : "";
  const dots = FRAGMENT_CARDS.map(
    (fragment, i) => `<span class="qcard-synth-dot ${i < progress.owned ? "is-on" : ""}"></span>`,
  ).join("");
  const progressText =
    lang === "en" ? `Collected ${progress.owned}/${progress.total}` : `已集齊 ${progress.owned}/${progress.total}`;
  const albumBtn = onOpenAlbum
    ? `<button type="button" class="qcard-album-btn">${lang === "en" ? "Open album" : "查看卡冊"}</button>`
    : "";

  if (!card) {
    const note = nonCardSet
      ? lang === "en"
        ? "This set (Yi Jin Jing) is stretch-only and does not award cards. Switch to Wushu Three to collect."
        : "這套是「易筋經十二勢」，純舒展、不發招式卡。切到「武術三式」練完就能收集。"
      : outcome?.event === "interrupted"
        ? lang === "en"
          ? "Session interrupted — no card awarded."
          : "本輪中斷，未獲得招式卡。"
        : lang === "en"
          ? "No card this round."
          : "本輪尚無招式卡。";
    const switchBtn = nonCardSet && onSwitchSet
      ? `<button type="button" class="qcard-switch-set">${lang === "en" ? "Switch to Wushu Three" : "切到武術三式・去拿卡"}</button>`
      : "";
    container.innerHTML = `
      <div class="qcard-head"><div class="qcard-head-left"><span class="qcard-set">${escapeHtml(setTitle)}</span></div>${albumBtn}</div>
      <div class="qcard-synth">
        <div class="qcard-synth-head"><span>${lang === "en" ? "Synthesis progress" : "合成進度"}</span><strong>${progressText}</strong></div>
        <div class="qcard-synth-track"><div class="qcard-synth-fill" style="width:${Math.round(progress.ratio * 100)}%"></div></div>
        <div class="qcard-synth-dots">${dots}</div>
      </div>
      ${lightMarkup(collection, lang)}
      <p class="card-meta">${note}</p>
      ${switchBtn}
      <div class="card-canvas-wrap"></div>`;
    if (onOpenAlbum) {
      const btn = container.querySelector(".qcard-album-btn");
      if (btn) btn.addEventListener("click", onOpenAlbum);
    }
    container.querySelector(".qcard-switch-set")?.addEventListener("click", onSwitchSet || (() => {}));
    return;
  }

  const synthesized = Boolean(outcome?.justSynthesized);
  const banner = synthesized
    ? `<div class="qcard-banner">${lang === "en" ? "THREE FORMS IN ONE · MASTER CARD SYNTHESIZED" : "三式合氣・合成完整卡"}</div>`
    : "";
  const isNew = outcome?.event === "fragment" || outcome?.event === "complete";

  container.innerHTML = `
    <div class="qcard-head">
      <div class="qcard-head-left">
        <span class="qcard-kind">${escapeHtml(kindLabel)}</span>
        <span class="qcard-set">${escapeHtml(setTitle)}</span>
      </div>
      ${albumBtn}
    </div>
    <div class="qcard-synth">
      <div class="qcard-synth-head">
        <span>${lang === "en" ? "Synthesis progress" : "合成進度"}</span>
        <strong>${progressText}</strong>
      </div>
      <div class="qcard-synth-track"><div class="qcard-synth-fill" style="width:${Math.round(progress.ratio * 100)}%"></div></div>
      <div class="qcard-synth-dots">${dots}</div>
    </div>
    ${lightMarkup(collection, lang)}
    ${banner}
    ${flipCardMarkup(card, { lang, isNew })}
    <div class="card-canvas-wrap"><canvas id="card-canvas" width="1280" height="1200" aria-hidden="true"></canvas></div>`;
  wireFlip(container, { lang });
  const btn = container.querySelector(".qcard-album-btn");
  if (btn && onOpenAlbum) btn.addEventListener("click", onOpenAlbum);
}

/** 回憶功法：解鎖卡可點大圖，未解鎖顯示水墨剪影卡背。 */
export function renderMemory(grid, options = {}) {
  if (!grid) return;
  const {
    collection,
    lang = "zh",
    onOpen = () => {},
    newlyUnlockedIds = [],
    onExpand = null,
  } = options;
  injectCardStyles(grid.ownerDocument || document);
  grid.classList.add("qcard-album-grid");
  applyInkLight(grid, collection);
  const progress = collectionProgress(collection);
  grid.innerHTML =
    `<p class="qdeck-note" style="grid-column:1/-1;margin:0 0 4px">${
      lang === "en"
        ? `Album ${progress.owned}/${progress.total} fragments${progress.completeUnlocked ? " · master card unlocked" : ""}`
        : `卡冊進度 ${progress.owned}/${progress.total}${progress.completeUnlocked ? " ・ 完整卡已解鎖" : ""}`
    }${onExpand ? ` · <button type="button" class="qcard-album-btn" style="margin-left:6px">${lang === "en" ? "Open album" : "展開卡冊"}</button>` : ""}</p>` +
    deckGridMarkup(collection, { lang, newlyUnlockedIds, pickable: false });
  grid.querySelector(".qcard-album-btn")?.addEventListener("click", onExpand || (() => {}));
  wireDeck(grid, { onOpen });
}

/** Large image detail dialog for an unlocked card. */
export function openCardDetail(card, options = {}) {
  const { lang = "zh", onDownload = null, doc = document } = options;
  injectCardStyles(doc);
  doc.querySelector(".qcard-modal")?.remove();

  const modal = doc.createElement("div");
  modal.className = "qcard-modal";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.innerHTML = `
    <div class="qcard-modal-backdrop"></div>
    <div class="qcard-modal-panel qcard-modal-flip">
      <button type="button" class="qcard-modal-close" aria-label="Close">✕</button>
      <p class="card-meta">${escapeHtml(cardKindLabel(card, lang))}</p>
      ${flipCardMarkup(card, { lang, large: true })}
      <div class="qcard-modal-actions">
        <button type="button" class="qcard-modal-download-front">${lang === "en" ? "Download front PNG" : "下載卡面 PNG"}</button>
        <button type="button" class="qcard-modal-download-back">${lang === "en" ? "Download back PNG" : "下載卡背 PNG"}</button>
        <button type="button" class="qcard-ghost qcard-modal-dismiss">${lang === "en" ? "Close" : "關閉"}</button>
      </div>
    </div>`;
  doc.body.appendChild(modal);
  wireFlip(modal, { lang });

  const close = () => {
    modal.remove();
    doc.removeEventListener("keydown", onKey);
  };
  const onKey = (event) => {
    if (event.key === "Escape") close();
  };
  doc.addEventListener("keydown", onKey);
  modal.querySelector(".qcard-modal-backdrop").addEventListener("click", close);
  modal.querySelector(".qcard-modal-close").addEventListener("click", close);
  modal.querySelector(".qcard-modal-dismiss").addEventListener("click", close);
  const downloadFace = async (back) => {
    if (onDownload) {
      await onDownload(card, back ? "back" : "front");
      return;
    }
    const canvas = doc.createElement("canvas");
    if (back) {
      await drawCardBackCanvas(canvas, card, { lang });
    } else {
      await drawCardCanvas(canvas, card, { lang });
    }
    await downloadCardImage(canvas, card, back ? "-back" : "");
  };
  modal.querySelector(".qcard-modal-download-front").addEventListener("click", () => downloadFace(false));
  modal.querySelector(".qcard-modal-download-back").addEventListener("click", () => downloadFace(true));
  return close;
}

/* ---------------------------------------------------------------------
 * High-resolution PNG export (2x backing store, 640x400 logical space).
 * Includes ink art, zh + en titles, key points, origin, benefit, watermark.
 * ------------------------------------------------------------------- */

const imageCache = new Map();

function loadImage(url, fallbackUrl) {
  if (!url) return Promise.resolve(null);
  const key = `${url}|${fallbackUrl || ""}`;
  if (imageCache.has(key)) return imageCache.get(key);
  const pending = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => {
      if (!fallbackUrl || fallbackUrl === url) {
        resolve(null);
        return;
      }
      const alt = new Image();
      alt.onload = () => resolve(alt);
      alt.onerror = () => resolve(null);
      alt.src = fallbackUrl;
    };
    img.src = url;
  });
  imageCache.set(key, pending);
  return pending;
}

export async function drawCardCanvas(canvas, card, options = {}) {
  if (!canvas || !card) return canvas;
  const img = await loadImage(card.imageUrl, card.imageFallbackUrl);
  paintCard(canvas, card, options, img);
  return canvas;
}

function paintCard(canvas, card, options, img) {
  const lang = options.lang || "zh";
  const scale = 2;
  const w = 640;
  const h = 400;
  if (canvas.width !== w * scale) canvas.width = w * scale;
  if (canvas.height !== h * scale) canvas.height = h * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);

  const isComplete = card.type === "complete";
  const grad = ctx.createLinearGradient(0, 0, w, h);
  if (isComplete) {
    grad.addColorStop(0, "#f4f9f1");
    grad.addColorStop(0.55, "#fbf3dd");
    grad.addColorStop(1, "#e9f4ec");
  } else {
    grad.addColorStop(0, "#f8f6f0");
    grad.addColorStop(1, "#eaeae2");
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Ink hills + rings as a light backdrop.
  ctx.strokeStyle = "rgba(47,111,94,0.14)";
  ctx.lineWidth = 1.5;
  for (const r of [130, 168]) {
    ctx.beginPath();
    ctx.arc(505, 170, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(120,170,150,0.14)";
  ctx.beginPath();
  ctx.moveTo(0, 330);
  ctx.bezierCurveTo(150, 260, 330, 360, 640, 290);
  ctx.lineTo(640, 400);
  ctx.lineTo(0, 400);
  ctx.fill();

  // Card artwork.
  const artX = 432;
  const artY = 34;
  const artW = 176;
  const artH = 246;
  ctx.save();
  ctx.fillStyle = "rgba(255,255,252,0.86)";
  roundRect(ctx, artX - 6, artY - 6, artW + 12, artH + 12, 14);
  ctx.fill();
  if (img) {
    ctx.save();
    roundRect(ctx, artX, artY, artW, artH, 9);
    ctx.clip();
    ctx.globalAlpha = isComplete ? 0.96 : 0.9;
    const ratio = img.width / img.height;
    const boxRatio = artW / artH;
    if (ratio > boxRatio) {
      const dw = img.height * boxRatio;
      ctx.drawImage(img, (img.width - dw) / 2, 0, dw, img.height, artX, artY, artW, artH);
    } else {
      const dh = img.width / boxRatio;
      ctx.drawImage(img, 0, (img.height - dh) / 2, img.width, dh, artX, artY, artW, artH);
    }
    ctx.restore();
  } else {
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = "#2b3b36";
    ctx.beginPath();
    ctx.arc(artX + artW / 2, artY + 70, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 12;
    ctx.strokeStyle = "#2b3b36";
    ctx.beginPath();
    ctx.moveTo(artX + artW / 2, artY + 100);
    ctx.lineTo(artX + artW / 2, artY + 190);
    ctx.stroke();
  }
  ctx.restore();

  // Kind label.
  ctx.fillStyle = isComplete ? "#a5791f" : "#2f6f5e";
  ctx.font = "700 16px Nunito, sans-serif";
  ctx.fillText(cardKindLabel(card, lang), 32, 40);

  // 完整卡標題較長：自動縮字級維持單行，否則內文會壓到頁腳水印。
  const dense = isComplete;
  const bodyLH = dense ? 14.5 : 15;
  const pointLH = dense ? 15 : 16;
  const sectionGap = dense ? 5 : 8;

  // Chinese + English titles.
  ctx.fillStyle = "#1c2a26";
  const zhTitle = cardField(card, "title", "zh");
  const titleSize = fitFont(ctx, zhTitle, 370, 30, 20, "Nunito, sans-serif", 700);
  ctx.font = `700 ${titleSize}px Nunito, sans-serif`;
  let y = wrapText(ctx, zhTitle, 32, 78, 370, dense ? 30 : 34);
  ctx.fillStyle = "#5a6b64";
  ctx.font = "500 14px Nunito, sans-serif";
  y = wrapText(ctx, cardField(card, "title", "en"), 32, y + 22, 370, 19);

  // Key points.
  y += 14;
  ctx.fillStyle = "#2f6f5e";
  ctx.font = "700 12px Nunito, sans-serif";
  ctx.fillText(lang === "en" ? "KEY POINTS" : "核心要點", 32, y);
  y += 18;
  ctx.fillStyle = "#243630";
  ctx.font = "500 12.5px Nunito, sans-serif";
  for (const point of cardField(card, "keyPoints", lang) || []) {
    y = wrapText(ctx, `· ${point}`, 32, y, 370, pointLH) + 3;
  }

  // Origin + benefit.
  y += sectionGap;
  ctx.fillStyle = "#2f6f5e";
  ctx.font = "700 12px Nunito, sans-serif";
  ctx.fillText(lang === "en" ? "ORIGIN" : "傳統武術出處", 32, y);
  ctx.fillStyle = "#4b5b54";
  ctx.font = "500 11.5px Nunito, sans-serif";
  y = wrapText(ctx, cardField(card, "origin", lang), 32, y + 16, 370, bodyLH);

  y += sectionGap;
  ctx.fillStyle = "#2f6f5e";
  ctx.font = "700 12px Nunito, sans-serif";
  ctx.fillText(lang === "en" ? "BENEFIT · GENTLE STRETCH REFERENCE" : "現代肩頸科普・非醫療建議", 32, y);
  ctx.fillStyle = "#4b5b54";
  ctx.font = "500 11.5px Nunito, sans-serif";
  wrapText(ctx, cardField(card, "benefit", lang), 32, y + 16, 370, bodyLH);

  // Qi-Pulse watermark + seal.
  ctx.save();
  ctx.fillStyle = "rgba(183,71,47,0.82)";
  ctx.beginPath();
  ctx.arc(566, 348, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "700 16px serif";
  ctx.textAlign = "center";
  ctx.fillText("氣", 566, 355);
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(47,111,94,0.72)";
  ctx.font = "600 13px Nunito, sans-serif";
  ctx.fillText("Qi-Pulse 氣脈陪練", 32, 375);
  ctx.textAlign = "right";
  ctx.font = "500 11px Nunito, sans-serif";
  ctx.fillText(
    isComplete ? "COMPLETE MASTER CARD" : `FRAGMENT ${card.fragmentIndex}/3`,
    608,
    375,
  );
  ctx.restore();

  ctx.strokeStyle = "rgba(47,111,94,0.22)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(32, 386);
  ctx.lineTo(608, 386);
  ctx.stroke();
}

/**
 * 卡背 PNG（800×1200）：功用 / 出處 / 針對肌群 / 要點 / 克制說明。
 * 對應結果頁翻過來的那一面，可單獨下載。
 */
export async function drawCardBackCanvas(canvas, card, options = {}) {
  if (!canvas || !card) return canvas;
  const lang = options.lang || "zh";
  const scale = 2;
  const w = 400;
  const h = 600;
  if (canvas.width !== w * scale) canvas.width = w * scale;
  if (canvas.height !== h * scale) canvas.height = h * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);

  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, "#f9f5ea");
  grad.addColorStop(0.6, "#f2ecdd");
  grad.addColorStop(1, "#e9e6d7");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // 遠山淡墨
  ctx.fillStyle = "rgba(120,170,150,0.1)";
  ctx.beginPath();
  ctx.moveTo(0, 500);
  ctx.bezierCurveTo(120, 440, 270, 530, 400, 470);
  ctx.lineTo(400, 600);
  ctx.lineTo(0, 600);
  ctx.fill();

  ctx.strokeStyle = "rgba(47,111,94,0.35)";
  ctx.lineWidth = 1;
  roundRect(ctx, 14, 14, w - 28, h - 28, 10);
  ctx.stroke();
  ctx.strokeStyle = "rgba(165,53,43,0.25)";
  roundRect(ctx, 20, 20, w - 40, h - 40, 7);
  ctx.stroke();

  ctx.fillStyle = "#a5352b";
  ctx.font = "700 11px Nunito, sans-serif";
  ctx.fillText(lang === "en" ? "CARD BACK · QI-PULSE" : "招式卡背・氣脈陪練", 32, 46);
  ctx.fillStyle = "#a5352b";
  ctx.font = "800 13px serif";
  ctx.textAlign = "right";
  ctx.fillText(tileNumber(card), 368, 46);
  ctx.textAlign = "left";

  ctx.fillStyle = "#1c2a26";
  ctx.font = "700 24px serif";
  let y = wrapText(ctx, cardField(card, "title", "zh"), 32, 82, 336, 30);
  ctx.fillStyle = "#5a6b64";
  ctx.font = "500 11.5px Nunito, sans-serif";
  y = wrapText(ctx, cardField(card, "title", "en"), 32, y + 18, 336, 15);
  ctx.strokeStyle = "rgba(165,53,43,0.35)";
  ctx.beginPath();
  ctx.moveTo(32, y + 6);
  ctx.lineTo(368, y + 6);
  ctx.stroke();
  y += 22;

  const section = (label, value) => {
    ctx.fillStyle = "#a5352b";
    ctx.font = "700 11px serif";
    ctx.fillText(label, 32, y);
    ctx.fillStyle = "#3b4a43";
    ctx.font = "500 11.5px Nunito, sans-serif";
    y = wrapText(ctx, value, 32, y + 16, 336, 15) + 10;
  };
  section(lang === "en" ? "FUNCTION" : "功用", cardField(card, "function", lang));
  section(lang === "en" ? "ORIGIN" : "傳統武術出處", cardField(card, "origin", lang));
  section(lang === "en" ? "MUSCLES INVOLVED" : "針對肌群", cardField(card, "muscles", lang));

  ctx.fillStyle = "#a5352b";
  ctx.font = "700 11px serif";
  ctx.fillText(lang === "en" ? "KEY POINTS" : "核心要點", 32, y);
  y += 16;
  ctx.fillStyle = "#3b4a43";
  ctx.font = "500 11px Nunito, sans-serif";
  for (const point of cardField(card, "keyPoints", lang) || []) {
    y = wrapText(ctx, `· ${point}`, 32, y, 336, 14) + 2;
  }
  y += 8;
  if (y < 540) {
    ctx.fillStyle = "#7d857f";
    ctx.font = "500 9.5px Nunito, sans-serif";
    wrapText(ctx, cardField(card, "benefit", lang), 32, y, 336, 13);
  }

  ctx.fillStyle = "rgba(183,71,47,0.85)";
  ctx.beginPath();
  ctx.arc(340, 552, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "700 15px serif";
  ctx.textAlign = "center";
  ctx.fillText("氣", 340, 558);
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(47,111,94,0.72)";
  ctx.font = "600 12px Nunito, sans-serif";
  ctx.fillText("Qi-Pulse 氣脈陪練", 32, 566);
  return canvas;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
  }
}

/** 逐 px 縮小字級，直到文字能單行放進 maxWidth。 */
function fitFont(ctx, text, maxWidth, baseSize, minSize, family, weight = 700) {
  let size = baseSize;
  while (size > minSize) {
    ctx.font = `${weight} ${size}px ${family}`;
    if (ctx.measureText(String(text || "")).width <= maxWidth) break;
    size -= 1;
  }
  return size;
}

/** 中文避頭點：句讀符號不可以落在行首。 */
const NO_LINE_START = new Set("。，、；：！？）〕】》」』%,.;:!?)");

/** Returns the y after the last line (so callers can stack sections). */
function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const chars = String(text || "").split("");
  let line = "";
  let yy = y;
  for (const ch of chars) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line) {
      if (NO_LINE_START.has(ch)) {
        // 讓標點留在上一行（容許極輕微超寬），避免孤字成行。
        ctx.fillText(line + ch, x, yy);
        line = "";
      } else {
        ctx.fillText(line, x, yy);
        line = ch;
      }
      yy += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) {
    ctx.fillText(line, x, yy);
    yy += lineHeight;
  }
  return yy;
}

/** Cross-platform (macOS / Windows) PNG download via toBlob. */
export function downloadCardImage(canvas, card, suffix = "") {
  return new Promise((resolve) => {
    if (!canvas || !card || typeof canvas.toBlob !== "function") {
      resolve(false);
      return;
    }
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve(false);
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `qi-pulse-${card.id}${suffix}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      resolve(true);
    }, "image/png");
  });
}

export function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export { CARD_CATALOG, MASTER_CARD };
