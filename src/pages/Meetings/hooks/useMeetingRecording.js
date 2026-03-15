import { useCallback, useEffect, useRef, useState } from "react";
import api from "../../../API/axiosInstance";
import { smartToast } from "../../../API/toastManager";
import { summarizeVideo } from "../../VideoSessions/services/videoSessionsService";

const CAPTURE_FPS = 30;
const CROP_OUTPUT_WIDTH = 1280;
const CROP_OUTPUT_HEIGHT = 720;

/** Gain for admin (recording) mic so it's clear in the mix. */
const RECORDING_MIC_GAIN = 1.2;
/** Gain for remote participants so their voices are clearer in the recording. */
const REMOTE_PARTICIPANTS_GAIN = 1.8;
/** Gain for tab/window audio if shared. */
const DISPLAY_AUDIO_GAIN = 1.0;

/**
 * Mix multiple audio sources into one MediaStream with optional gain per source type.
 * Uses a dedicated recording mic stream so the admin's voice is always captured (independent of in-call mute).
 */
function createMixedAudioStream(recordingMicStream, remoteStreams, displayAudioTracks = [], options = {}) {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const destination = audioContext.createMediaStreamDestination();
  const localGain = options.recordingMicGain ?? RECORDING_MIC_GAIN;
  const remoteGain = options.remoteGain ?? REMOTE_PARTICIPANTS_GAIN;
  const displayGain = options.displayGain ?? DISPLAY_AUDIO_GAIN;

  const addSource = (stream, gainValue) => {
    if (!stream || stream.getAudioTracks().length === 0) return;
    try {
      const source = audioContext.createMediaStreamSource(stream);
      const gainNode = audioContext.createGain();
      gainNode.gain.value = gainValue;
      source.connect(gainNode);
      gainNode.connect(destination);
    } catch (e) {
    }
  };

  if (recordingMicStream) addSource(recordingMicStream, localGain);
  displayAudioTracks.forEach((track) => addSource(new MediaStream([track]), displayGain));
  remoteStreams.forEach(({ stream }) => {
    if (stream) addSource(stream, remoteGain);
  });

  const mixedStream = destination.stream;
  return { mixedStream, audioContext };
}


function createSelectionOverlay() {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.style.cssText =
      "position:fixed;inset:0;background:rgba(0,0,0,0.35);cursor:crosshair;z-index:99999;user-select:none;";
    document.body.appendChild(overlay);

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";
    cancelBtn.style.cssText =
      "position:fixed;top:16px;right:16px;z-index:100000;padding:8px 16px;cursor:pointer;font-size:14px;";
    overlay.appendChild(cancelBtn);
    cancelBtn.onclick = () => {
      document.body.removeChild(overlay);
      resolve(null);
    };

    let startX, startY, rectDiv;

    const mouseMove = (e) => {
      if (!rectDiv) return;
      const x = Math.min(e.clientX, startX);
      const y = Math.min(e.clientY, startY);
      const w = Math.abs(e.clientX - startX);
      const h = Math.abs(e.clientY - startY);
      rectDiv.style.left = x + "px";
      rectDiv.style.top = y + "px";
      rectDiv.style.width = w + "px";
      rectDiv.style.height = h + "px";
    };

    overlay.onmousedown = (e) => {
      if (e.target === cancelBtn) return;
      startX = e.clientX;
      startY = e.clientY;
      rectDiv = document.createElement("div");
      rectDiv.style.cssText =
        "position:absolute;border:2px dashed #00f;background:rgba(0,0,255,0.12);pointer-events:none;";
      rectDiv.style.left = startX + "px";
      rectDiv.style.top = startY + "px";
      rectDiv.style.width = "0";
      rectDiv.style.height = "0";
      overlay.appendChild(rectDiv);
      document.addEventListener("mousemove", mouseMove);
    };

    overlay.onmouseup = (e) => {
      document.removeEventListener("mousemove", mouseMove);
      if (!rectDiv) return;

      let x = Math.min(startX, e.clientX);
      let y = Math.min(startY, e.clientY);
      let width = Math.abs(e.clientX - startX);
      let height = Math.abs(e.clientY - startY);

      if (width < 30 || height < 30) {
        x = 0;
        y = 0;
        width = window.innerWidth;
        height = window.innerHeight;
      }

      document.body.removeChild(overlay);
      resolve({ x, y, width, height });
    };
  });
}

