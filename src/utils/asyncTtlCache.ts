export const createAsyncTtlCache = <T>(
  load: () => Promise<T>,
  ttlMs: number,
  now: () => number = Date.now
): (() => Promise<T>) => {
  let cachedValue: T;
  let hasCachedValue = false;
  let expiresAt = 0;
  let inFlight: Promise<T> | null = null;

  return () => {
    if (hasCachedValue && now() < expiresAt) {
      return Promise.resolve(cachedValue);
    }
    if (inFlight) return inFlight;

    const request = Promise.resolve()
      .then(load)
      .then((value) => {
        cachedValue = value;
        hasCachedValue = true;
        expiresAt = now() + ttlMs;
        return value;
      })
      .finally(() => {
        if (inFlight === request) inFlight = null;
      });

    inFlight = request;
    return request;
  };
};
