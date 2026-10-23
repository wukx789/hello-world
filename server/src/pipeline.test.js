import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildPassagePayload, tokenize, tokensMatch } from "./pipeline.js";
import { chooseAnchorMask } from "./pos.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const news = JSON.parse(readFileSync(join(__dirname, "../data/news-fixture.json"), "utf8"));

const payload = buildPassagePayload(news.articles[0], {
  fetchedAt: news.fetchedAt,
  limit: 1,
  random: () => 0.42,
});

assert.equal(payload.exercises.length, 1);
const ex = payload.exercises[0];
assert.ok(ex.zh, "Chinese gloss present for default hint");
assert.ok(ex.slots.some((s) => s.isAnchor), "has anchors");
assert.ok(ex.slots.some((s) => !s.isAnchor), "has movable chips");
assert.equal(
  ex.slots.filter((s) => !s.isAnchor).length,
  ex.bank.length,
  "bank size matches movable slots"
);

const tokens = tokenize(ex.en);
const mask = chooseAnchorMask(tokens, { random: () => 0.3 });
assert.equal(mask.length, tokens.length);
assert.ok(mask.some(Boolean) && mask.some((x) => !x));

assert.equal(tokensMatch(["a", "b."], ["a", "b."]), true);
assert.equal(tokensMatch(["a"], ["b"]), false);

console.log("pipeline.test.js ok");
console.log(JSON.stringify({ headline: payload.headline, en: ex.en, anchors: ex.slots.filter((s) => s.isAnchor).map((s) => s.text), bank: ex.bank.map((b) => b.text) }, null, 2));
