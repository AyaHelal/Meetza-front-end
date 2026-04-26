import React from "react";
import {
  Microphone,
  Play,
  Plus,
  Link as LinkIcon,
} from "@phosphor-icons/react";
import { File } from "lucide-react";
import { isPdfResource } from "../../../utils/pdfMedia";
import {
  getDownloadFileName,
  getFileExtensionForLabel,
} from "../utils/mainChatMessageUtils";

export function ResourceGrid({
  items,
  onMediaClick,
  onContextMenu,
  onTouchStart,
  onTouchEnd,
}) {
  return (
    <div className="expanded-items">
      {items.length === 0 && <p className="empty-state">No items yet.</p>}
      {items.map((item, index) => {
        if (item._uploadPlaceholder) {
          const url = item.url || item.file_url || item._previewObjectUrl || "";
          const isImage =
            /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(url) ||
            item.file_type?.startsWith("image/");
          const isVideo =
            /\.(mp4|webm|ogg|mov|mkv|avi)$/i.test(url) ||
            item.file_type?.startsWith("video/");
          const isAudio =
            /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(url) ||
            item.media_type === "audio" ||
            item.file_type?.startsWith("audio/");
          return (
            <div
              key={item.id || index}
              className={`media-item media-item--uploading ${isImage ? "media-item-photo" : isVideo ? "media-item-video" : isAudio ? "media-item-audio" : ""}`}
            >
              {isImage ? (
                <img
                  src={url || undefined}
                  className="expanded-photo"
                  alt=""
                  style={{ opacity: 0.6 }}
                />
              ) : isVideo ? (
                <div className="video-thumbnail" style={{ opacity: 0.6 }}>
                  <video
                    src={url || undefined}
                    className="expanded-video"
                    preload="metadata"
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
              ) : isAudio ? (
                <div className="voice-note-card" style={{ opacity: 0.75 }}>
                  <div className="voice-note-header">
                    <div className="voice-note-icon-wrapper">
                      <Microphone size={20} weight="fill" />
                    </div>
                    <div className="voice-note-title">
                      <span className="voice-note-label">Audio</span>
                      <span className="voice-note-filename">
                        {item.file_name || "Uploading…"}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="media-placeholder">
                  <File size={24} />
                  <span>{item.file_name || "Uploading…"}</span>
                </div>
              )}
              <span className="resource-uploading-indicator">Uploading…</span>
            </div>
          );
        }
        const url = item.url || item.file_url || "";
        const isImage =
          /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(url) ||
          item.media_type?.startsWith("image") ||
          item.file_type?.startsWith("image/");
        const isVideo =
          /\.(mp4|webm|ogg|mov|mkv|avi)$/i.test(url) ||
          item.media_type?.startsWith("video") ||
          item.file_type?.startsWith("video/");
        const isAudio =
          /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(url) ||
          item.media_type?.startsWith("audio") ||
          item.media_type === "voice" ||
          item.media_type === "voice_note" ||
          item.file_type?.startsWith("audio/");

        return (
          <div
            key={item.id || index}
            className={`media-item ${isImage ? "media-item-photo" : isVideo ? "media-item-video" : isAudio ? "media-item-audio" : ""}`}
            onClick={() => onMediaClick(item)}
            onContextMenu={(e) => onContextMenu && onContextMenu(e, item)}
            onTouchStart={(e) => onTouchStart && onTouchStart(e, item)}
            onTouchEnd={onTouchEnd}
            onTouchMove={onTouchEnd}
          >
            {isImage ? (
              <img
                src={url || undefined}
                className="expanded-photo"
                alt={item.file_name || "media"}
              />
            ) : isVideo ? (
              <div className="video-thumbnail">
                <video
                  src={url || undefined}
                  className="expanded-video"
                  preload="metadata"
                >
                  Your browser does not support the video tag.
                </video>
                <div className="video-play-overlay">
                  <svg
                    width="48"
                    height="48"
                    viewBox="0 0 48 48"
                    fill="white"
                    opacity="0.9"
                  >
                    <path d="M18 32V16l12 8-12 8z" />
                  </svg>
                </div>
              </div>
            ) : isAudio ? (
              <div className="voice-note-card">
                <div className="voice-note-header">
                  <div className="voice-note-icon-wrapper">
                    <Microphone size={20} weight="fill" />
                  </div>
                  <div className="voice-note-title">
                    <span className="voice-note-label">Voice Note</span>
                    <span className="voice-note-filename">
                      {item.file_name || "Recording"}
                    </span>
                  </div>
                </div>
                <div className="voice-note-waveform">
                  {Array.from({ length: 40 }, (_, i) => (
                    <div
                      key={i}
                      className="voice-note-bar"
                      style={{
                        height: `${20 + Math.random() * 60}%`,
                        animationDelay: `${i * 0.05}s`,
                      }}
                    />
                  ))}
                </div>
                <div className="voice-note-play-button">
                  <Play size={16} weight="fill" />
                </div>
              </div>
            ) : (
              <div className="media-placeholder">
                <File size={24} />
                <span>{item.file_name || "Media"}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function LinkList({ items, onContextMenu, onTouchStart, onTouchEnd }) {
  return (
    <div className="expanded-items expanded-links">
      {items.length === 0 && <p className="empty-state">No links yet.</p>}
      {items.map((item, index) => (
        <a
          key={item.id || index}
          href={item.media_url || item.file_url}
          target="_blank"
          rel="noopener noreferrer"
          className="link-item"
          onClick={(e) => {
            e.preventDefault();
            window.open(
              item.media_url || item.file_url,
              "_blank",
              "noopener,noreferrer"
            );
          }}
          onContextMenu={(e) => onContextMenu && onContextMenu(e, item)}
          onTouchStart={(e) => onTouchStart && onTouchStart(e, item)}
          onTouchEnd={onTouchEnd}
          onTouchMove={onTouchEnd}
        >
          <span className="link-title">{item.file_name}</span>
          <span
            className="link-url"
            title={item.original_url || item.media_url || item.file_url}
          >
            {item.original_url || item.media_url || item.file_url}
          </span>
        </a>
      ))}
    </div>
  );
}

export function DocumentList({
  items,
  onContextMenu,
  onTouchStart,
  onTouchEnd,
}) {
  return (
    <div className="expanded-items documents-grid">
      {items.length === 0 && <p className="empty-state">No documents yet.</p>}
      {items.map((item, index) =>
        item._uploadPlaceholder ? (
          item.media_type === "audio" ? (
            <div
              key={item.id || index}
              className="document-item audio-item document-item--uploading"
            >
              <span className="document-name" style={{ fontWeight: 600 }}>
                {item.file_name || "Audio"}
              </span>
              <span className="resource-uploading-indicator">Uploading…</span>
            </div>
          ) : (
            (() => {
              const fileName = getDownloadFileName(item);
              const extFromLabel = getFileExtensionForLabel(fileName).toLowerCase();
              const cardInner = (
                <>
                  <div className="document-icon">
                    <span className="document-extension">
                      {getFileExtensionForLabel(fileName)}
                    </span>
                  </div>
                  <div className="document-name">{fileName}</div>
                  <span className="resource-uploading-indicator">Uploading…</span>
                </>
              );
              const isPdf = extFromLabel === "pdf" || isPdfResource(item);
              if (isPdf) {
                return (
                  <div
                    key={item.id || index}
                    className="document-square-wrap document-item--pdf"
                  >
                    <div className="document-item document-square document-item--uploading">
                      {cardInner}
                    </div>
                  </div>
                );
              }
              return (
                <div
                  key={item.id || index}
                  className="document-item document-square document-item--uploading"
                >
                  {cardInner}
                </div>
              );
            })()
          )
        ) : item.media_type === "audio" ? (
          <div
            key={item.id || index}
            className="document-item audio-item"
            onContextMenu={(e) => onContextMenu && onContextMenu(e, item)}
            onTouchStart={(e) => onTouchStart && onTouchStart(e, item)}
            onTouchEnd={onTouchEnd}
            onTouchMove={onTouchEnd}
          >
            <audio controls src={item.media_url || item.file_url || undefined} />
            <span>{item.file_name || "Audio"}</span>
          </div>
        ) : (
          (() => {
            const fileName = getDownloadFileName(item);
            const fileUrl =
              item.file_url || item.media_url || item.url || item.resource_url || "";
            const extFromLabel = getFileExtensionForLabel(fileName).toLowerCase();
            const isPdf =
              Boolean(fileUrl) && (isPdfResource(item) || extFromLabel === "pdf");

            const handleDownload = async (e) => {
              e.preventDefault();
              try {
                const token =
                  localStorage.getItem("token") ||
                  sessionStorage.getItem("token");
                const response = await fetch(fileUrl, {
                  method: "GET",
                  headers: token ? { Authorization: `Bearer ${token}` } : {},
                });
                if (!response.ok) throw new Error("Failed to download file");
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
              } catch (error) {
                console.error("Error downloading file:", error);
                window.open(fileUrl, "_blank");
              }
            };

            const cardInner = (
              <>
                <div className="document-icon">
                  <span className="document-extension">
                    {getFileExtensionForLabel(fileName)}
                  </span>
                </div>
                <div className="document-name">{fileName}</div>
              </>
            );

            if (isPdf) {
              return (
                <div
                  key={item.id || index}
                  className="document-square-wrap document-item--pdf"
                >
                  <a
                    href={fileUrl}
                    onClick={handleDownload}
                    onContextMenu={(e) => onContextMenu && onContextMenu(e, item)}
                    onTouchStart={(e) => onTouchStart && onTouchStart(e, item)}
                    onTouchEnd={onTouchEnd}
                    onTouchMove={onTouchEnd}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="document-item document-square"
                    title={fileName}
                  >
                    {cardInner}
                  </a>
                </div>
              );
            }

            return (
              <a
                key={item.id || index}
                href={fileUrl}
                onClick={handleDownload}
                onContextMenu={(e) => onContextMenu && onContextMenu(e, item)}
                onTouchStart={(e) => onTouchStart && onTouchStart(e, item)}
                onTouchEnd={onTouchEnd}
                onTouchMove={onTouchEnd}
                target="_blank"
                rel="noopener noreferrer"
                className="document-item document-square"
                title={fileName}
              >
                {cardInner}
              </a>
            );
          })()
        )
      )}
    </div>
  );
}

export function TabbedSection({
  source,
  tabValue,
  onTabChange,
  onMediaClick,
  onContextMenu,
  onTouchStart,
  onTouchEnd,
  isAdmin,
  onUploadFile,
  onAddLink,
  showUploadLinkActions = false,
}) {
  return (
    <div className="expanded-section">
      <div className="tabs-header-container">
        <div className="tabs-header">
          <button
            className={`tab-item ${tabValue === "media" ? "active" : ""}`}
            onClick={() => onTabChange("media")}
          >
            Media
          </button>
          <button
            className={`tab-item ${tabValue === "audios" ? "active" : ""}`}
            onClick={() => onTabChange("audios")}
          >
            Audios
          </button>
          <button
            className={`tab-item ${tabValue === "links" ? "active" : ""}`}
            onClick={() => onTabChange("links")}
          >
            Links
          </button>
          <button
            className={`tab-item ${tabValue === "documents" ? "active" : ""}`}
            onClick={() => onTabChange("documents")}
          >
            Documents
          </button>
        </div>
        {isAdmin && showUploadLinkActions && (
          <div className="admin-actions-resources">
            <button
              className="admin-action-btn upload-btn"
              onClick={onUploadFile}
            >
              <Plus size={18} weight="bold" /> Upload File
            </button>
            <button
              className="admin-action-btn add-link-btn"
              onClick={onAddLink}
            >
              <LinkIcon size={18} weight="bold" /> Add Link
            </button>
          </div>
        )}
      </div>
      {tabValue === "media" && (
        <ResourceGrid
          items={[...(source?.photos || []), ...(source?.videos || [])]}
          onMediaClick={onMediaClick}
          onContextMenu={onContextMenu}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        />
      )}
      {tabValue === "audios" && (
        <ResourceGrid
          items={source?.audio || []}
          onMediaClick={onMediaClick}
          onContextMenu={onContextMenu}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        />
      )}
      {tabValue === "links" && (
        <LinkList
          items={source?.links || []}
          onContextMenu={onContextMenu}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        />
      )}
      {tabValue === "documents" && (
        <DocumentList
          items={source?.documents || []}
          onContextMenu={onContextMenu}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        />
      )}
    </div>
  );
}

export function LegacyExpandedSection({
  expandedSection,
  photos,
  links,
  documents,
  onMediaClick,
}) {
  let items = [];
  let title = "";

  switch (expandedSection) {
    case "photos":
      items = photos;
      title = "Photos";
      break;
    case "links":
      items = links;
      title = "Links";
      break;
    case "documents":
      items = documents;
      title = "Documents";
      break;
    default:
      return null;
  }

  return (
    <div className="expanded-section">
      <h4>{title}</h4>
      <div
        className={`expanded-items ${expandedSection === "links" ? "expanded-links" : ""}`}
      >
        {items.length === 0 ? (
          <p>No {title.toLowerCase()} available.</p>
        ) : (
          items.map((item, index) => (
            <div key={index} className="expanded-item">
              {expandedSection === "photos" && (
                <img
                  src={item.file_url || item.url || item.media_url || item.resource_url || undefined}
                  alt={item.file_name || "Photo"}
                  className="expanded-photo"
                  onClick={() => onMediaClick(item)}
                />
              )}
              {expandedSection === "links" && (
                <a
                  href={item.file_url || item.url || item.media_url || item.resource_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-item"
                >
                  {item.file_url}
                </a>
              )}
              {expandedSection === "documents" && (
                <a
                  href={item.file_url || item.url || item.media_url || item.resource_url}
                  download={getDownloadFileName(item)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {item.file_name || getDownloadFileName(item)}
                </a>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
