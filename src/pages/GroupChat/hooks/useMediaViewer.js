import { useState } from "react";

export const useMediaViewer = () => {
  const [modalPhoto, setModalPhoto] = useState(null);

  const handlePhotoClick = (item) => {
    if (item.isLink) {
      window.open(item.media_url, "_blank");
      return;
    }
    const url = item.media_url || item.file_url || item.url || item.resource_url;
    
    const isImage =
      /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(url) ||
      item.media_type?.startsWith("image") ||
      item.file_type?.startsWith("image/");
      
    const isVideo =
      /\.(mp4|webm|ogg|mov)$/i.test(url) ||
      item.media_type?.startsWith("video") ||
      item.file_type?.startsWith("video/");
      
    const isAudio =
      /\.(mp3|wav|ogg|m4a|aac|flac|webm)$/i.test(url) ||
      item.media_type?.startsWith("audio") ||
      item.media_type === "voice" ||
      item.media_type === "voice_note" ||
      item.file_type?.startsWith("audio/");
      
    if (isAudio) {
      window.open(url, "_blank");
      return;
    }
    
    setModalPhoto({
      media_url: url,
      file_url: url,
      file_name: item.file_name || "Media",
      media_type: isImage ? "image" : isVideo ? "video" : "file",
    });
  };

  const closeModal = () => setModalPhoto(null);

  return {
    modalPhoto,
    handlePhotoClick,
    closeModal,
  };
};
