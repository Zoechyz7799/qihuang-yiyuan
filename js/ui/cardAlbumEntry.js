/**
 * Home-page entry into the 三國殺式 card album.
 *
 * Read-only from the home page: it shows the deterministic collection state
 * (unlocked fragments / master card / ink silhouettes). Unlocking still only
 * happens by finishing a form on practice.html.
 */

import { loadCollection } from "../core/cardFSM.js";
import { loadLang } from "../locale.js";
import {
  drawCardBackCanvas,
  drawCardCanvas,
  downloadCardImage,
  injectCardStyles,
  openCardAlbum,
} from "./cardUI.js";

export function bootCardAlbumEntry(doc = document) {
  const button = doc.querySelector("#open-card-album");
  if (!button) return null;
  injectCardStyles(doc);

  const lang = loadLang();
  if (lang === "en") button.textContent = "Card Album";
  button.addEventListener("click", () => {
    openCardAlbum({
      collection: loadCollection(),
      lang,
      doc,
      // 首頁沒有練習流程，點暗卡直接深連結到練習頁並自動選好該式。
      onPick: (segmentId) => {
        window.location.href = `practice.html?unlock=${encodeURIComponent(segmentId)}`;
      },
      onDownload: async (card, face = "front") => {
        const canvas = doc.createElement("canvas");
        if (face === "back") {
          await drawCardBackCanvas(canvas, card, { lang });
          await downloadCardImage(canvas, card, "-back");
        } else {
          await drawCardCanvas(canvas, card, { lang });
          await downloadCardImage(canvas, card);
        }
      },
    });
  });
  return button;
}

bootCardAlbumEntry();
