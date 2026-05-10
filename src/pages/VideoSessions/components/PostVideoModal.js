import React, { useState, useEffect } from "react";
import api from "../../../API/axiosInstance";
import { createVideo, buildFileUrl } from "../services";
import { smartToast } from "../../../API/toastManager";
import "./PostVideoModal.css";
import { dedupeById } from "../../../utils/dedupeById";

/** Get video duration from a File. Returns { formatted: "HH:MM:SS", seconds: number } for API. */
function getVideoDuration(file) {
  return new Promise((resolve) => {
    if (!file || !file.type.startsWith("video/")) {
      resolve({ formatted: "00:00", seconds: 0 });
      return;
    }
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      const seconds = Math.floor(video.duration);
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = seconds % 60;
      const pad = (n) => String(n).padStart(2, "0");
      resolve({ formatted: `${pad(h)}:${pad(m)}:${pad(s)}`, seconds });
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ formatted: "00:00", seconds: 0 });
    };
    video.src = url;
  });
}

/**
 * @param {function} [onUploadBegin] — called when POST starts; use to show optimistic card ({ uploadId, title, description, groupName, thumbnailUrl, videoPreviewUrl, duration })
 * @param {function} [onUploadEnd] — (uploadId, success) when request finishes (so parent can remove placeholder + revoke blob URLs)
 */
