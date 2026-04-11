/**
 * UI sounds: HTMLAudioElement from `/public/sounds` (same path for chat + notifications).
 * Browsers treat these consistently once the tab has had user interaction (typing in chat counts).
 */

const base = process.env.PUBLIC_URL || "";

const URLS = {
  incomingMessage: `${base}/sounds/incoming-message.mp3`,
  chatMessagePop: `${base}/sounds/chat-message-pop.mp3`,
  sendMessage: `${base}/sounds/send-message.wav`,
  /** MP3: same decode path as chat sounds; replace file to customize tone */
  notification: `${base}/sounds/notification.mp3`,
  notificationWavFallback: `${base}/sounds/notification.wav`,
};

const cache = {};

let unlockListenersAttached = false;

/**
 * Registers listeners: first pointer/key primes cached Audio elements (helps autoplay on some browsers).
 */
export function ensureUiSoundsUnlocked() {
  if (typeof document === "undefined" || unlockListenersAttached) return;
  unlockListenersAttached = true;

  const primeAll = () => {
    Object.keys(URLS).forEach((key) => {
      try {
        const url = URLS[key];
        if (!cache[key]) {
          cache[key] = new Audio(url);
          cache[key].preload = "auto";
        }
        const a = cache[key];
        const vol = a.volume;
        a.volume = 0.01;
        const p = a.play();
        if (p && typeof p.then === "function") {
          p.then(() => {
            a.pause();
            a.currentTime = 0;
            a.volume = vol;
          }).catch(() => {
            a.volume = vol;
          });
        } else {
          a.volume = vol;
        }
      } catch (_) {
        /* ignore */
      }
    });

    document.removeEventListener("pointerdown", primeAll, true);
    document.removeEventListener("keydown", primeAll, true);
  };

  document.addEventListener("pointerdown", primeAll, { capture: true });
  document.addEventListener("keydown", primeAll, { capture: true });
}

function playKey(key, onPlayRejected) {
  const url = URLS[key];
  if (!url) return;
  try {
    if (!cache[key]) {
      cache[key] = new Audio(url);
      cache[key].preload = "auto";
    }
    const el = cache[key];
    el.volume = 1;
    el.currentTime = 0;
    const p = el.play();
    if (p && typeof p.catch === "function") {
      p.catch(() => {
        if (typeof onPlayRejected === "function") onPlayRejected();
      });
    }
  } catch (_) {
    if (typeof onPlayRejected === "function") onPlayRejected();
  }
}

export function playChatIncomingSound(isActiveThread) {
  playKey(isActiveThread ? "chatMessagePop" : "incomingMessage");
}

let lastNotificationSoundAt = 0;
const NOTIFICATION_SOUND_DEBOUNCE_MS = 400;

/**
 * Same HTMLAudio stack as chat; debounced when `new_notification` + `notification_count_update` fire together.
 * Falls back: notification.mp3 → notification.wav → chat pop (short) if a source fails to play.
 */
export function playNotificationSound() {
  const now = Date.now();
  if (now - lastNotificationSoundAt < NOTIFICATION_SOUND_DEBOUNCE_MS) return;
  lastNotificationSoundAt = now;

  playKey("notification", () => {
    playKey("notificationWavFallback", () => {
      playKey("chatMessagePop");
    });
  });
}

export function playChatSendSound() {
  playKey("sendMessage");
}
