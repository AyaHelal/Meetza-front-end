import React from "react";

export default function MainChatPhotoModal({ modalPhoto, onClose }) {
  if (!modalPhoto) return null;
  return (
    <div className="photo-modal" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {modalPhoto.media_type?.startsWith("image") ? (
          <img
            src={modalPhoto.file_url || modalPhoto.media_url || undefined}
            alt={modalPhoto.file_name || "Photo"}
            style={{ maxWidth: "100%", maxHeight: "80vh" }}
          />
        ) : modalPhoto.media_type?.startsWith("video") ? (
          <video
            controls
            src={modalPhoto.media_url || modalPhoto.file_url || undefined}
            style={{ maxWidth: "100%", maxHeight: "80vh" }}
          />
        ) : (
          <a
            href={modalPhoto.media_url || modalPhoto.file_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "blue", textDecoration: "underline" }}
          >
            Open {modalPhoto.file_name || "file"}
          </a>
        )}
      </div>
    </div>
  );
}
