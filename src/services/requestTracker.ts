type RequestLoadingDetail = {
  active: boolean;
};

let activeRequestCount = 0;

const isSilentBackgroundRequest = (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  const method = (init?.method || (typeof input !== 'string' && !(input instanceof URL) ? input.method : 'GET')).toUpperCase();

  // These requests update secondary UI state or persist playback progress.
  // They must never cover an already-rendered page with the initial loader.
  return (
    url.includes('/functions/v1/career-assistant')
    || url.includes('/rest/v1/notifications')
    || url.includes('/rest/v1/free_notes')
    || url.includes('/auth/v1/token')
    || (method !== 'GET' && url.includes('/rest/v1/'))
  );
};

const notifyRequestState = () => {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(
    new CustomEvent<RequestLoadingDetail>('jobpoyt:api-loading', {
      detail: { active: activeRequestCount > 0 },
    }),
  );
};

export const trackedFetch: typeof fetch = async (input, init) => {
  const silent = isSilentBackgroundRequest(input, init);
  if (silent) return fetch(input, init);

  activeRequestCount += 1;
  notifyRequestState();

  try {
    return await fetch(input, init);
  } finally {
    activeRequestCount = Math.max(0, activeRequestCount - 1);
    notifyRequestState();
  }
};
