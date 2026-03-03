/**
 * Socket service – static helpers for Socket.IO connection, emit, and listeners.
 * No class instances. Pass socket as first argument.
 */

/**
 * Create a Socket.IO client connection.
 * @param {object} io - socket.io-client (e.g. import { io } from "socket.io-client")
 * @param {string} url - Server URL
 * @param {object} options - { auth: { token }, transports, reconnection, timeout, ... }
 * @returns {import("socket.io-client").Socket}
 */
export function connect(io, url, options = {}) {
  const normalizedUrl = (url || "").replace(/\/api$/, "");
  return io(normalizedUrl, {
    auth: options.auth ?? {},
    transports: options.transports ?? ["websocket", "polling"],
    reconnection: options.reconnection ?? false,
    reconnectionDelay: options.reconnectionDelay ?? 1000,
    reconnectionDelayMax: options.reconnectionDelayMax ?? 5000,
    reconnectionAttempts: options.reconnectionAttempts ?? Infinity,
    timeout: options.timeout ?? 20000,
    ...options,
  });
}

/**
 * Disconnect socket and clear reference.
 * @param {import("socket.io-client").Socket | null} socket
 */
export function disconnect(socket) {
  if (socket) {
    socket.disconnect();
  }
}

/**
 * Emit an event. No-op if socket is missing or not connected.
 * @param {import("socket.io-client").Socket | null} socket
 * @param {string} event
 * @param {any} data
 * @param {Function} [callback]
 * @returns {boolean} - whether emit was performed
 */
export function emit(socket, event, data, callback) {
  if (!socket) {
    if (typeof callback === "function") callback({ ok: false, message: "Socket not connected" });
    return false;
  }
  if (typeof data === "function" && callback === undefined) {
    callback = data;
    data = undefined;
  }
  socket.emit(event, data, callback);
  return true;
}

/**
 * Register a listener for an event.
 * @param {import("socket.io-client").Socket | null} socket
 * @param {string} event
 * @param {Function} handler
 */
export function on(socket, event, handler) {
  if (socket && typeof handler === "function") {
    socket.on(event, handler);
  }
}

/**
 * Remove one listener for an event (same handler reference).
 * @param {import("socket.io-client").Socket | null} socket
 * @param {string} event
 * @param {Function} [handler] - if omitted, removes all listeners for that event
 */
export function off(socket, event, handler) {
  if (!socket) return;
  socket.off(event, handler);
}

/**
 * Remove all listeners for an event, or all listeners on the socket.
 * @param {import("socket.io-client").Socket | null} socket
 * @param {string} [event] - if omitted, removes all listeners
 */
export function removeAllListeners(socket, event) {
  if (!socket) return;
  if (event !== undefined) {
    socket.removeAllListeners(event);
  } else {
    socket.removeAllListeners();
  }
}

/**
 * Check if socket is connected.
 * @param {import("socket.io-client").Socket | null} socket
 * @returns {boolean}
 */
export function isConnected(socket) {
  return Boolean(socket?.connected);
}
