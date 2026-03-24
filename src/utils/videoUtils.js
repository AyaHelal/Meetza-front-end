/**
 * Downloads a video from a URL using an authenticated fetch.
 * @param {string} videoUrl - The URL of the video to download.
 * @param {string} title - The title for the downloaded file.
 * @param {function} onStart - Optional callback when download starts.
 * @param {function} onEnd - Optional callback when download ends.
 * @param {function} onError - Optional callback when an error occurs.
 */
export const downloadVideo = async (videoUrl, title, onStart, onEnd, onError) => {
  if (!videoUrl) return;

  try {
    if (onStart) onStart();

    // Fix URL if it's missing protocol or is relative
    const finalUrl = videoUrl.startsWith('http') ? videoUrl : `${window.location.origin}${videoUrl}`;

    // Get the JWT token from localStorage
    const token = localStorage.getItem("token");

    // Fetch the video file as a blob using the token for authentication
    const response = await fetch(finalUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download: ${response.statusText}`);
    }

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);

    // Create a temporary link and trigger the download
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = `${title || "video"}.mp4`;
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);

    if (onEnd) onEnd();
  } catch (error) {
    console.error("Error downloading video:", error);
    if (onError) onError(error);
  }
};
