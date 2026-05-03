/**
 * Build optimistic resource object for the list while file upload runs.
 * Parent must revoke _previewObjectUrl via URL.revokeObjectURL when removing the row.
 */
export function buildPendingResourceUpload(payload) {
  const {
    uploadId,
    fileName,
    fileType,
    previewUrl = null,
    meetingId = null,
  } = payload;

  return {
    id: uploadId,
    _uploadPlaceholder: true,
    file_name: fileName || "Uploading…",
    fileName: fileName || "Uploading…",
    file_type: fileType || "application/octet-stream",
    fileType: fileType || "application/octet-stream",
    file_url: previewUrl || undefined,
    fileUrl: previewUrl || undefined,
    meeting_id: meetingId,
    created_at: new Date().toISOString(),
    _previewObjectUrl: previewUrl || null,
    isUploading: true,
  };
}

export function revokePendingResourceBlobs(resource) {
  if (!resource || typeof resource !== "object") return;
  if (resource._previewObjectUrl) {
    try {
      URL.revokeObjectURL(resource._previewObjectUrl);
    } catch {
      /* ignore */
    }
  }
}
