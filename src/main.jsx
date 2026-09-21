import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'antd/dist/reset.css'
import './index.css'
import App from './App.tsx'

// Keep the browser's one-time install event available until the install UI mounts.
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  window.__jobpoytDeferredInstallPrompt = event;
  window.dispatchEvent(new CustomEvent('pwa:beforeinstallprompt'));
}, { once: true });

const registerServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });

    const notifyUpdateAvailable = () => {
      window.dispatchEvent(new CustomEvent('app-sw-update-available', { detail: registration }));
    };

    navigator.serviceWorker.addEventListener('controllerchange', notifyUpdateAvailable);

    if (registration.waiting) {
      notifyUpdateAvailable();
    }

    registration.addEventListener('updatefound', () => {
      const installingWorker = registration.installing;
      if (!installingWorker) return;

      installingWorker.addEventListener('statechange', () => {
        if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
          notifyUpdateAvailable();
        }
      });
    });
  } catch (err) {
    console.warn('SW registration failed', err);
  }
};

window.addEventListener('load', () => {
  registerServiceWorker();
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

