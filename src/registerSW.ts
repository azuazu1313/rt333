import { Workbox } from 'workbox-window';

export function registerSW() {
  if ('serviceWorker' in navigator) {
    const wb = new Workbox('/service-worker.js');

    wb.addEventListener('installed', (event) => {
      if (event.isUpdate) {
        if (confirm('New version available! Reload to update?')) {
          window.location.reload();
        }
      }
    });

    wb.addEventListener('activated', (event) => {
      // Get all open windows/tabs
      if (event.isUpdate) {
        console.log('Service Worker has been updated and activated');
      } else {
        console.log('Service Worker has been installed and activated');
      }
    });

    wb.addEventListener('waiting', (event) => {
      console.log('Service Worker is waiting to be activated');
    });

    // Register the service worker
    wb.register()
      .then((registration) => {
        console.log('Service Worker registered with scope:', registration.scope);
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error);
      });
  } else {
    console.log('Service Worker is not supported in this browser');
  }
}