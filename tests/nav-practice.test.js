import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const html = readFileSync(join(ROOT, "index.html"), "utf8");

test("practice link sits outside the collapsed card shell", () => {
  const dockStart = html.indexOf('<main class="dock">');
  const shellStart = html.indexOf('id="card-shell"', dockStart);
  const practiceLink = html.indexOf('id="go-practice"', dockStart);
  assert.ok(dockStart >= 0);
  assert.ok(shellStart > dockStart);
  assert.ok(practiceLink > dockStart);
  assert.ok(practiceLink < shellStart, "go-practice must be visible before card-shell");
  assert.match(html, /href="practice\.html"/);
});

test("pet click schedules practice navigation; double-click still alerts", () => {
  assert.match(html, /schedulePracticeNav/);
  assert.match(html, /cancelPendingPracticeNav/);
  assert.match(html, /goToPractice/);
  assert.match(html, /practice\.html/);
  assert.match(html, /triggerAlert/);
});

test("practice.html exists as a sibling static page", () => {
  const practice = readFileSync(join(ROOT, "practice.html"), "utf8");
  assert.match(practice, /bootPractice/);
});
