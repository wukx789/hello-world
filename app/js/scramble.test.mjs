import { tokenize, scramble, tokensMatch, joinTokens } from "./scramble.js";
import assert from "node:assert/strict";

const sample = "The city will open new bike lanes along the river this weekend.";
const tokens = tokenize(sample);
assert.equal(tokens[0], "The");
assert.equal(tokens.at(-1), "weekend.");
assert.ok(tokens.includes("lanes"));

const shuffled = scramble(tokens, () => 0.2);
assert.equal(shuffled.length, tokens.length);
assert.notEqual(shuffled.join(" "), tokens.join(" "));

assert.equal(joinTokens(["Hello", "world", "!"]), "Hello world!");
assert.equal(tokensMatch(["a", "b."], ["a", "b."]), true);
assert.equal(tokensMatch(["a", "b"], ["a", "c"]), false);

console.log("scramble.test.mjs ok");
