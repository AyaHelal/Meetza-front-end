import React from "react";
import { ConfirmDeleteModal } from "../../../components/shared/ConfirmDeleteModal";

export function VideoSessionDetailConfirmModals({
  showVideoDeleteModal,
  setShowVideoDeleteModal,
  onConfirmVideoDelete,
  deletingVideo,
  commentToDeleteId,
  setCommentToDeleteId,
  onConfirmCommentDelete,
}) {
  return (
    <>
      <ConfirmDeleteModal
        show={showVideoDeleteModal}
        onClose={() => setShowVideoDeleteModal(false)}
        onConfirm={async () => {
          await onConfirmVideoDelete();
          setShowVideoDeleteModal(false);
        }}
        title="Delete Video"
        message="Are you sure you want to delete this video? This cannot be undone."
        confirming={deletingVideo}
        confirmLabel="Delete"
      />

      <ConfirmDeleteModal
        show={!!commentToDeleteId}
        onClose={() => setCommentToDeleteId(null)}
        onConfirm={async () => {
          if (commentToDeleteId) {
            await onConfirmCommentDelete(commentToDeleteId);
            setCommentToDeleteId(null);
          }
        }}
        title="Delete Comment"
        message="Are you sure you want to delete this comment?"
        confirmLabel="Delete"
      />
    </>
  );
}
