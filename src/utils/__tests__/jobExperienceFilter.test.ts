import test from 'node:test';
import assert from 'node:assert/strict';

import {
  collectDistinctExperienceValues,
  matchesJobExperience,
  parseJobExperience,
  parseRequestedExperience,
  selectMatchingExperienceValues,
} from '../jobExperienceFilter.ts';

const expectMatches = (requested: number, matches: string[], nonMatches: string[]) => {
  matches.forEach((value) => assert.equal(matchesJobExperience(value, requested), true, `${requested} should match "${value}"`));
  nonMatches.forEach((value) => assert.equal(matchesJobExperience(value, requested), false, `${requested} should not match "${value}"`));
};

test('requested experience 3', () => {
  expectMatches(
    3,
    ['Any Experience', '0-3 Years', '1-3 Years', '2-6 Years', '1-9 Years', '2-3 Years', '3 Years', '3+ Years', '0-5 Years'],
    ['4-6 Years', '5-8 Years', '8-10 Years', '10+ Years', '4+ Years', '13+ Years', '30 Years'],
  );
});

test('requested experience 5', () => {
  expectMatches(
    5,
    ['Any Experience', '2-6 Years', '1-9 Years', '3-5 Years', '5-8 Years', '5+ Years', '5 Years'],
    ['0-4 Years', '1-3 Years', '6-10 Years', '10+ Years'],
  );
});

test('requested experience 10', () => {
  expectMatches(
    10,
    ['Any Experience', '8-10 Years', '10+ Years', '10 Years', '5-12 Years', '1-10 Years'],
    ['4-6 Years', '1-9 Years', '8-9 Years', '11+ Years'],
  );
});

test('requested experience 1 and 8', () => {
  expectMatches(1, ['Any Experience', '0-1 Years', '1-3 Years', '1-5 Years', '1+ Years', '1 Years'], ['2-3 Years', '2+ Years']);
  expectMatches(8, ['Any Experience', '5-8 Years', '1-9 Years', '8-10 Years', '8+ Years'], ['1-7 Years', '9+ Years']);
});

test('Any Experience is included for every numeric search', () => {
  for (let years = 0; years <= 40; years += 1) {
    assert.equal(matchesJobExperience('Any Experience', years), true);
  }
});

test('normalizes spacing, case, dashes and surrounding text', () => {
  assert.deepEqual(parseJobExperience('Any experience'), { any: true });
  assert.deepEqual(parseJobExperience('ANY EXPERIENCE'), { any: true });
  assert.deepEqual(parseJobExperience('3+ years experience'), { any: false, min: 3, max: Infinity });
  assert.deepEqual(parseJobExperience('3 - 5 years'), { any: false, min: 3, max: 5 });
  assert.deepEqual(parseJobExperience(' 3-5 Years '), { any: false, min: 3, max: 5 });
  assert.deepEqual(parseJobExperience('3–5 Years'), { any: false, min: 3, max: 5 });
  assert.deepEqual(parseJobExperience('3 to 5 years'), { any: false, min: 3, max: 5 });
  assert.deepEqual(parseJobExperience('2-6 Years'), { any: false, min: 2, max: 6 });
  assert.deepEqual(parseJobExperience('3 Years'), { any: false, min: 3, max: 3 });
  assert.deepEqual(parseJobExperience('Freshers'), { any: false, min: 0, max: 0 });
});

test('malformed values do not crash and do not match', () => {
  [null, undefined, '', '   ', 'invalid text', 'Senior level'].forEach((value) => {
    assert.doesNotThrow(() => matchesJobExperience(value, 3));
    assert.equal(matchesJobExperience(value, 3), false);
  });
});

test('parses requested experience from the UI and URL', () => {
  assert.deepEqual(parseRequestedExperience('3'), { min: 3, max: 3 });
  assert.deepEqual(parseRequestedExperience(' 10 '), { min: 10, max: 10 });
  assert.deepEqual(parseRequestedExperience('3 years'), { min: 3, max: 3 });
  assert.deepEqual(parseRequestedExperience('0-1 years'), { min: 0, max: 1 });
  assert.equal(parseRequestedExperience(''), null);
  assert.equal(parseRequestedExperience('abc'), null);
});

