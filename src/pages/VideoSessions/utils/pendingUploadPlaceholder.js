/**
 * Build optimistic session object for the grid while multipart upload runs.
 * Parent must revoke _posterObjectUrl / _videoObjectUrl via URL.revokeObjectURL when removing the row.
 */
export function buildPendingUploadSession(payload) {
  const {
    uploadId,
    title,
    description = "",
    groupName = null,
    thumbnailUrl = null,
    videoPreviewUrl = null,
    duration = "00:00",
  } = payload;

  return {
    id: uploadId,
    _uploadPlaceholder: true,
    status: "uploading",
    title: title || "Uploading…",
    description,
    groupName,
    group_name: groupName,
    thumbnailUrl: thumbnailUrl || undefined,
    thumbnail_url: thumbnailUrl || undefined,
    videoUrl: videoPreviewUrl || undefined,
    video_url: videoPreviewUrl || undefined,
    duration,
    _posterObjectUrl: thumbnailUrl || null,
    _videoObjectUrl: videoPreviewUrl || null,
  };
}

export function revokePendingUploadBlobs(session) {
  if (!session || typeof session !== "object") return;
  if (session._posterObjectUrl) {
    try {
      URL.revokeObjectURL(session._posterObjectUrl);
    } catch {
      /* ignore */
    }
  }
  if (session._videoObjectUrl) {
    try {
      URL.revokeObjectURL(session._videoObjectUrl);
    } catch {
      /* ignore */
    }
  }
}
