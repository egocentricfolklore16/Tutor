import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LUMO_CATEGORIES,
  LUMO_PROMPTS,
  FEATURED_PROMPTS,
  hasPlaceholder,
  getPromptsByCategory,
  getLumoGreeting,
  formatPromptForProfile,
} from '../src/lib/lumoPrompts.js';

test('LUMO_CATEGORIES contains expected standard categories', () => {
  assert.ok(Array.isArray(LUMO_CATEGORIES));
  assert.ok(LUMO_CATEGORIES.length >= 4);

  const categoryIds = LUMO_CATEGORIES.map((c) => c.id);
  assert.ok(categoryIds.includes('explain'));
  assert.ok(categoryIds.includes('practice'));
  assert.ok(categoryIds.includes('study_plan'));
  assert.ok(categoryIds.includes('summarize'));
  assert.ok(categoryIds.includes('exam_help'));
});

test('LUMO_PROMPTS has 4-5 prompts for each category', () => {
  assert.ok(Array.isArray(LUMO_PROMPTS));
  assert.ok(LUMO_PROMPTS.length >= 16);

  LUMO_CATEGORIES.forEach((cat) => {
    const promptsInCat = LUMO_PROMPTS.filter((p) => p.category === cat.id);
    assert.ok(
      promptsInCat.length >= 4,
      `Category ${cat.id} should have at least 4 prompts, found ${promptsInCat.length}`
    );
  });
});

test('hasPlaceholder identifies prompts with [placeholder] brackets', () => {
  assert.strictEqual(hasPlaceholder('Explain [topic] simply, then give a real-life example'), true);
  assert.strictEqual(hasPlaceholder('Quiz me on [topic] with 5 questions, then grade my answers.'), true);
  assert.strictEqual(hasPlaceholder('Summarize these notes into key points and flashcards.'), false);
  assert.strictEqual(hasPlaceholder('Help me study!'), false);
  assert.strictEqual(hasPlaceholder(null), false);
  assert.strictEqual(hasPlaceholder(undefined), false);
});

test('getPromptsByCategory correctly filters prompts', () => {
  const explainPrompts = getPromptsByCategory('explain');
  assert.ok(explainPrompts.length >= 4);
  assert.ok(explainPrompts.every((p) => p.category === 'explain'));

  const allPrompts = getPromptsByCategory('all');
  assert.strictEqual(allPrompts.length, LUMO_PROMPTS.length);
});

test('FEATURED_PROMPTS contains non-empty featured prompts', () => {
  assert.ok(Array.isArray(FEATURED_PROMPTS));
  assert.ok(FEATURED_PROMPTS.length >= 4);
  assert.ok(FEATURED_PROMPTS.every((p) => Boolean(p.text && p.label)));
});

test('getLumoGreeting generates personalized greeting based on profile', () => {
  assert.strictEqual(
    getLumoGreeting({ full_name: 'Jules Student', subjects: ['Math'] }),
    "Hi Jules, I'm Lumo. Ready to work on Math?"
  );

  assert.strictEqual(
    getLumoGreeting({ full_name: 'Alex Developer', settings_subject: 'Computer science' }),
    "Hi Alex, I'm Lumo. Ready to work on Computer science?"
  );

  assert.strictEqual(
    getLumoGreeting({ full_name: 'Sarah' }),
    "Hi Sarah, I'm Lumo. What are we studying?"
  );

  assert.strictEqual(
    getLumoGreeting(null),
    "Hi, I'm Lumo. What are we studying?"
  );

  assert.strictEqual(
    getLumoGreeting({}),
    "Hi, I'm Lumo. What are we studying?"
  );
});

test('formatPromptForProfile replaces placeholders with profile values safely', () => {
  const profile = {
    full_name: 'Alex Student',
    current_topic: 'Calculus',
    subjects: ['Math'],
  };

  assert.strictEqual(
    formatPromptForProfile('Explain [topic] simply, then give a real-life example.', profile),
    'Explain Calculus simply, then give a real-life example.'
  );

  assert.strictEqual(
    formatPromptForProfile('Help me review [subject] for 2 hours.', profile),
    'Help me review Math for 2 hours.'
  );

  // When profile has no current_topic or subjects, original placeholder remains
  assert.strictEqual(
    formatPromptForProfile('Explain [topic] simply.', {}),
    'Explain [topic] simply.'
  );

  // Invalid or null inputs return fallback safely
  assert.strictEqual(formatPromptForProfile(null, profile), '');
  assert.strictEqual(formatPromptForProfile('Hello [topic]', null), 'Hello [topic]');
});
