type RequestLoadingDetail = {
  active: boolean;
};

let activeRequestCount = 0;

const notifyRequestState = () => {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(
    new CustomEvent<RequestLoadingDetail>('jobpoyt:api-loading', {
      detail: { active: activeRequestCount > 0 },
    }),
  );
};

export const trackedFetch: typeof fetch = async (input, init) => {
  activeRequestCount += 1;
  notifyRequestState();

  try {
    return await fetch(input, init);
  } finally {
    activeRequestCount = Math.max(0, activeRequestCount - 1);
    notifyRequestState();
  }
};
