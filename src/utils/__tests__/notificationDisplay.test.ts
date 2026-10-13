import test from 'node:test';
import assert from 'node:assert/strict';

import {
  groupNotificationsByDay,
  sortAndDedupeNotifications,
  type NotificationDateFields,
} from '../notificationDisplay.ts';

const notification = (id: string, created_at: string): NotificationDateFields => ({ id, created_at });

test('sorts notifications newest-first and removes duplicate IDs from refreshes', () => {
  const first = notification('same-id', '2026-10-12T09:00:00.000Z');
  const refreshed = notification('same-id', '2026-10-12T09:01:00.000Z');
  const oldest = notification('oldest', '2026-10-10T09:00:00.000Z');

  assert.deepEqual(sortAndDedupeNotifications([oldest, first, refreshed]), [refreshed, oldest]);
});

test('groups same-day notifications under Today and older or invalid timestamps under Earlier', () => {
  const today = new Date(2026, 9, 13, 12);
  const sameDay = notification('today', new Date(2026, 9, 13, 1).toISOString());
  const yesterday = notification('yesterday', new Date(2026, 9, 12, 23, 59).toISOString());
  const invalid = notification('invalid', 'not-a-timestamp');

  assert.deepEqual(groupNotificationsByDay([sameDay, yesterday, invalid], today), {
    today: [sameDay],
    earlier: [yesterday, invalid],
  });
});