export default function PostVideoModal({
  isOpen,
  onClose,
  defaultGroupId = null,
  groupName = null,
  onSuccess,
  onUploadBegin,
  onUploadEnd,
}) {
  const isGroupLocked = Boolean(defaultGroupId?.toString?.().trim?.());
  const [groups, setGroups] = useState([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [durationLoading, setDurationLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    duration: "",
    durationSeconds: null,
    group_id: defaultGroupId || "",
    poster_file: null,
    video_file: null,
  });

  useEffect(() => {
    if (!isOpen) return;
    setFormData((prev) => ({
      ...prev,
      group_id: isGroupLocked ? (defaultGroupId?.toString?.() || "") : (prev.group_id || ""),
    }));
  }, [isOpen, defaultGroupId, isGroupLocked]);

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add("post-video-modal-open");
      setSubmitting(false);
    } else {
      document.body.classList.remove("post-video-modal-open");
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || isGroupLocked) return;
    let cancelled = false;
    const fetchGroups = async () => {
      setGroupsLoading(true);
      try {
        const res = await api.get("/group");
        const payload = Array.isArray(res.data) ? res.data : res.data?.data || [];
        if (cancelled) return;
        setGroups(dedupeById(payload).map((g) => ({ id: g.id, name: g.name || g.group_name })));
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load groups:", err);
          smartToast.error("Failed to load groups");
        }
      } finally {
        if (!cancelled) setGroupsLoading(false);
      }
    };
    fetchGroups();
    return () => { cancelled = true; };
  }, [isOpen, isGroupLocked]);

  const handleChange = async (e) => {
    const { name, value, type, files } = e.target;
    if (type === "file") {
      const file = files?.[0] || null;
      setFormData((prev) => ({ ...prev, [name]: file }));
      if (name === "video_file" && file) {
        setDurationLoading(true);
        try {
          const { formatted, seconds } = await getVideoDuration(file);
          setFormData((prev) => ({ ...prev, video_file: file, duration: formatted, durationSeconds: seconds }));
        } catch {
          setFormData((prev) => ({ ...prev, video_file: file }));
        } finally {
          setDurationLoading(false);
        }
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title?.trim()) {
      smartToast.error("Title is required");
      return;
    }
    if (!formData.video_file) {
      smartToast.error("Video file is required");
      return;
    }
    const groupId = isGroupLocked ? (defaultGroupId?.toString?.() || formData.group_id) : formData.group_id;
    if (!groupId) {
      smartToast.error("Please select a group");
      return;
    }

    const uploadId = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const posterBlobUrl = formData.poster_file ? URL.createObjectURL(formData.poster_file) : null;
    const videoBlobUrl = formData.video_file ? URL.createObjectURL(formData.video_file) : null;
    const resolvedGroupName = isGroupLocked
      ? groupName || null
      : (groups.find((g) => String(g.id) === String(groupId))?.name ?? null);

    onUploadBegin?.({
      uploadId,
      title: formData.title.trim(),
      description: formData.description?.trim() || "",
      groupName: resolvedGroupName,
      groupId: String(groupId),
      thumbnailUrl: posterBlobUrl,
      videoPreviewUrl: videoBlobUrl,
      duration: formData.duration?.trim() || "00:00",
    });

    onClose?.();

    try {
      await createVideo({
        title: formData.title.trim(),
        description: formData.description?.trim() || "",
        duration: formData.duration?.trim() || "00:00",
        duration_seconds: formData.durationSeconds,
        group_id: groupId,
        poster_file: formData.poster_file || undefined,
        video_file: formData.video_file,
      });
      smartToast.success("Video posted successfully");
      setFormData({
        title: "",
        description: "",
        duration: "",
        durationSeconds: null,
        group_id: isGroupLocked ? (defaultGroupId?.toString?.() || "") : "",
        poster_file: null,
        video_file: null,
      });
      onUploadEnd?.(uploadId, true);
      onSuccess?.();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to post video";
      smartToast.error(msg);
      onUploadEnd?.(uploadId, false);
    }
  };

  const handleClose = () => {
    if (!submitting) onClose?.();
  };

  if (!isOpen) return null;

  return (
    <div className="post-video-modal-overlay" onClick={handleClose} role="dialog" aria-modal="true" aria-labelledby="post-video-title">
      <div className="post-video-modal" onClick={(e) => e.stopPropagation()}>
        <div className="post-video-modal-header">
          <h2 id="post-video-title">Post a video</h2>
          <button type="button" className="post-video-modal-close" onClick={handleClose} aria-label="Close" disabled={submitting}>
            ×
          </button>
        </div>
        <form className="post-video-modal-form" onSubmit={handleSubmit}>
          <div className="post-video-form-group">
            <label htmlFor="post-video-title-input">Title <span className="required">*</span></label>
            <input
              id="post-video-title-input"
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g. Super 26 meetza"
              required
            />
          </div>
          <div className="post-video-form-group">
            <label htmlFor="post-video-description">Description</label>
            <textarea
              id="post-video-description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="e.g. This is my first video, encourage me to continue"
              rows={3}
            />
          </div>
          <div className="post-video-form-group">
            <label htmlFor="post-video-duration">Duration</label>
            <input
              id="post-video-duration"
              type="text"
              name="duration"
              value={formData.duration}
              placeholder={durationLoading ? "Reading from video…" : "Auto-calculated from video file"}
              readOnly
              className="post-video-input-readonly"
            />
            {durationLoading && (
              <span className="post-video-duration-hint">Reading duration from video file…</span>
            )}
          </div>
          {isGroupLocked ? (
            <div className="post-video-form-group post-video-form-group-locked">
              <label>Group</label>
              <div className="post-video-group-locked-value">
                {groupName ? `Posting to: ${groupName}` : "Posting to current group"}
              </div>
              <input type="hidden" name="group_id" value={formData.group_id || defaultGroupId} readOnly />
            </div>
          ) : (
            <div className="post-video-form-group">
              <label htmlFor="post-video-group">Group <span className="required">*</span></label>
              <select
                id="post-video-group"
                name="group_id"
                value={formData.group_id}
                onChange={handleChange}
                required
                disabled={groupsLoading}
              >
                <option value="">Select group...</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="post-video-form-group">
            <label htmlFor="post-video-poster">Poster image</label>
            <input
              id="post-video-poster"
              type="file"
              name="poster_file"
              accept="image/*"
              onChange={handleChange}
            />
            {formData.poster_file && (
              <span className="post-video-file-name">{formData.poster_file.name}</span>
            )}
          </div>
          <div className="post-video-form-group">
            <label htmlFor="post-video-file">Video file <span className="required">*</span></label>
            <input
              id="post-video-file"
              type="file"
              name="video_file"
              accept="video/*"
              onChange={handleChange}
              required
            />
            {formData.video_file && (
              <span className="post-video-file-name">{formData.video_file.name}</span>
            )}
          </div>
          <div className="post-video-modal-actions">
            <button type="button" className="post-video-btn post-video-btn-cancel" onClick={handleClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="post-video-btn post-video-btn-submit" disabled={submitting}>
              {submitting ? "Posting…" : "Post video"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
