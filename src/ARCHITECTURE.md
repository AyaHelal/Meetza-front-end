# Meetza – React WebRTC Meeting Architecture

This document describes the **production-style, scalable** structure for the meeting/WebRTC feature: static services, clear separation of business logic from UI, and safe cleanup.

---

## Folder structure

```
src/
├── components/     # Reusable UI (buttons, layout, forms)
├── pages/          # Route-level pages; use hooks and services only
├── hooks/          # Custom hooks (state + side effects)
│   └── meeting/    # Meeting-specific hooks (e.g. useMeetingActions)
├── context/        # React context (Auth, Socket, Meeting, Media)
├── services/       # Static, stateless business logic (no class instances)
│   ├── authService.js
│   ├── socketService.js
│   ├── webrtcService.js
│   ├── meetingSocketService.js
│   └── meetingService.js      # Meeting HTTP API: getMeetingInfo, leaveMeeting
├── utils/          # Pure helpers
└── API/            # HTTP client and API wrappers
```

---

## Design decisions

### 1. Static services (no `new`, no class instances)

- **authService.js** – Re-exports or wraps auth/API calls (login, signup, verify, etc.). Single place for auth-related API usage.
- **socketService.js** – Socket.IO connection and event handling:
  - `connect(io, url, options)` → create socket
  - `disconnect(socket)`, `emit(socket, event, data, callback)`, `on(socket, event, handler)`, `off(socket, event, handler)`, `removeAllListeners(socket, event)`
  - All functions take `socket` as first argument; no global socket state inside the service.
- **webrtcService.js** – WebRTC operations:
  - `createPeerConnection(config)` – creates `RTCPeerConnection` with optional `onIceCandidate`, `onTrack`, `onConnectionStateChange`, `onIceConnectionStateChange`
  - `closePeerConnection(pc)`, `addTrack(pc, track, stream)`, `removeTrack(pc, sender)`, `replaceTrack(sender, track)`
  - `createOffer(pc)`, `createAnswer(pc)`, `setLocalDescription(pc, desc)`, `setRemoteDescription(pc, desc)`, `addIceCandidate(pc, candidate)`, `restartIce(pc)`
  - `getUserMedia(constraints)`, `stopAllTracks(stream)`, `createEmptyStream()`, `waitForLiveTracks(getStream, timeoutMs)`
- **meetingSocketService.js** – Meeting-specific socket events in one place:
  - `MEETING_EVENTS` – event name constants
  - `joinMeeting(socket, meetingId, callback)`, `leaveMeeting(socket, meetingId)`, `updateMediaState(socket, meetingId, audioMuted, videoMuted)`
  - `sendWebrtcOffer`, `sendWebrtcAnswer`, `sendIceCandidate`, `raiseHand`, `sendReaction` / `sendReactionPayload`, `screenShareStarted` / `screenShareStopped`, `meetingEnded`, `sendMeetingChatMessage`
- **meetingService.js** – Meeting HTTP API (pass axios `api` as first argument):
  - `getMeetingInfo(api, meetingId)` → returns `{ administrator_id, recording, title, description, group_id } | null`
  - `leaveMeeting(api, meetingId)` → POST leave, no socket/WebRTC (caller handles those)

**Why static:** No hidden state, easy to test, no risk of multiple instances. Callers pass socket/refs/options explicitly.

---

### 2. Business logic outside components

- **MeetingRoom.js** – Main meeting page: composes hooks and UI components. Uses `useMeetingInfo`, `useMeetingPreJoin`, `useMeetingLifecycleHandlers`, and existing RTC/socket hooks; renders `MeetingRoomPreJoinModal`, `MeetingRoomHeader`, grid, control bar, etc. No direct `api.get`/`api.post` for meeting leave or info (those go through `meetingService` and lifecycle hook).
- **meetingRoomRtc.js** – Orchestrates WebRTC for the meeting: create peer, add tracks, ensure media, create/send offer. It **calls** `webrtcService` and `meetingSocketService`; components and hooks call the `*Impl` functions with refs/callbacks.
- **MediaContext.js** – Holds persistent media refs and mute state; when toggling mic/camera it uses `webrtcService` (getUserMedia, addTrack, replaceTrack, createOffer, setLocalDescription) and `meetingSocketService` (updateMediaState, sendWebrtcOffer) so the same logic is not duplicated in the meeting page.
- **useMeetingRoomSocketListeners.js** – Registers socket listeners for the meeting (participantJoined/Left, webrtcOffer/Answer, ICE, handRaised, mediaState, reaction, screenShare). Uses `webrtcService` for setRemoteDescription, createAnswer, setLocalDescription, addIceCandidate, addTrack; uses `meetingSocketService.sendWebrtcAnswer` for sending the answer. Cleanup: in the effect return, all listeners are removed with `socket.off(...)`.

---

### 3. Single place for renegotiation and track updates

