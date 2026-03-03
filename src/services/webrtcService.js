/**
 * WebRTC service – static helpers for peer connections, media, and signaling.
 * No class instances. All functions take connection/stream as arguments.
 */

const DEFAULT_ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];

/**
 * Create an RTCPeerConnection with optional handlers.
 * @param {object} [config]
 * @param {RTCIceServer[]} [config.iceServers]
 * @param {Function} [config.onIceCandidate] - (candidate) => void
 * @param {Function} [config.onTrack] - (event) => void
 * @param {Function} [config.onConnectionStateChange] - () => void
 * @param {Function} [config.onIceConnectionStateChange] - () => void
 * @returns {RTCPeerConnection}
 */
export function createPeerConnection(config = {}) {
  const iceServers = config.iceServers ?? DEFAULT_ICE_SERVERS;
  const pc = new RTCPeerConnection({ iceServers });

  if (typeof config.onIceCandidate === "function") {
    pc.onicecandidate = (event) => {
      if (event.candidate) config.onIceCandidate(event.candidate);
    };
  }

  if (typeof config.onConnectionStateChange === "function") {
    pc.onconnectionstatechange = config.onConnectionStateChange;
  }

  if (typeof config.onIceConnectionStateChange === "function") {
    pc.oniceconnectionstatechange = config.onIceConnectionStateChange;
  }

  if (typeof config.onTrack === "function") {
    pc.ontrack = config.onTrack;
  }

  return pc;
}

/**
 * Close a peer connection and release resources.
 * @param {RTCPeerConnection | null} pc
 */
export function closePeerConnection(pc) {
  if (!pc) return;
  try {
    pc.close();
  } catch (e) {
    // ignore
  }
}

/**
 * Add a track to the peer connection.
 * @param {RTCPeerConnection} pc
 * @param {MediaStreamTrack} track
 * @param {MediaStream} stream - stream to associate with the track for the remote peer
 * @returns {RTCRtpSender}
 */
export function addTrack(pc, track, stream) {
  return pc.addTrack(track, stream);
}

/**
 * Remove a sender (and optionally stop its track).
 * @param {RTCPeerConnection} pc
 * @param {RTCRtpSender} sender
 * @param {boolean} [stopTrack=true]
 */
export function removeTrack(pc, sender, stopTrack = true) {
  try {
    if (stopTrack && sender.track) sender.track.stop();
    pc.removeTrack(sender);
  } catch (e) {
    // ignore
  }
}

/**
 * Replace the track of an existing sender.
 * @param {RTCRtpSender} sender
 * @param {MediaStreamTrack | null} track
 * @returns {Promise<void>}
 */
export function replaceTrack(sender, track) {
  return sender.replaceTrack(track);
}

/**
 * Create an offer.
 * @param {RTCPeerConnection} pc
 * @returns {Promise<RTCSessionDescriptionInit>}
 */
export function createOffer(pc) {
  return pc.createOffer();
}

/**
 * Create an answer.
 * @param {RTCPeerConnection} pc
 * @returns {Promise<RTCSessionDescriptionInit>}
 */
export function createAnswer(pc) {
  return pc.createAnswer();
}

/**
 * Set local description.
 * @param {RTCPeerConnection} pc
 * @param {RTCSessionDescriptionInit} desc
 * @returns {Promise<void>}
 */
export function setLocalDescription(pc, desc) {
  return pc.setLocalDescription(desc);
}

/**
 * Set remote description.
 * @param {RTCPeerConnection} pc
 * @param {RTCSessionDescriptionInit} desc
 * @returns {Promise<void>}
 */
export function setRemoteDescription(pc, desc) {
  return pc.setRemoteDescription(new RTCSessionDescription(desc));
}

/**
 * Add an ICE candidate.
 * @param {RTCPeerConnection} pc
 * @param {RTCIceCandidateInit} candidate
 * @returns {Promise<void>}
 */
export function addIceCandidate(pc, candidate) {
  return pc.addIceCandidate(new RTCIceCandidate(candidate));
}

/**
 * Restart ICE (e.g. after failure).
 * @param {RTCPeerConnection} pc
 */
export function restartIce(pc) {
  try {
    pc.restartIce();
  } catch (e) {
    console.warn("restartIce failed:", e);
  }
}

/**
 * Get user media (camera/mic).
 * @param {MediaStreamConstraints} constraints
 * @returns {Promise<MediaStream>}
 */
export async function getUserMedia(constraints) {
  return navigator.mediaDevices.getUserMedia(constraints);
}

/**
 * Stop all tracks on a stream and optionally clear the stream reference.
 * @param {MediaStream | null} stream
 */
export function stopAllTracks(stream) {
  if (!stream) return;
  stream.getTracks().forEach((t) => {
    try {
      t.stop();
    } catch (e) {
      // ignore
    }
  });
}

/**
 * Create an empty MediaStream (no tracks).
 * @returns {MediaStream}
 */
export function createEmptyStream() {
  return new MediaStream();
}

/**
 * Wait until a stream has at least one live track or timeout.
 * @param {() => MediaStream | null} getStream
 * @param {number} timeoutMs
 * @param {number} pollMs
 * @returns {Promise<MediaStream | null>}
 */
export async function waitForLiveTracks(getStream, timeoutMs = 2000, pollMs = 80) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const stream = typeof getStream === "function" ? getStream() : getStream;
    if (stream && stream.getTracks().some((t) => t.readyState === "live")) {
      return stream;
    }
    await new Promise((r) => setTimeout(r, pollMs));
  }
  return typeof getStream === "function" ? getStream() : getStream;
}