/** Minimal 1x1 PNG blob so backend always receives a poster_file when we have no captured frame. */
function getFallbackPosterBlob() {
  const base64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: "image/png" });
}

/**
 * Capture one frame from a MediaStream to a blob (for poster).
 * Uses play() + loadeddata (no .load()) and a short delay so the first frame is not black.
 */
function captureFrameFromStream(stream, width = 1280, height = 720) {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    video.onloadeddata = () => {
      video.play().catch(() => {});
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      const draw = () => {
        if (video.readyState >= 2) {
          ctx.drawImage(video, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              video.srcObject = null;
              resolve(blob || null);
            },
            "image/png",
            0.92
          );
        } else {
          requestAnimationFrame(draw);
        }
      };
      draw();
    };
    video.onerror = () => {
      video.srcObject = null;
      resolve(null);
    };
  });
}

/**
 * Meeting recording: screen record of the meeting room (tab/window) via getDisplayMedia,
 * plus microphone audio. Upload to backend /video/create.
 */
export function useMeetingRecording({
  localStreamRef,
  remoteStreams = [],
  recordingPayloadRef,
  recordingStartedRef,
  meetingId,
  meetingInfo,
  hasJoined,
  isMeetingAdmin,
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingPaused, setIsRecordingPaused] = useState(false);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const startTimeRef = useRef(null);
  const posterBlobRef = useRef(null);
  const displayStreamRef = useRef(null);
  const stopRecordingRef = useRef(null);
  const animationFrameRef = useRef(null);
  const displayVideoRef = useRef(null);
  const mixAudioContextRef = useRef(null);
  const recordingMicStreamRef = useRef(null);

  const startRecording = useCallback(async () => {
    try {
      smartToast.info('Swipe on the screen to select the recording area, or tap "Cancel".');
      const cropArea = await createSelectionOverlay();
      if (cropArea === null) {
        smartToast.info("The region has been cancelled.");
        return;
      }

      // Dedicated mic for recording so admin voice is always captured (independent of in-call mute).
      let recordingMicStream = null;
      try {
        recordingMicStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        recordingMicStreamRef.current = recordingMicStream;
      } catch (micErr) {
        recordingMicStream = localStreamRef?.current ?? null;
      }

      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: "browser",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: CAPTURE_FPS },
        },
        audio: true,
        selfBrowserSurface: "include",
        preferCurrentTab: true,
      });

      displayStreamRef.current = displayStream;

      const videoTracks = displayStream.getVideoTracks();
      const displayAudioTracks = displayStream.getAudioTracks();

      const video = document.createElement("video");
      video.srcObject = displayStream;
      video.muted = true;
      video.playsInline = true;
      displayVideoRef.current = video;
      video.play().catch(() => {});

      await new Promise((resolve, reject) => {
        video.onloadeddata = resolve;
        video.onerror = () => reject(new Error("Display video failed to load"));
      });

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const scaleX = video.videoWidth / vw;
      const scaleY = video.videoHeight / vh;
      const sx = cropArea.x * scaleX;
      const sy = cropArea.y * scaleY;
      const sw = cropArea.width * scaleX;
      const sh = cropArea.height * scaleY;

      const canvas = document.createElement("canvas");
      canvas.width = CROP_OUTPUT_WIDTH;
      canvas.height = CROP_OUTPUT_HEIGHT;
      const ctx = canvas.getContext("2d");

      const draw = () => {
        if (video.readyState >= 2) {
          ctx.drawImage(video, sx, sy, sw, sh, 0, 0, CROP_OUTPUT_WIDTH, CROP_OUTPUT_HEIGHT);
        }
        animationFrameRef.current = requestAnimationFrame(draw);
      };
      draw();

      await new Promise((r) => setTimeout(r, 300));
      canvas.toBlob(
        (blob) => { if (blob) posterBlobRef.current = blob; },
        "image/png",
        0.92
      );

      const croppedStream = canvas.captureStream(CAPTURE_FPS);
      const finalStream = new MediaStream();

      croppedStream.getVideoTracks().forEach((t) => finalStream.addTrack(t));

      const { mixedStream, audioContext } = createMixedAudioStream(
        recordingMicStream,
        remoteStreams,
        displayAudioTracks
      );
      mixAudioContextRef.current = audioContext;
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }
      const mixedTracks = mixedStream.getAudioTracks();
      if (mixedTracks.length > 0) {
        finalStream.addTrack(mixedTracks[0]);
      }

      videoTracks[0]?.addEventListener("ended", () => {
        if (stopRecordingRef.current && mediaRecorderRef.current?.state === "recording") {
          stopRecordingRef.current(recordingPayloadRef?.current);
        }
      });

      const mimeType = MediaRecorder.isTypeSupported("video/mp4")
        ? "video/mp4"
        : MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
          ? "video/webm;codecs=vp9"
          : MediaRecorder.isTypeSupported("video/webm")
            ? "video/webm"
            : "video/mp4";
      const mediaRecorder = new MediaRecorder(finalStream, {
        mimeType,
        videoBitsPerSecond: 2500000,
        audioBitsPerSecond: 256000,
      });
      recordedChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data?.size > 0) recordedChunksRef.current.push(e.data);
      };
      mediaRecorder.onerror = (e) => console.error("MediaRecorder error:", e);
      mediaRecorder.start(1000);
      mediaRecorderRef.current = mediaRecorder;
      startTimeRef.current = Date.now();
      setIsRecording(true);
      setIsRecordingPaused(false);

      smartToast.info('Recording is in progress. Your mic and all participants are mixed into the recording.');
    } catch (err) {
      if (err.name === "NotAllowedError") {
        smartToast.error("Screen sharing was cancelled. Recording did not start.");
      } else {
        console.error("getDisplayMedia failed:", err);
        smartToast.error(err?.message || "Screen recording failed to start.");
      }
    }
  }, [localStreamRef, remoteStreams]);

  const stopRecording = useCallback(
    async (payload) => {
      if (payload !== undefined) recordingPayloadRef.current = payload;
      const effectivePayload = payload ?? recordingPayloadRef.current ?? {};
      const { meetingId, title, group_id, description } = effectivePayload;

      const finalTitle =
        title || meetingInfo?.title || "Meeting Recording";
      const finalGroupId =
        group_id ?? meetingInfo?.group_id ?? null;

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      const video = displayVideoRef.current;
      if (video) {
        video.srcObject = null;
        displayVideoRef.current = null;
      }
      const displayStream = displayStreamRef.current;
      if (displayStream) {
        displayStream.getTracks().forEach((t) => t.stop());
        displayStreamRef.current = null;
      }
      const recordingMic = recordingMicStreamRef.current;
      if (recordingMic) {
        recordingMic.getTracks().forEach((t) => t.stop());
        recordingMicStreamRef.current = null;
      }
      const ctx = mixAudioContextRef.current;
      if (ctx) {
        try { ctx.close(); } catch (e) { /* ignore */ }
        mixAudioContextRef.current = null;
      }

      const mr = mediaRecorderRef.current;
      if (!mr || mr.state === "inactive") {
        setIsRecording(false);
        return Promise.resolve();
      }

      return new Promise((resolve) => {
        mr.onstop = async () => {
          mediaRecorderRef.current = null;
          setIsRecording(false);
          setIsRecordingPaused(false);
          const chunks = recordedChunksRef.current;
          recordedChunksRef.current = [];
          const posterBlob = posterBlobRef.current;
          posterBlobRef.current = null;
          const startTime = startTimeRef.current;
          startTimeRef.current = null;
          const durationSeconds = startTime
            ? Math.round((Date.now() - startTime) / 1000)
            : 0;

          if (!chunks.length) {
            resolve();
            return;
          }

          const extension = "mp4";
          const cleanMimeType = "video/mp4";
          const videoBlob = new Blob(chunks, { type: cleanMimeType });

          if (!finalGroupId || !finalTitle) {
            console.error("Recording payload missing title or group_id for upload", {
              effectivePayload,
              meetingId,
              meetingInfo,
            });
            smartToast.error("Cannot upload recording: missing meeting group or title.");
            resolve();
            return;
          }

          const formData = new FormData();
          formData.append(
            "video_file",
            videoBlob,
            `meeting-recording.${extension}`
          );
          formData.append("title", finalTitle);
          formData.append("group_id", String(finalGroupId));
          formData.append("duration", String(durationSeconds));
          formData.append("description", description ?? "");
          if (meetingId) formData.append("meeting_id", meetingId);

          const posterToSend = posterBlob || getFallbackPosterBlob();
          formData.append(
            "poster_file",
            posterToSend,
            "meeting-recording-poster.png"
          );

          try {
            smartToast.info("Uploading recording to Cloudinary…");
            const response = await api.post("/video/create", formData, { timeout: 300000 });
            smartToast.success("Meeting recording uploaded.");

            // Pre-generate summary in background after video is created
            const videoData = response?.data?.data || response?.data;
            if (videoData?.id && videoData?.video_url) {
              // Call summarize in background for both languages without waiting
              summarizeVideo(videoData.id, videoData.video_url, 'en').catch(err => console.log('Background summary EN failed:', err));
              summarizeVideo(videoData.id, videoData.video_url, 'ar').catch(err => console.log('Background summary AR failed:', err));
            }
          } catch (err) {
            console.error(
              "Upload meeting recording failed:",
              err?.response?.data || err
            );
            smartToast.error(
              err?.response?.data?.message ||
                err?.message ||
                "Failed to upload recording"
            );
          }
          resolve();
        };
        mr.stop();
      });
    },
    [meetingInfo]
  );

  stopRecordingRef.current = stopRecording;

  const pauseRecording = useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (!mr || mr.state !== "recording") return;
    try {
      if (typeof mr.pause === "function") {
        mr.pause();
        setIsRecordingPaused(true);
        smartToast.info("Recording paused. Tap Resume to continue or End to save/discard.");
      } else {
        smartToast.info("Pause not supported in this browser.");
      }
    } catch (e) {
      console.error("MediaRecorder pause failed:", e);
      smartToast.error("Could not pause recording.");
    }
  }, []);

  const resumeRecording = useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (!mr || mr.state !== "paused") return;
    try {
      if (typeof mr.resume === "function") {
        mr.resume();
        setIsRecordingPaused(false);
        smartToast.info("Recording resumed.");
      }
    } catch (e) {
      console.error("MediaRecorder resume failed:", e);
    }
  }, []);

  const cancelRecording = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    const video = displayVideoRef.current;
    if (video) {
      video.srcObject = null;
      displayVideoRef.current = null;
    }
    const displayStream = displayStreamRef.current;
    if (displayStream) {
      displayStream.getTracks().forEach((t) => t.stop());
      displayStreamRef.current = null;
    }
    const recordingMic = recordingMicStreamRef.current;
    if (recordingMic) {
      recordingMic.getTracks().forEach((t) => t.stop());
      recordingMicStreamRef.current = null;
    }
    const ctx = mixAudioContextRef.current;
    if (ctx) {
      try {
        ctx.close();
      } catch (e) { /* ignore */ }
      mixAudioContextRef.current = null;
    }
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") {
      mr.onstop = null;
      try {
        mr.stop();
      } catch (e) { /* ignore */ }
    }
    mediaRecorderRef.current = null;
    recordedChunksRef.current = [];
    posterBlobRef.current = null;
    startTimeRef.current = null;
    setIsRecording(false);
    setIsRecordingPaused(false);
    smartToast.info("Recording discarded.");
  }, []);

  useEffect(() => {
    recordingPayloadRef.current =
      meetingId && meetingInfo
        ? {
            meetingId,
            title: meetingInfo.title,
            group_id: meetingInfo.group_id,
            description: meetingInfo.description,
          }
        : null;
  }, [meetingId, meetingInfo, recordingPayloadRef]);

  useEffect(() => {
    if (recordingStartedRef) recordingStartedRef.current = false;
  }, [meetingId, recordingStartedRef]);

  const recordingEnabled =
    meetingInfo &&
    meetingInfo.recording != null &&
    meetingInfo.recording !== 0 &&
    meetingInfo.recording !== "0";

  useEffect(() => {
    if (
      !hasJoined ||
      !isMeetingAdmin ||
      !recordingEnabled ||
      (recordingStartedRef?.current) ||
      isRecording
    ) {
      return;
    }
    const id = setInterval(() => {
      if (recordingStartedRef?.current) return;
      const hasLocalStream = !!localStreamRef?.current;
      if (hasLocalStream) {
        recordingStartedRef.current = true;
        clearInterval(id);
        startRecording();
      }
    }, 400);
    return () => clearInterval(id);
  }, [hasJoined, isMeetingAdmin, recordingEnabled, isRecording, startRecording]);

  useEffect(() => {
    return () => {
      const payload = recordingPayloadRef?.current;
      if (payload) stopRecording(payload);
    };
  }, [stopRecording, recordingPayloadRef]);

  return {
    isRecording,
    isRecordingPaused,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording,
  };
}
