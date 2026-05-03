/**
 * UI sounds: HTMLAudioElement from `/public/sounds` (same path for chat + notifications).
 * Browsers treat these consistently once the tab has had user interaction (typing in chat counts).
 */

const base = (process.env.PUBLIC_URL || "").replace(/\/$/, "");

const URLS = {
  incomingMessage: `${base}/sounds/incoming-message.mp3`,
  chatMessagePop: `${base}/sounds/chat-message-pop.mp3`,
  sendMessage: `${base}/sounds/send-message.wav`,
  chatbotOpenVoice: `${base}/sounds/Friendly_AI_voice.mp3`,
  /** Bell: primed on first user gesture like other UI sounds (autoplay policy). */
  notificationBell: `${base}/sounds/notification.wav`,
};

const NOTIFICATION_SOUND_KEY = "notificationBell";

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

/** Explicit flag: bell / notification path should mute the next chat incoming sounds (not time-based only). */
let suppressNextChatIncoming = false;
let suppressChatIncomingTimer = null;

const DEFAULT_BELL_CHAT_SUPPRESS_MS = 1500;

/**
 * Call when a notification event arrives (before or without playNotificationSound).
 * Resets the timer on each call so overlapping events stay covered.
 */
export function armSuppressChatIncomingForNotification(
  ms = DEFAULT_BELL_CHAT_SUPPRESS_MS
) {
  suppressNextChatIncoming = true;
  if (suppressChatIncomingTimer) {
    clearTimeout(suppressChatIncomingTimer);
    suppressChatIncomingTimer = null;
  }
  suppressChatIncomingTimer = setTimeout(() => {
    suppressNextChatIncoming = false;
    suppressChatIncomingTimer = null;
  }, ms);
}

/**
 * Group chat: skip playChatIncomingSound while a bell notification is active
 * (`message` + `notification_count_update` often arrive together; count path used to arm too late).
 */
export function shouldSuppressChatIncomingSound() {
  return suppressNextChatIncoming;
}

let lastNotificationDebounceAt = 0;
const NOTIFICATION_SOUND_DEBOUNCE_MS = 400;

/**
 * Bell only (SocketContext). Plays `notification.wav`.
 * Never uses chat-message-pop. Fresh Audio() so cache cannot swap files with chat.
 */
export function playNotificationSound() {
  const now = Date.now();
  if (now - lastNotificationDebounceAt < NOTIFICATION_SOUND_DEBOUNCE_MS) return;
  lastNotificationDebounceAt = now;

  armSuppressChatIncomingForNotification(DEFAULT_BELL_CHAT_SUPPRESS_MS);
  playKey(NOTIFICATION_SOUND_KEY);
}

export function playChatSendSound() {
  playKey("sendMessage");
}

export function playChatbotOpenVoice() {
  const url = URLS.chatbotOpenVoice;
  if (!url) return;

  try {
    // Use a fresh element for this long voice clip to avoid stale cached state.
    const freshAudio = new Audio(url);
    freshAudio.preload = "auto";
    freshAudio.volume = 1;
    freshAudio.currentTime = 0;
    const playPromise = freshAudio.play();

    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {
        playKey("chatbotOpenVoice");
      });
    }
  } catch (_) {
    playKey("chatbotOpenVoice");
  }
}
