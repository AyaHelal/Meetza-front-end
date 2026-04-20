import React, { useState, useRef, useMemo } from "react";
import { buildFileUrl } from "../services";
import "./VideoHoverPreviewThumb.css";

const DEFAULT_VIDEO_POSTER = "/assets/video-standard.png";

/**
 * Thumbnail with optional muted hover preview (same pattern as session cards).
 * @param {string} posterSrc
 * @param {string} [rawVideoUrl] — passed through buildFileUrl when present
 * @param {string} [alt]
 * @param {boolean} [fill] — absolutely fill a positioned parent (aspect-ratio / sized box)
 * @param {string} [className] — extra classes on the root
 */
export function VideoHoverPreviewThumb({ posterSrc, rawVideoUrl, alt = "", fill = false, className = "" }) {
  const [hoverPreview, setHoverPreview] = useState(false);
  const [imgOk, setImgOk] = useState(true);
  const videoRef = useRef(null);

  const previewSrc = useMemo(
    () => (rawVideoUrl ? buildFileUrl(rawVideoUrl) : null),
    [rawVideoUrl]
  );

  const poster = useMemo(() => {
    if (posterSrc == null) return null;
    if (typeof posterSrc !== "string") return null;
    const t = posterSrc.trim();
    return t ? t : null;
  }, [posterSrc]);

  const effectivePoster = poster || DEFAULT_VIDEO_POSTER;

  const handleEnter = () => {
    if (!previewSrc) return;
    setHoverPreview(true);
    const v = videoRef.current;
    if (v) {
      const p = v.play();
      if (p && typeof p.catch === "function") p.catch(() => { });
    }
  };

  const handleLeave = () => {
    setHoverPreview(false);
    const v = videoRef.current;
    if (v) {
      v.pause();
      try {
        v.currentTime = 0;
      } catch {
        /* ignore */
      }
    }
  };

  const rootClass = [
    "v-hover-preview-thumb",
    fill && "v-hover-preview-thumb--fill",
    hoverPreview && previewSrc && "v-hover-preview-thumb--active",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClass} onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      {previewSrc ? (
        <video
          ref={videoRef}
          className="v-hover-preview-thumb__video"
          src={previewSrc}
          poster={effectivePoster || undefined}
          muted
          playsInline
          loop
          preload="none"
          aria-hidden="true"
        />
      ) : null}
      {effectivePoster && imgOk ? (
        <img
          src={effectivePoster}
          alt={alt}
          onError={() => setImgOk(false)}
          className={`v-hover-preview-thumb__img${previewSrc ? " v-hover-preview-thumb__img--preview" : ""}`}
        />
      ) : (
        <div className="v-hover-preview-thumb__placeholder" aria-label="video">
          video
        </div>
      )}
    </div>
  );
}
