# Meeting module architecture

```
src/pages/Meetings/
├── components/
│   ├── MeetingRoom/
│   │   ├── MeetingRoomGrid.js
│   │   ├── MeetingRoomHeader.js
│   │   ├── MeetingRoomControlBar.js
│   │   ├── MeetingRoomSingleView.js
│   │   ├── MeetingRoomSliderViewport.js
│   │   ├── MeetingRoomSliderDots.js
│   │   ├── MeetingRoomFullscreenVideos.js
│   │   ├── MeetingRoomScreenPlaceholder.js
│   │   ├── MeetingRoomFloatingEmojis.js
│   │   ├── MeetingRoomReactionsContainer.js
│   │   ├── MeetingRoomPreJoinModal.js
│   │   ├── MeetingRoomParticipantTile.js
│   │   ├── index.js
│   │   ├── meetingRoomUtils.js
│   │   ├── meetingRoomStorage.js
│   │   └── hooks/           # RTC sub-hooks (useMeetingPeers, useMeetingStreams, …)
│   ├── MeetingRoom.js       # main room component
│   ├── MeetingCard.js
│   ├── MeetingList.js
│   └── …
│
├── hooks/
│   ├── useMeetingRoom.js    # top-level orchestrator
│   ├── useMeetingRtc.js     # WebRTC peer connection logic
│   ├── useMeetingChat.js    # handleSendComment
│   ├── useMeetingReactions.js
│   ├── useMeetingRecording.js
│   ├── useMeetingHand.js
│   ├── useMeetingPreJoin.js
│   ├── useMeetingTiles.js    # adminTile, adminTileForMembers, memberTiles
│   └── useMeetingSocketListeners.js
│
├── services/
│   ├── meetingSocketService.js   # re-export app-level; zero React
│   ├── meetingRtcService.js      # peer lifecycle — zero React
│   ├── meetingMediaService.js    # audio/video/screen tracks — zero React
│   └── meetingStreamService.js   # stream upsert/remove/restore — zero React
│
├── store/
│   ├── meetingStore.js      # participants, mediaStateMap, hasJoined (re-exports context)
│   └── mediaStore.js        # streams, mute state (re-exports context)
│
├── index.js                 # public API: MeetingRoom, useMeetingRoom
├── Meetings.js              # page
└── ARCHITECTURE.md
```

## Public API

- **index.js** exports only: `MeetingRoom`, `useMeetingRoom`.

## Services

- No React imports. Used by hooks and RTC logic.
- `meetingSocketService`: socket emits for meeting (join, leave, WebRTC, reactions, etc.).
- `meetingRtcService`: create/close peers, add tracks, createAndSendOffer.
- `meetingMediaService`: ensureLocalMedia, ensureMediaTracks, getDisplayMediaForScreen.
- `meetingStreamService`: computeEffectiveIsScreen, upsertRemoteStreamState, removeRemoteStreamState.

## Hooks

- Hooks in `hooks/` orchestrate services and expose a clean API to the main component.
- Refs (peersRef, localStreamRef, etc.) live in hooks, not in the component.

## Store

- `meetingStore` / `mediaStore` currently re-export app context. Can be replaced with Zustand or meeting-scoped context later.
