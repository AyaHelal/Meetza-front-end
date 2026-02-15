# Meeting Events Flow – Backend ↔ Frontend

## State Structure

### Local state (MeetingRoom)

| State | Type | Description |
|-------|------|-------------|
| `audioMuted` | boolean | Mic muted (persisted in `sessionStorage.meetza_audioMuted`) |
| `videoMuted` | boolean | Camera off (persisted in `sessionStorage.meetza_videoMuted`) |
| `handRaised` | boolean | Local user hand raised |
| `screenSharing` | boolean | Local user screen sharing |
| `remoteStreams` | `[{ socketId, stream, isScreenShare }]` | Remote media streams from WebRTC |
| `handRaisedMap` | `{ [socketId]: boolean }` | Remote participants' hand raise state |
| `mediaStateMap` | `{ [socketId]: { audioMuted, videoMuted } }` | Remote participants' media state |
| `reactionsMap` | `{ [memberKey]: { [type]: [names] } }` | Reactions per participant |

### Shared state (MeetingContext)

| State | Type | Description |
|-------|------|-------------|
| `participants` | `[{ socketId, member_id, member_name, member_photo, member_email }]` | All participants including self |
| `meetingId` | string | Current meeting ID |
| `hasJoined` | boolean | Whether the user has joined the meeting room |

---

## Socket Events

### Client → Backend (emit)

| Event | Payload | Description |
|-------|---------|-------------|
| `joinMeetingRoom` | `{ meetingId }` | Join a meeting room |
| `leaveMeetingRoom` | `{ meetingId }` | Leave meeting room |
| `updateMediaState` | `{ meetingId, audioMuted, videoMuted }` | Broadcast mic/camera state |
| `raiseHand` | `{ meetingId, raised }` | Broadcast hand raise state |
| `reaction` | `{ meetingId, type, member_id?, member_name?, fromSocketId? }` | Broadcast reaction |
| `webrtcOffer` | `{ toSocketId, meetingId, sdp }` | WebRTC offer |
| `webrtcAnswer` | `{ toSocketId, meetingId, sdp }` | WebRTC answer |
| `webrtcIceCandidate` | `{ toSocketId, meetingId, candidate }` | ICE candidate |

### Backend → Client (on)

| Event | Payload | Description |
|-------|---------|-------------|
| `participantJoined` | `{ socketId, userId, name, email, user_photo, meetingId }` | Someone joined |
| `participantLeft` | `{ socketId, userId, meetingId }` | Someone left |
| `mediaStateUpdated` | `{ socketId, userId, meetingId, audioMuted, videoMuted }` | Remote media state changed |
| `handRaised` | `{ socketId, userId, meetingId, raised }` | Remote hand raise changed |
| `reaction` | `{ socketId, userId, meetingId, type }` | Reaction from another participant |
| `webrtcOffer` | `{ fromSocketId, fromUserId, meetingId, sdp }` | Incoming WebRTC offer |
| `webrtcAnswer` | `{ fromSocketId, meetingId, sdp }` | Incoming WebRTC answer |
| `webrtcIceCandidate` | `{ fromSocketId, meetingId, candidate }` | Incoming ICE candidate |

---

## Event Flow

### Join meeting

1. User navigates to `/meetings?meetingId=X` → `MeetingRoom` mounts
2. `startAndJoinMeetingRtc()` runs when `socket` and `meetingId` are ready
3. `ensureLocalMedia()` creates empty `MediaStream` (no auto camera/mic)
4. `socket.emit("joinMeetingRoom", { meetingId })`
5. Backend ACK: `{ ok, participants: [...] }` – existing participants in room
6. Frontend sets `participants = [self, ...others]` via `setParticipants`
7. Frontend emits `updateMediaState` for initial mute state
8. For each other participant: create `RTCPeerConnection`, exchange offers/answers/ICE
9. `setHasJoined(true)` → `MeetingRightSidebar` shows participants

### Participant joins (someone else)

1. Backend emits `participantJoined` to all in room
2. Frontend:
   - Adds participant to `participants`
   - Stores metadata in `peerMetaRef`
   - Creates `RTCPeerConnection`
   - Exchanges WebRTC signaling (offer/answer/ICE)

### Participant leaves

1. Backend emits `participantLeft`
2. Frontend:
   - Removes from `participants`
   - Cleans `handRaisedMap`, `reactionsMap`, `mediaStateMap`
   - Closes peer connection and removes remote stream

### Reactions

1. User selects emoji → `socket.emit("reaction", { meetingId, type, ... })`
2. Backend broadcasts `reaction` to room
3. Recipients: resolve sender name from `peerMetaRef`, add to `reactionsMap`
4. UI renders with `getReactionIcon(type)` (supports 👍 ❤️ 😂 👏 😮 🎉)

### Raise hand

1. User toggles → `socket.emit("raiseHand", { meetingId, raised })`
2. Backend broadcasts `handRaised`
3. Recipients: update `handRaisedMap[socketId]`
4. UI shows hand overlay on tile when `handRaisedMap[socketId] === true`

### Media state (mic/camera)

1. User toggles → `socket.emit("updateMediaState", { meetingId, audioMuted, videoMuted })`
2. When enabling: `ensureMediaTracks()` gets `getUserMedia`, adds tracks to stream and peers
3. Backend broadcasts `mediaStateUpdated`
4. Recipients: update `mediaStateMap[socketId]`

---

## Tile Display Priority

Each participant has **one tile** with priority:

1. **Screen share** – if remote is sharing screen
2. **Camera** – if camera is on
3. **Profile image** – fallback

No duplicated tiles; the same tile updates when state changes.

---

## Participants Panel

- **Source**: `MeetingContext.participants`
- **Updates**: Real-time via `participantJoined` / `participantLeft`
- **No REST polling** – fully socket-driven