- **Before:** createOffer + webrtcOffer and track add/replace were duplicated in MeetingRoom, MediaContext, and meetingRoomRtc.
- **After:**  
  - **Renegotiation:** `meetingRoomRtc.js` uses `webrtcService.createOffer`, `setLocalDescription`, and `meetingSocketService.sendWebrtcOffer`. MediaContext uses the same service functions for post-toggle renegotiation.  
  - **Track updates:** `webrtcService.addTrack`, `replaceTrack`, `removeTrack` are used in meetingRoomRtc and MediaContext.  
  So there is one implementation path and one set of event names (in meetingSocketService).

---

### 4. Cleanup and no memory leaks

- **WebRTC:**  
  - `closePeer` (in MeetingRoom) calls `webrtcService.closePeerConnection(pc)` and unregisters the peer; all peers are closed on leave.  
  - Local stream: `webrtcService.stopAllTracks(stream)` used in MediaContext and in meeting leave flow.  
  - Track ended/mute/unmute handlers on remote tracks are set in `createPeerConnectionImpl` and update state only; no dangling refs.
- **Socket:**  
  - `useMeetingRoomSocketListeners` returns a cleanup that runs `socket.off(event, handler)` for every listener it registered.  
  - No global socket listener registration outside context/hooks; context uses the same socket instance and does not add meeting-specific listeners that outlive the meeting.

---

### 5. Scalability

- **Screen sharing:** Same peer/track flow: add screen track to local stream and to peers, then renegotiate via `meetingSocketService.sendWebrtcOffer`; screen share start/stop use `meetingSocketService.screenShareStarted` / `screenShareStopped`. Adding new media types is a matter of new tracks + same renegotiation path.
- **Multiple participants:** One `RTCPeerConnection` per peer; `peersRef` (and MediaContext’s peer registration) is the single store. All offer/answer/ICE goes through the same services.
- **Reconnection:** Socket reconnection is handled in SocketContext. Re-join can call `joinMeeting` again and recreate peers via existing logic; ICE and offer/answer flow are unchanged. Future improvements (e.g. reconnection state, resume) can live in a dedicated hook or service that still uses the same socket and WebRTC services.

---

## Data flow (summary)

1. **User action (e.g. unmute)**  
   → Component calls handler (e.g. `handleToggleAudio`)  
   → Handler uses refs/context and calls `ensureMediaTracks` (meetingRoomRtc) and/or context setters  
   → meetingRoomRtc / MediaContext use **webrtcService** (getUserMedia, addTrack, replaceTrack, createOffer, setLocalDescription) and **meetingSocketService** (updateMediaState, sendWebrtcOffer)

2. **Socket event (e.g. webrtcOffer)**  
   → Listener registered in `useMeetingRoomSocketListeners`  
   → Listener uses **webrtcService** (setRemoteDescription, createAnswer, setLocalDescription, addIceCandidate) and **meetingSocketService.sendWebrtcAnswer**  
   → State updates (e.g. remote stream, media state) via existing callbacks/setters

3. **Join / leave**  
   → `meetingSocketService.joinMeeting` / `leaveMeeting`  
   → Peer creation and cleanup go through meetingRoomRtc and `webrtcService.closePeerConnection` / `stopAllTracks`

---

## Meeting room UI and hooks

- **MeetingRoomPreJoinModal** – Reusable pre-join UI (camera/mic preview, toggles, Enter/Cancel). Used by the main meeting page; state and media from `useMeetingPreJoin`.
- **useMeetingInfo(meetingId, selfMemberId)** – Fetches meeting via `meetingService.getMeetingInfo`; returns `{ meetingInfo, isMeetingAdmin }`.
- **useMeetingPreJoin(onEnterMeeting)** – Pre-join state (stream, muted, loading, error), requests camera/mic when modal opens, cleanup on close. Calls `onEnterMeeting(stream, videoMuted, audioMuted)` when user clicks Enter.
- **useMeetingLifecycleHandlers({ meetingId, meetingInfo, isRecording, stopRecording, stopMeetingRtc, navigate, socket, recordingStartedRef })** – Returns `handleLeaveMeeting` and `handleMeetingEnded`; uses `meetingService.leaveMeeting` and `meetingSocketService.meetingEnded`; no inline API/socket in the page.

---

## Usage guidelines

- **Components:** Only UI and user events; state and side effects via hooks and context; any socket/WebRTC action via services (directly or via hooks like `useMeetingActions`).
- **Hooks:** Hold refs/state and compose services; register and remove socket listeners in effect cleanup.
- **Context:** Holds shared refs/state (e.g. socket, meeting id, peers, local stream); performs actions via services when state changes (e.g. toggle mic from outside the meeting page).
- **Services:** No React, no refs; only pure or side-effect functions that receive everything they need as arguments.

This keeps the codebase modular, testable, and ready to extend (e.g. more participants, screen share variants, or reconnection) without duplicating logic or leaking resources.
