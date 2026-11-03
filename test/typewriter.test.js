import test from "node:test";
import assert from "node:assert/strict";
import { sanitizePartialMarkdown } from "../src/lib/sanitizePartialMarkdown.js";

test("sanitizePartialMarkdown returns empty string for null or empty text", () => {
  assert.equal(sanitizePartialMarkdown(null), "");
  assert.equal(sanitizePartialMarkdown(""), "");
});

test("sanitizePartialMarkdown leaves balanced markdown untouched", () => {
  const completeText = "Here is **bold** text and `inline code` and a block:\n```js\nconsole.log(1);\n```";
  assert.equal(sanitizePartialMarkdown(completeText), completeText);
});

test("sanitizePartialMarkdown closes unclosed triple backtick code fences", () => {
  const partial = "Here is code:\n```js\nconst x = 10;";
  const expected = "Here is code:\n```js\nconst x = 10;\n```";
  assert.equal(sanitizePartialMarkdown(partial), expected);
});

test("sanitizePartialMarkdown closes unclosed single backtick inline code", () => {
  const partial = "Try using `const x = 5";
  const expected = "Try using `const x = 5`";
  assert.equal(sanitizePartialMarkdown(partial), expected);
});

test("sanitizePartialMarkdown closes unclosed block LaTeX $$ delimiters", () => {
  const partial = "The formula is:\n$$\\int_0^1 f(x)dx";
  const expected = "The formula is:\n$$\\int_0^1 f(x)dx\n$$";
  assert.equal(sanitizePartialMarkdown(partial), expected);
});

test("sanitizePartialMarkdown closes unclosed inline LaTeX $ math delimiters", () => {
  const partial = "When $x > 0";
  const expected = "When $x > 0$";
  assert.equal(sanitizePartialMarkdown(partial), expected);
});
