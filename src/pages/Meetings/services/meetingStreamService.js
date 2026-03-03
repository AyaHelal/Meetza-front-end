/** Meeting stream service – pure stream upsert/remove/restore. No React. */
export function computeEffectiveIsScreen(prev, socketId, stream, isScreenShare) {
  const hasCamera = prev.some((x) => x.socketId === socketId && x.isScreenShare === false);
  const hasScreen = prev.some((x) => x.socketId === socketId && x.isScreenShare === true);
  const hasVideo = stream.getVideoTracks().length > 0;
  return isScreenShare || (!isScreenShare && hasCamera && hasVideo && !hasScreen);
}

export function upsertRemoteStreamState(prevState, socketId, stream, effectiveIsScreen) {
  const idx = prevState.findIndex((x) => x.socketId === socketId && x.isScreenShare === effectiveIsScreen);
  const entry = { socketId, stream, isScreenShare: effectiveIsScreen };
  if (idx >= 0) {
    const next = [...prevState];
    next[idx] = entry;
    return next;
  }
  return [...prevState, entry];
}

export function removeRemoteStreamState(prev, socketId, isScreenShareOnly = false) {
  if (isScreenShareOnly) return prev.filter((x) => !(x.socketId === socketId && x.isScreenShare));
  return prev.filter((x) => x.socketId !== socketId);
}
