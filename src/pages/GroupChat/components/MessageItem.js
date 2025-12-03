import React, { useState, useRef, useEffect } from 'react';
import '../GroupChat.css';

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
                            <div key={key} className="message-media message-media-audio-wrapper">
                                <div className="message-media-audio-label">Voice note</div>
                                <audio className="message-media-audio" controls preload="metadata">
                                    <source src={mediaUrl} type={mediaItem.media_type || mediaItem.file_type || 'audio/mpeg'} />
                                    Your browser does not support the audio element.
                                </audio>
                            </div>
                        );
                    }

                    if (mediaItem.media_type === 'link') {
                        return (
                            <a
                                key={key}
                                href={mediaUrl}
                                className="message-media message-media-link"
                                target="_blank"
                                rel="noopener noreferrer"
                                title={mediaUrl}
                            >
                               🔗 {mediaUrl}
                            </a>
                        );
                    }

                    const fileName = getFileNameFromMedia(mediaItem);
                    return (
                        <a
                            key={key}
                            href={mediaUrl}
                            className="message-media message-media-doc"
                            target="_blank"
                            rel="noopener noreferrer"
                            download={fileName}
                            title={fileName}
                        >
                            <FileIconPlaceholder name={fileName} />
                            <div className="message-media-doc-text">
                                <span className="message-media-doc-meta">
                                    <span className="doc-meta-separator">•</span>
                                    <span className="doc-meta-type">{fileName}</span>
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