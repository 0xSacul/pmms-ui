const IS_DEV = import.meta.env.DEV;

function getResourceName() {
  try {
    return typeof GetParentResourceName !== 'undefined'
      ? GetParentResourceName()
      : 'pmms';
  } catch {
    return 'pmms';
  }
}

export async function sendNui(endpoint, data = {}) {
  if (IS_DEV) {
    const { mockResponse } = await import('./mock.js');
    return mockResponse(endpoint, data);
  }

  return fetch(`https://${getResourceName()}/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export function onNuiEvent(type, cb) {
  function handler(event) {
    if (event.data?.type === type) cb(event.data);
  }
  window.addEventListener('message', handler);
  return () => window.removeEventListener('message', handler);
}
