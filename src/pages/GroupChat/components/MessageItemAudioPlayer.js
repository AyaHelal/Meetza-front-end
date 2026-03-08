import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause } from '@phosphor-icons/react';

export default function MessageItemAudioPlayer({ mediaUrl, mediaItem, isOwnMessage = false }) {
  const audioRef = useRef(null);
  const [duration, setDuration] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [waveformData, setWaveformData] = useState([]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
        setIsLoading(false);
      }
    };
    const handleLoadedMetadata = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
        setIsLoading(false);
      }
    };
    const handleCanPlay = () => {
      setIsLoading(false);
      if (audio.duration && isFinite(audio.duration)) setDuration(audio.duration);
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleError = () => {
      setError('Failed to load audio');
      setIsLoading(false);
    };
    const handleLoadStart = () => setIsLoading(true);

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('durationchange', updateDuration);
    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleError);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.load();

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('durationchange', updateDuration);
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('loadstart', handleLoadStart);
    };
  }, [mediaUrl]);

  useEffect(() => {
    setWaveformData(Array.from({ length: 50 }, () => Math.random() * 100));
  }, [mediaUrl]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) audio.pause();
    else audio.play().catch(() => setError('Failed to play audio'));
  };

  const handleWaveformClick = (e) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = percentage * duration;
  };

  const formatTime = (seconds) => {
    if (!seconds || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration ? (currentTime / duration) * 100 : 0;
  const mimeType = mediaItem?.media_type || mediaItem?.file_type || mediaItem?.file_mime || 'audio/webm';

  return (
    <div className={`whatsapp-voice-message ${isOwnMessage ? 'voice-own' : 'voice-other'}`}>
      <audio ref={audioRef} preload="metadata" crossOrigin="anonymous" style={{ display: 'none' }}>
        <source src={mediaUrl || undefined} type={mimeType} />
        <source src={mediaUrl || undefined} type="audio/webm" />
        <source src={mediaUrl || undefined} type="audio/mpeg" />
        <source src={mediaUrl || undefined} type="audio/ogg" />
      </audio>

      {error ? (
        <div className="audio-error">
          <span>{error}</span>
          <button
            onClick={() => {
              setError(null);
              setIsLoading(true);
              if (audioRef.current) audioRef.current.load();
            }}
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="voice-message-content">
          <button
            className="voice-play-btn"
            onClick={togglePlayPause}
            disabled={isLoading}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={16} weight="fill" /> : <Play size={16} weight="fill" />}
          </button>
          <div className="voice-waveform-container" onClick={handleWaveformClick}>
            <div className="voice-playback-indicator" style={{ left: `${progressPercentage}%` }} />
            <div className="voice-waveform">
              {waveformData.length > 0
                ? waveformData.map((height, index) => {
                    const isPlayed = (index / waveformData.length) * 100 < progressPercentage;
                    return (
                      <div
                        key={index}
                        className={`waveform-bar ${isPlayed ? 'played' : ''}`}
                        style={{ height: `${height}%` }}
                      />
                    );
                  })
                : Array.from({ length: 50 }, (_, index) => (
                    <div key={index} className="waveform-bar" style={{ height: `${Math.random() * 100}%` }} />
                  ))}
            </div>
          </div>
          <div className="voice-time-info">
            <span className="voice-current-time">{formatTime(isPlaying ? currentTime : duration || 0)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
