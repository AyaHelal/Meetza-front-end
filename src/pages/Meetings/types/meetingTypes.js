/**
 * Shared data shapes for the meeting room. Use for JSDoc and documentation.
 * No React; no runtime behavior.
 *
 * @typedef {Object} Participant
 * @property {string} [socketId]
 * @property {string} [member_id]
 * @property {string} [member_name]
 * @property {string} [member_photo]
 * @property {string} [member_email]
 *
 * @typedef {Object} StreamEntry
 * @property {string} socketId
 * @property {MediaStream} stream
 * @property {boolean} isScreenShare
 *
 * @typedef {Object} TileData
 * @property {string} [socketId]
 * @property {string} [member_id]
 * @property {string} [member_name]
 * @property {string} [member_photo]
 * @property {MediaStream} [stream]
 * @property {boolean} [isSelf]
 * @property {boolean} [isScreenShare]
 * @property {boolean} [videoMuted]
 * @property {boolean} [audioMuted]
 *
 * @typedef {Object} MediaStateEntry
 * @property {boolean} [audioMuted]
 * @property {boolean} [videoMuted]
 *
 * @typedef {Object} PeerMeta
 * @property {string} [member_id]
 * @property {string} [member_name]
 * @property {string} [member_photo]
 * @property {string} [member_email]
 */

export {};
