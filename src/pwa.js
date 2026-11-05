/**
 * PWA lifecycle: service worker, offline badge, install prompt.
 *
 * The service worker precaches the app shell plus the vendored MediaPipe
 * runtime. After the first successful install, Glipter has no network
 * dependency at runtime.
 */
export function initPWA({ onStatus, onInstallAvailable } = {}) {
  let deferredPrompt = null;
  let offlineReady = false;
  const status = (value) => onStatus?.(value);

  let progress = null;

  const updateOnlineState = () => {
    status({
      online: navigator.onLine,
      offlineReady,
      installed: window.matchMedia("(display-mode: standalone)").matches
        || window.navigator.standalone === true,
      progress,
    });
  };

  navigator.serviceWorker?.addEventListener?.("message", (event) => {
    const data = event.data;
    if (data?.type !== "GLIPTER_PRECACHE") return;
    progress = { done: data.done, total: data.total, failed: data.failed };
    if (data.done >= data.total) offlineReady = data.failed === 0;
    updateOnlineState();
  });

  window.addEventListener("online", updateOnlineState);
  window.addEventListener("offline", updateOnlineState);

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    onInstallAvailable?.(true);
    updateOnlineState();
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    onInstallAvailable?.(false);
    updateOnlineState();
  });

  async function install() {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    deferredPrompt = null;
    onInstallAvailable?.(false);
    return choice?.outcome === "accepted";
  }

  async function register() {
    if (!("serviceWorker" in navigator)) {
      status({ online: navigator.onLine, offlineReady: false, supported: false });
      return;
    }
    if (!window.isSecureContext) {
      status({ online: navigator.onLine, offlineReady: false, secure: false });
      return;
    }
    try {
      const registration = await navigator.serviceWorker.register("./sw.js", { scope: "./" });
      // If an old worker is already controlling the page, this is still
      // "offline ready" because the cache was populated on the first visit.
      await navigator.serviceWorker.ready;
      offlineReady = true;
      if (navigator.storage?.persist) {
        navigator.storage.persist().catch(() => {});
      }
      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        worker?.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) {
            status({ online: navigator.onLine, offlineReady: true, updated: true });
          }
        });
      });
      updateOnlineState();
    } catch (error) {
      status({ online: navigator.onLine, offlineReady: false, error: error.message });
    }
  }

  updateOnlineState();
  register();

  return {
    install,
    get offlineReady() { return offlineReady; },
    get canInstall() { return Boolean(deferredPrompt); },
  };
}
