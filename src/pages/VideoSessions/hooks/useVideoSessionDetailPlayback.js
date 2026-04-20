import { useState, useRef, useEffect, useCallback } from "react";
import { putVideoWatchProgress } from "../services";

/**
 * Video element, progress bar, volume, and server watch-progress sync.
 */
export function useVideoSessionDetailPlayback({ session, detail, setDetail }) {
  const [progress, setProgress] = useState(0);
  const videoRef = useRef(null);
  const resumeAppliedRef = useRef(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const volumeControlRef = useRef(null);

  const sessionIdRef = useRef(session?.id);
  useEffect(() => {
    sessionIdRef.current = session?.id;
  }, [session?.id]);

  const currentTimeRef = useRef(0);
  const videoDurationRef = useRef(0);
  useEffect(() => {
    currentTimeRef.current = currentTimeSec;
  }, [currentTimeSec]);
  useEffect(() => {
    videoDurationRef.current = videoDuration;
  }, [videoDuration]);

  const hasPlaybackStartedRef = useRef(false);

  const applyWatchNormToDetail = useCallback((videoId, norm) => {
    setDetail((prev) => {
      if (!prev || String(prev.detailVideoId) !== String(videoId)) return prev;
      return {
        ...prev,
        watchProgressSeconds: norm.progressSeconds,
        watchStatus: norm.watchStatus != null ? norm.watchStatus : prev.watchStatus,
        progressPercentage:
          norm.progressPercentage != null ? norm.progressPercentage : prev.progressPercentage,
      };
    });
  }, [setDetail]);

  const saveProgressDuringPlayback = useCallback(
    async (videoId, source) => {
      if (!videoId) return;
      const el = videoRef.current;
      let sec = 0;
      if (el && Number.isFinite(el.currentTime)) sec = Math.max(0, Math.floor(el.currentTime));
      else sec = Math.max(0, Math.floor(currentTimeRef.current));
      const played = hasPlaybackStartedRef.current;
      if (sec < 0.5 && !played && source !== "seeked") return;
      try {
        const norm = await putVideoWatchProgress(String(videoId), { progress_seconds: sec });
        applyWatchNormToDetail(videoId, norm);
      } catch (e) {
        console.warn("save watch progress failed", e);
      }
    },
    [applyWatchNormToDetail]
  );

  const markWatchCompleted = useCallback(
    async (videoId) => {
      if (!videoId) return;
      const el = videoRef.current;
      let sec = 0;
      if (el && Number.isFinite(el.currentTime)) sec = Math.max(0, Math.floor(el.currentTime));
      try {
        const norm = await putVideoWatchProgress(String(videoId), {
          completed: true,
          ...(sec > 0 ? { progress_seconds: sec } : {}),
        });
        applyWatchNormToDetail(videoId, norm);
      } catch (e) {
        console.warn("mark watch completed failed", e);
      }
    },
    [applyWatchNormToDetail]
  );

  useEffect(() => {
    if (!session?.id) return undefined;
    const id = session.id;
    const iv = window.setInterval(() => {
      if (!hasPlaybackStartedRef.current) return;
      const el = videoRef.current;
      if (!el || el.paused || el.ended) return;
      void saveProgressDuringPlayback(id, "interval");
    }, 12000);
    return () => window.clearInterval(iv);
  }, [session?.id, saveProgressDuringPlayback]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handleLoaded = () => {
      const dur = video.duration || 0;
      setVideoDuration(dur);
      const cur = video.currentTime || 0;
      setCurrentTimeSec(cur);
      setProgress(dur ? (cur / dur) * 100 : 0);
    };
    const handleTimeUpdate = () => {
      const cur = video.currentTime || 0;
      setCurrentTimeSec(cur);
      setProgress(videoDuration ? (cur / videoDuration) * 100 : 0);
    };
    const handlePlaying = () => {
      hasPlaybackStartedRef.current = true;
    };
    const handlePause = () => {
      const sid = sessionIdRef.current;
      if (sid) void saveProgressDuringPlayback(sid, "pause");
    };
    const handleSeeked = () => {
      const sid = sessionIdRef.current;
      if (sid) void saveProgressDuringPlayback(sid, "seeked");
    };
    const handleEnded = () => {
      const sid = sessionIdRef.current;
      if (sid) void markWatchCompleted(sid);
      setIsPlaying(false);
    };
    video.addEventListener("loadedmetadata", handleLoaded);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("playing", handlePlaying);
    video.addEventListener("pause", handlePause);
    video.addEventListener("seeked", handleSeeked);
    video.addEventListener("ended", handleEnded);
    return () => {
      video.removeEventListener("loadedmetadata", handleLoaded);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("playing", handlePlaying);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("seeked", handleSeeked);
      video.removeEventListener("ended", handleEnded);
    };
  }, [detail?.videoUrl, session?.videoUrl, videoDuration, saveProgressDuringPlayback, markWatchCompleted]);

  useEffect(() => {
    const video = videoRef.current;
    const sec = detail?.watchProgressSeconds;
    if (!video || !session?.id) return;
    if (detail?.detailVideoId !== session.id) return;
    if (sec == null || sec <= 0) return;
    if (resumeAppliedRef.current) return;

    let cancelled = false;

    const tryApply = () => {
      if (cancelled || resumeAppliedRef.current) return;
      const dur = video.duration;
      if (!dur || !Number.isFinite(dur) || dur <= 0) return;
      const t = Math.min(sec, Math.max(0, dur - 0.05));
      if (t <= 0) return;
      video.currentTime = t;
      setVideoDuration(dur);
      setCurrentTimeSec(t);
      setProgress((t / dur) * 100);
      resumeAppliedRef.current = true;
    };

    tryApply();
    if (resumeAppliedRef.current) return undefined;

    const onMeta = () => tryApply();
    const onCanPlay = () => tryApply();
    video.addEventListener("loadedmetadata", onMeta);
    video.addEventListener("canplay", onCanPlay);
    return () => {
      cancelled = true;
      video.removeEventListener("loadedmetadata", onMeta);
      video.removeEventListener("canplay", onCanPlay);
    };
  }, [session?.id, detail?.detailVideoId, detail?.watchProgressSeconds, detail?.videoUrl, session?.videoUrl]);

  const handleTogglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, []);

  const handleProgressChange = useCallback(
    (e) => {
      const value = Number(e.target.value);
      setProgress(value);
      const video = videoRef.current;
      if (!video || !videoDuration) return;
      const newTime = (value / 100) * videoDuration;
      video.currentTime = newTime;
      setCurrentTimeSec(newTime);
    },
    [videoDuration]
  );

  const handleVolumeChange = useCallback((e) => {
    const value = Number(e.target.value);
    setVolume(value);
    const video = videoRef.current;
    if (video) video.volume = value;
  }, []);

  return {
    videoRef,
    progress,
    setProgress,
    resumeAppliedRef,
    hasPlaybackStartedRef,
    videoDuration,
    setVideoDuration,
    currentTimeSec,
    setCurrentTimeSec,
    volume,
    isPlaying,
    setIsPlaying,
    showVolumeSlider,
    setShowVolumeSlider,
    volumeControlRef,
    handleTogglePlay,
    handleProgressChange,
    handleVolumeChange,
  };
}
