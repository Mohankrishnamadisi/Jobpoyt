export interface NotificationDateFields {
  id: string;
  created_at?: string | null;
  createdAt?: string | null;
}

export const getNotificationDate = (notification: NotificationDateFields): string =>
  notification.created_at || notification.createdAt || '';

export const sortAndDedupeNotifications = <T extends NotificationDateFields>(items: T[]): T[] => {
  const byId = new Map<string, T>();
  for (const notification of items) {
    const existing = byId.get(notification.id);
    if (!existing || new Date(getNotificationDate(notification)) >= new Date(getNotificationDate(existing))) {
      byId.set(notification.id, notification);
    }
  }
  return Array.from(byId.values())
    .sort((left, right) =>
      new Date(getNotificationDate(right)).getTime() - new Date(getNotificationDate(left)).getTime()
    );
};

export const groupNotificationsByDay = <T extends NotificationDateFields>(
  items: T[],
  today = new Date(),
): { today: T[]; earlier: T[] } => {
  const todayKey = today.toDateString();
  const groups = { today: [] as T[], earlier: [] as T[] };
  for (const notification of items) {
    const occurredAt = getNotificationDate(notification);
    if (occurredAt && new Date(occurredAt).toDateString() === todayKey) {
      groups.today.push(notification);
    } else {
      groups.earlier.push(notification);
    }
  }
  return groups;
};
