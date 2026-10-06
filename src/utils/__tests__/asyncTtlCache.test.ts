import test from 'node:test';
import assert from 'node:assert/strict';

import { createAsyncTtlCache } from '../asyncTtlCache.ts';

test('coalesces concurrent loads and serves the cached value until expiry', async () => {
  let now = 100;
  let loadCount = 0;
  const getValue = createAsyncTtlCache(async () => {
    loadCount += 1;
    return loadCount;
  }, 50, () => now);

  const [first, concurrent] = await Promise.all([getValue(), getValue()]);
  assert.equal(first, 1);
  assert.equal(concurrent, 1);
  assert.equal(await getValue(), 1);
  assert.equal(loadCount, 1);

  now = 151;
  assert.equal(await getValue(), 2);
  assert.equal(loadCount, 2);
});

test('does not cache failed loads', async () => {
  let loadCount = 0;
  const getValue = createAsyncTtlCache(async () => {
    loadCount += 1;
    if (loadCount === 1) throw new Error('temporary read failure');
    return 'loaded';
  }, 50);

  await assert.rejects(getValue(), /temporary read failure/);
  assert.equal(await getValue(), 'loaded');
  assert.equal(loadCount, 2);
});
