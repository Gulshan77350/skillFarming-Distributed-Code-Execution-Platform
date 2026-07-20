import { test } from 'node:test';
import assert from 'node:assert';
import { normalize, kGrams, similarity } from './index';

test('normalize should strip comments and collapse whitespace', () => {
  const code = `
# This is a comment
def add(a, b):
    # Another comment
    return a + b
  `;
  const result = normalize(code);
  assert.strictEqual(result, 'def add(a, b): return a + b');
});

test('kGrams should generate correct sequences', () => {
  const text = 'def add a b return a + b';
  const grams = kGrams(text, 3);
  assert.ok(grams.has('def add a'));
  assert.ok(grams.has('add a b'));
  assert.ok(grams.has('a b return'));
  assert.strictEqual(grams.size, 6);
});

test('similarity should return correct Jaccard coefficient', () => {
  const a = new Set(['one two', 'two three', 'three four']);
  const b = new Set(['two three', 'three four', 'four five']);
  
  // intersection = 2 ('two three', 'three four')
  // union = 4
  // similarity = 2/4 = 0.5
  assert.strictEqual(similarity(a, b), 0.5);
});
