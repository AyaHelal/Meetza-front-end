import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause } from '@phosphor-icons/react';
import '../GroupChat.css';

// WhatsApp-style Audio Player Component with waveform
const AudioPlayer = ({ mediaUrl, mediaItem, isOwnMessage = false }) => {
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
            if (audio.duration && isFinite(audio.duration)) {
                setDuration(audio.duration);
            }
        };
        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);
        const handleError = (e) => {
            console.error('Audio playback error:', e);
            setError('Failed to load audio');
            setIsLoading(false);
        };
        const handleLoadStart = () => setIsLoading(true);

        // Try to load metadata
        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('durationchange', updateDuration);
        audio.addEventListener('timeupdate', updateTime);
        audio.addEventListener('canplay', handleCanPlay);
        audio.addEventListener('play', handlePlay);
        audio.addEventListener('pause', handlePause);
        audio.addEventListener('error', handleError);
        audio.addEventListener('loadstart', handleLoadStart);

        // Force load metadata
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

    // Generate waveform data immediately (simulated - in production, you'd analyze the audio)
    useEffect(() => {
        // Generate waveform immediately, don't wait for duration
        const bars = 50;
        const data = Array.from({ length: bars }, () => Math.random() * 100);
        setWaveformData(data);
    }, [mediaUrl]); // Generate when mediaUrl changes, not when duration loads

    const togglePlayPause = () => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying) {
            audio.pause();
        } else {
            audio.play().catch(err => {
                console.error('Play error:', err);
                setError('Failed to play audio');
            });
        }
    };

    const handleWaveformClick = (e) => {
        const audio = audioRef.current;
        if (!audio || !duration) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, clickX / rect.width));
        const newTime = percentage * duration;

        audio.currentTime = newTime;
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
            <audio
                ref={audioRef}
                preload="metadata"
                crossOrigin="anonymous"
                style={{ display: 'none' }}
            >
                <source src={mediaUrl} type={mimeType} />
                <source src={mediaUrl} type="audio/webm" />
                <source src={mediaUrl} type="audio/mpeg" />
                <source src={mediaUrl} type="audio/ogg" />
            </audio>

            {error ? (
                <div className="audio-error">
                    <span>{error}</span>
                    <button onClick={() => {
                        setError(null);
                        setIsLoading(true);
                        if (audioRef.current) {
                            audioRef.current.load();
                        }
                    }}>Retry</button>
                </div>
            ) : (
                <div className="voice-message-content">
                    <button
                        className="voice-play-btn"
                        onClick={togglePlayPause}
                        disabled={isLoading}
                        aria-label={isPlaying ? 'Pause' : 'Play'}
                    >
                        {isPlaying ? (
                            <Pause size={16} weight="fill" />
                        ) : (
                            <Play size={16} weight="fill" />
                        )}
                    </button>

                    <div className="voice-waveform-container" onClick={handleWaveformClick}>
                        <div className="voice-playback-indicator" style={{ left: `${progressPercentage}%` }} />
                        <div className="voice-waveform">
                            {waveformData.length > 0 ? (
                                waveformData.map((height, index) => {
                                    const isPlayed = (index / waveformData.length) * 100 < progressPercentage;
                                    return (
                                        <div
                                            key={index}
                                            className={`waveform-bar ${isPlayed ? 'played' : ''}`}
                                            style={{ height: `${height}%` }}
                                        />
                                    );
                                })
                            ) : (
                                // Show default waveform bars even if data not loaded yet
                                Array.from({ length: 50 }, (_, index) => (
                                    <div
                                        key={index}
                                        className="waveform-bar"
                                        style={{ height: `${Math.random() * 100}%` }}
                                    />
                                ))
                            )}
                        </div>
                    </div>

                    <div className="voice-time-info">
                        <span className="voice-current-time">{formatTime(isPlaying ? currentTime : duration || 0)}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

const MessageItem = ({ message, groupId, onDeleteMessage, onEditMessage, currentUser, currentUserEmail, onMediaClick }) => {
    const [showContextMenu, setShowContextMenu] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(message.text || '');

    const isLinkMessage = message.message && /^https?:\/\/\S+$/i.test(message.message.trim());
    const finalMedia =
        message.media?.length > 0
            ? message.media
            : isLinkMessage
                ? [
                    {
                        media_type: 'link',
                        media_url: message.message,
                    },
                ]
                : [];



    // Update editText when message.text changes (e.g., after successful edit)
    useEffect(() => {
        setEditText(message.text);
    }, [message.text]);

    const messageRef = useRef(null);
    const menuRef = useRef(null);

    // Determine ownership: prefer `currentUserEmail` prop (from MainChat), fallback to `currentUser` object
    const resolvedCurrentEmail = currentUserEmail || currentUser?.email || currentUser?.user_email || null;
    const messageEmail = message.senderEmail || message.sender_email || null;
    const emailMatch = messageEmail && resolvedCurrentEmail && messageEmail.toLowerCase() === resolvedCurrentEmail.toLowerCase();
    const nameMatch = message.sender === 'You' || message.sender === currentUser?.name;
    const isOwnMessage = emailMatch || nameMatch;

    const handleRightClick = (e) => {
        // Only show context menu for own messages
        if (!isOwnMessage) {
            return;
        }
        e.preventDefault();
        setMenuPosition({ x: e.clientX, y: e.clientY });
        setShowContextMenu(true);
    };

    const handleDelete = () => {
        onDeleteMessage(message.id);
        setShowContextMenu(false);
    };

    const handleEdit = () => {
        setIsEditing(true);
        setShowContextMenu(false);
    };

    const handleEditSubmit = () => {
        const trimmedText = editText.trim();
        if (trimmedText && trimmedText !== message.text) {
            onEditMessage(message.id, trimmedText);
        } else if (!trimmedText) {
            // If empty, cancel the edit
            handleEditCancel();
            return;
        }
        setIsEditing(false);
    };

    const handleEditCancel = () => {
        setEditText(message.text);
        setIsEditing(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleEditSubmit();
        } else if (e.key === 'Escape') {
            handleEditCancel();
        }
    };

    const getExtension = (mediaItem) => {
        const fileName = mediaItem?.file_name || '';
        if (fileName.includes('.')) {
            return fileName.split('.').pop().toLowerCase();
        }

        const url = mediaItem?.media_url || mediaItem?.file_url || '';
        if (url.includes('.')) {
            return url.split('?')[0].split('.').pop().toLowerCase();
        }
        return '';
    };

    const getMediaType = (mediaItem) => {
        const declaredType = mediaItem?.media_type || mediaItem?.file_type || '';
        if (typeof declaredType === 'string' && declaredType.length > 0) {
            if (declaredType.startsWith('image')) return 'image';
            if (declaredType.startsWith('video')) return 'video';
            if (declaredType.startsWith('audio') || declaredType === 'voice') return 'audio';
            if (declaredType === 'document' || declaredType === 'file') return 'document';
            if (declaredType === 'link') return 'link';
        }

        const extension = getExtension(mediaItem);
        if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'svg'].includes(extension)) return 'image';
        if (['mp4', 'mov', 'webm', 'mkv'].includes(extension)) return 'video';
        if (['mp3', 'wav', 'm4a', 'aac', 'ogg', 'webm'].includes(extension)) return 'audio';
        if (extension) return 'document';
        return 'document';
    };

    const getFileNameFromMedia = (mediaItem) => {
        if (mediaItem?.file_name) return mediaItem.file_name;

        const url = mediaItem?.media_url || mediaItem?.file_url;
        if (url) {
            try {
                const parsedUrl = new URL(url);
                const candidate = decodeURIComponent(parsedUrl.pathname.split('/').pop());
                if (candidate) return candidate;
            } catch (err) {
                const parts = url.split('?')[0].split('/');
                const fallback = parts.pop();
                if (fallback) return fallback;
            }
        }

        return 'attachment';
    };

    const renderMedia = () => {
        if (!Array.isArray(finalMedia) || finalMedia.length === 0) {
            return null;
        }

        return (
            <div className="message-media-list">
                {finalMedia.map((mediaItem) => {
                    const mediaUrl = mediaItem?.media_url || mediaItem?.file_url;
                    if (!mediaUrl) return null;
                    const key = mediaItem.id || mediaUrl;
                    const type = getMediaType(mediaItem);

                    if (type === 'image') {
                        return (
                            <img
                                key={key}
                                src={mediaUrl}
                                alt="chat media"
                                className="message-media message-media-image"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onMediaClick?.({
                                        media_url: mediaUrl,
                                        file_name: mediaItem.file_name || 'Image',
                                        media_type: 'image'
                                    });
                                }}
                                style={{ cursor: 'pointer' }}
                            />
                        );
                    }

                    if (type === 'video') {
                        return (
                            <video key={key} className="message-media message-media-video" controls preload="metadata">
                                <source src={mediaUrl} type={mediaItem.media_type || mediaItem.file_type || 'video/mp4'} />
                                Your browser does not support the video tag.
                            </video>
                        );
                    }

                    if (type === 'audio') {
                        return (
                            <AudioPlayer
                                key={key}
                                mediaUrl={mediaUrl}
                                mediaItem={mediaItem}
                                isOwnMessage={isOwnMessage}
                            />
                        );
                    }

                    if (mediaItem.media_type === 'link') {
                        // Extract domain name from URL
                        let domainName = '';
                        let displayUrl = mediaUrl;

                        try {
                            const urlObj = new URL(mediaUrl);
                            domainName = urlObj.hostname.replace('www.', '');

                            // Truncate URL if too long (WhatsApp style - show first part)
                            if (mediaUrl.length > 60) {
                                displayUrl = mediaUrl.substring(0, 57) + '...';
                            }
                        } catch (e) {
                            domainName = 'Link';
                        }

                        return (
                            <a
                                key={key}
                                href={mediaUrl}
                                className="message-media message-media-link"
                                target="_blank"
                                rel="noopener noreferrer"
                                title={mediaUrl}
                            >
                                <div className="message-link-preview">
                                    <div className="message-link-info">
                                        <div className="message-link-domain">{domainName}</div>
                                        <div className="message-link-url">{displayUrl}</div>
                                    </div>
                                </div>
                            </a>
                        );
                    }

                    const fileName = getFileNameFromMedia(mediaItem);

                    // Ensure file name has proper extension
                    const ensureFileExtension = (name, mediaItem) => {
                        if (!name) return 'document';

                        // If name already has extension, return as is
                        if (name.includes('.') && name.split('.').pop().length <= 6) {
                            return name;
                        }

                        // Try to get extension from file_name, URL, or media_type
                        const extension = getExtension(mediaItem);
                        if (extension) {
                            // Remove any existing extension and add the correct one
                            const nameWithoutExt = name.split('.')[0];
                            return `${nameWithoutExt}.${extension}`;
                        }

                        return name;
                    };

                    const finalFileName = ensureFileExtension(fileName, mediaItem);

                    const handleDownload = async (e) => {
                        e.preventDefault();
                        try {
                            const response = await fetch(mediaUrl, {
                                method: 'GET',
                                headers: {
                                    'Authorization': `Bearer ${localStorage.getItem('token') || sessionStorage.getItem('token')}`
                                }
                            });

                            if (!response.ok) {
                                throw new Error('Failed to download file');
                            }

                            const blob = await response.blob();
                            const url = window.URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = finalFileName;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            window.URL.revokeObjectURL(url);
                        } catch (error) {
                            console.error('Error downloading file:', error);
                            // Fallback to opening in new tab
                            window.open(mediaUrl, '_blank');
                        }
                    };

                    return (
                        <a
                            key={key}
                            href={mediaUrl}
                            className="message-media message-media-doc"
                            onClick={handleDownload}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={finalFileName}
                            title={finalFileName}
                        >
                            <FileIconPlaceholder name={finalFileName} />
                            <div className="message-media-doc-text">
                                <span className="message-media-doc-meta">
                                    <span className="doc-meta-separator">•</span>
                                    <span className="doc-meta-type">{finalFileName}</span>
                                </span>
                            </div>
                        </a>
                    );
                })}
            </div>
        );
    };

    const FileIconPlaceholder = ({ name }) => {
        const extension = name?.split('.')?.pop()?.toUpperCase() || 'FILE';
        return (
            <span className="message-media-doc-badge">
                {extension.length <= 4 ? extension : 'FILE'}
            </span>
        );
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowContextMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <div
            className={`message ${isOwnMessage ? 'message-own' : 'message-other'}`}
            ref={messageRef}
            onContextMenu={isOwnMessage ? handleRightClick : undefined}
        >
            {!isOwnMessage && (
                <div className="message-avatar">
                    {message.senderPhoto ? (
                        <img src={message.senderPhoto} alt={message.sender} className="message-avatar-img" />
                    ) : (
                        <span>{message.initials}</span>
                    )}
                </div>
            )}
            <div className="message-content">
                {!isOwnMessage && (
                    <div className="message-header">
                        <span className="message-sender">{message.sender}</span>
                        <span className="message-time">{message.time}</span>
                    </div>
                )}
                {isOwnMessage && (
                    <div className="message-header message-header-own">
                        <span className="message-time">{message.time}</span>
                    </div>
                )}
                {!isLinkMessage && message.message && (
                    <div className="message-text">
                        {isEditing ? (
                            <input
                                type="text"
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                onBlur={handleEditSubmit}
                                onKeyDown={handleKeyDown}
                                autoFocus
                                className="edit-input"
                            />
                        ) : (
                            message.message || ''
                        )}
                    </div>
                )}

                {renderMedia()}
            </div>
            {showContextMenu && isOwnMessage && (
                <div
                    className="context-menu"
                    ref={menuRef}
                    style={{ left: menuPosition.x, top: menuPosition.y }}
                >
                    <button onClick={handleEdit}>Edit</button>
                    <button onClick={handleDelete}>Delete</button>
                </div>
            )}
        </div>
    );
};

export default MessageItem;