test('Fresher Openings range 0-1 years', () => {
  const requested = parseRequestedExperience('0-1 years')!;
  ['Any Experience', 'Freshers', '0 Years', '0-1 Years', '1 Years'].forEach((value) =>
    assert.equal(matchesJobExperience(value, requested), true, value));
  ['1-2 Years', '0-2 Years', '1-3 Years', '3+ Years'].forEach((value) =>
    assert.equal(matchesJobExperience(value, requested), false, value));
});

test('selects the matching values from the live distinct set', () => {
  const live = ['0-1 Years', '0-2 Years', '1-3 Years', '10+ Years', '2-4 Years', '3-5 years', '3-5 Years', '3+ Years', '4-6 Years', '5-8 Years', '8-10 Years', '8+ Years', 'Any Experience'];
  assert.deepEqual(selectMatchingExperienceValues(live, 3), ['1-3 Years', '2-4 Years', '3-5 years', '3-5 Years', '3+ Years', 'Any Experience']);
  assert.deepEqual(selectMatchingExperienceValues(live, 5), ['3-5 years', '3-5 Years', '3+ Years', '4-6 Years', '5-8 Years', 'Any Experience']);
  assert.deepEqual(selectMatchingExperienceValues(live, 10), ['10+ Years', '3+ Years', '8-10 Years', '8+ Years', 'Any Experience']);
});

// Mimics PostgREST on job_listings: max 100 rows per response, exact count, ordered by created_at desc.
const ROW_CAP = 100;
const createCappedBackend = (rows: { id: number; experience: string }[]) => ({
  distinctPage: async (after: string | null) =>
    rows.map((row) => row.experience).filter((value) => after === null || value > after).sort().slice(0, ROW_CAP),
  page: (allowed: string[], from: number, to: number) => {
    const matching = rows.filter((row) => allowed.includes(row.experience));
    return { data: matching.slice(from, Math.min(to + 1, from + ROW_CAP)), count: matching.length };
  },
});

test('finds every match in a >100 row dataset behind a 100-row cap and paginates all of it', async () => {
  const mix = ['Any Experience', '1-3 Years', '2-6 Years', '3+ Years', '4-6 Years', '8-10 Years'];
  const rows = Array.from({ length: 300 }, (_, index) => ({ id: index, experience: mix[index % mix.length] }));
  const expected = rows.filter((row) => ['Any Experience', '1-3 Years', '2-6 Years', '3+ Years'].includes(row.experience));
  assert.equal(expected.length, 200);

  const backend = createCappedBackend(rows);
  const distinct = await collectDistinctExperienceValues(backend.distinctPage);
  assert.equal(distinct.length, mix.length);

  const allowed = selectMatchingExperienceValues(distinct, 3);
  const pageSize = 12;
  const first = backend.page(allowed, 0, pageSize - 1);
  assert.equal(first.count, 200);

  const seen = new Set<number>();
  const totalPages = Math.ceil(first.count / pageSize);
  for (let page = 1; page <= totalPages; page += 1) {
    const { data } = backend.page(allowed, (page - 1) * pageSize, page * pageSize - 1);
    data.forEach((row) => {
      assert.equal(matchesJobExperience(row.experience, 3), true);
      seen.add(row.id);
    });
  }
  assert.equal(seen.size, 200);
  assert.equal(totalPages, 17);
});

test('distinct discovery survives more than 100 distinct values', async () => {
  const rows = Array.from({ length: 250 }, (_, index) => ({ id: index, experience: `${String(index).padStart(3, '0')} Years` }));
  const distinct = await collectDistinctExperienceValues(createCappedBackend(rows).distinctPage);
  assert.equal(distinct.length, 250);
});
