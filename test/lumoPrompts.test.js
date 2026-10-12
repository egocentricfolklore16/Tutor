import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  LUMO_CATEGORIES,
  LUMO_PROMPTS,
  hasPlaceholder,
  extractPlaceholders,
  getPromptsByCategory,
  searchPrompts,
} from '../src/lib/lumoPrompts.js';

describe('Lumo Ready-Made Prompts Config', () => {
  test('contains 5 categories', () => {
    assert.equal(LUMO_CATEGORIES.length, 5);
    const expectedCategories = ['explain', 'practice', 'study_plan', 'summarize', 'exam_help'];
    assert.deepEqual(LUMO_CATEGORIES.map((c) => c.id), expectedCategories);
  });

  test('contains exactly 25 prompts (5 per category)', () => {
    assert.equal(LUMO_PROMPTS.length, 25);
    const categoryCounts = {};
    for (const prompt of LUMO_PROMPTS) {
      categoryCounts[prompt.category] = (categoryCounts[prompt.category] || 0) + 1;
    }
    assert.equal(categoryCounts.explain, 5);
    assert.equal(categoryCounts.practice, 5);
    assert.equal(categoryCounts.study_plan, 5);
    assert.equal(categoryCounts.summarize, 5);
    assert.equal(categoryCounts.exam_help, 5);
  });

  test('every prompt has all required fields', () => {
    for (const p of LUMO_PROMPTS) {
      assert.ok(p.id, `Missing id for prompt ${p.title}`);
      assert.ok(p.category, `Missing category for prompt ${p.id}`);
      assert.ok(p.title, `Missing title for prompt ${p.id}`);
      assert.ok(p.description, `Missing description for prompt ${p.id}`);
      assert.ok(p.icon, `Missing icon for prompt ${p.id}`);
      assert.ok(p.prompt, `Missing full prompt text for ${p.id}`);
    }
  });

  test('every prompt word count is at least 120 words', () => {
    for (const p of LUMO_PROMPTS) {
      const words = p.prompt.trim().split(/\s+/).length;
      assert.ok(
        words >= 120,
        `Prompt "${p.title}" (${p.id}) has ${words} words, which is below the 120-word minimum requirement.`
      );
    }
  });

  test('every prompt follows the required structural sections', () => {
    const requiredKeywords = ['ROLE:', 'CONTEXT:', 'TASK:', 'PROCESS:', 'OUTPUT FORMAT:', 'QUALITY RULES:', 'ENDING:'];
    for (const p of LUMO_PROMPTS) {
      for (const kw of requiredKeywords) {
        assert.ok(
          p.prompt.includes(kw),
          `Prompt "${p.title}" (${p.id}) is missing structural section "${kw}"`
        );
      }
    }
  });

  test('quality bar prompts match exact requirements', () => {
    const deepExplanation = LUMO_PROMPTS.find((p) => p.id === 'exp-1');
    assert.ok(deepExplanation);
    assert.equal(deepExplanation.title, 'Deep Explanation');

    const quizMe = LUMO_PROMPTS.find((p) => p.id === 'prac-1');
    assert.ok(quizMe);
    assert.equal(quizMe.title, 'Quiz Me');

    const sevenDayPlan = LUMO_PROMPTS.find((p) => p.id === 'plan-1');
    assert.ok(sevenDayPlan);
    assert.equal(sevenDayPlan.title, '7-Day Study Plan');

    const notesToKeyPoints = LUMO_PROMPTS.find((p) => p.id === 'sum-1');
    assert.ok(notesToKeyPoints);
    assert.equal(notesToKeyPoints.title, 'Notes to Key Points and Flashcards');

    const pastQuestions = LUMO_PROMPTS.find((p) => p.id === 'exam-1');
    assert.ok(pastQuestions);
    assert.equal(pastQuestions.title, 'Past-Question-Style Practice');
  });

  test('placeholder utility functions work correctly', () => {
    const promptWithPlaceholders = 'Explain [TOPIC] for a [LEVEL] student.';
    const promptWithoutPlaceholders = 'Give me a summary.';

    assert.equal(hasPlaceholder(promptWithPlaceholders), true);
    assert.equal(hasPlaceholder(promptWithoutPlaceholders), false);

    assert.deepEqual(extractPlaceholders(promptWithPlaceholders), ['[TOPIC]', '[LEVEL]']);
    assert.deepEqual(extractPlaceholders(promptWithoutPlaceholders), []);
  });

  test('category filtering and search helper functions work correctly', () => {
    const explainPrompts = getPromptsByCategory('explain');
    assert.equal(explainPrompts.length, 5);

    const searchResult = searchPrompts('quiz', 'all');
    assert.ok(searchResult.some((p) => p.title.toLowerCase().includes('quiz')));
  });
});
