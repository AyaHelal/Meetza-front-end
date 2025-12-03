import React, { useEffect, useRef, useState, useMemo } from 'react';
import MessageItem from './MessageItem';
import ChatInput from './ChatInput';
import { MagnifyingGlass, ArrowLeft } from '@phosphor-icons/react';
import { deleteMessage, updateMessage ,getMessages} from '../../../API/auth';
import './MainChat.css';
import { smartToast } from "../../../API/toastManager";
import '../GroupChat.css';
import { UserCheck,File } from "lucide-react";


const MainChat = ({
    messages: initialMessages,
    chatTitle,
    isMobile,
    showMainChat,
    onBackToChats,
    onSendMessage,
    activeSection,
    onCloseSection,
    contentResources,
    groupMediaItems,
    groupMembers,
    currentUserEmail,
    groupId,
    onMessageEdited,
    isSendingMessage = false
}) => {
    const messagesContainerRef = useRef(null);
    const messagesEndRef = useRef(null);
    const [modalPhoto, setModalPhoto] = useState(null);
    const [isUserAtBottom, setIsUserAtBottom] = useState(true);
    const prevMessagesLengthRef = useRef(0);
    const [messages, setMessages] = useState(Array.isArray(initialMessages) ? formatMessages(initialMessages) : []);
    const recentlyEditedRef = useRef(new Set()); // Track recently edited message IDs
    const skipNextUpdateRef = useRef(false); // Flag to skip the next update
    const [contentTab, setContentTab] = useState('media');
    const [mediaTab, setMediaTab] = useState('media');

    // Function to format messages and add link media items
    const formatMessages = (msgs) => {
        return msgs.map(msg => {
            const formattedMsg = { ...msg };
            const media = Array.isArray(msg.media) ? [...msg.media] : [];

            if (msg.message) {
                const urlRegex = /https?:\/\/[^\s<>,;]+/g;
                const urls = msg.message.match(urlRegex) || [];

                urls.forEach((url, index) => {
                    try {
                        const cleanUrl = url.replace(/[.,;:!?)]+$/, '');
                        const isFileUrl = /\.(jpg|jpeg|png|gif|bmp|webp|pdf|docx?|xlsx?|pptx?|txt|zip|rar|7z|mp4|mp3|wav|avi|mov|webm)(\?|$)/i.test(cleanUrl);

                        if (!isFileUrl) {
                            const hostname = new URL(cleanUrl).hostname.replace('www.', '');
                            const linkMediaItem = {
                                id: `link-${msg.id}-${index}`,
                                media_url: cleanUrl,
                                file_name: hostname,
                                media_type: 'link',
                                created_at: msg.created_at,
                                sender_name: msg.sender_name
                            };
                            media.push(linkMediaItem);
                        }
                    } catch (e) {
                        console.warn('Invalid URL in message:', url, e);
                    }
                });
            }

            formattedMsg.media = media;
            return formattedMsg;
        });
    };

    // Check if user is at the bottom of the chat
    const checkIfAtBottom = () => {
        if (!messagesContainerRef.current) return false;
        const container = messagesContainerRef.current;
        const threshold = 100; // 100px threshold
        const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
        return isAtBottom;
    };

    const scrollToBottom = (force = false) => {
        if (force || isUserAtBottom) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    };

    useEffect(() => {
        const container = messagesContainerRef.current;
        if (!container) return;

        const handleScroll = () => {
            const atBottom = checkIfAtBottom();
            setIsUserAtBottom(atBottom);
        };

        container.addEventListener('scroll', handleScroll);
        return () => {
            container.removeEventListener('scroll', handleScroll);
        };
    }, []);

    useEffect(() => {
        const currentMessagesLength = messages.length;
        const prevMessagesLength = prevMessagesLengthRef.current;


        if (currentMessagesLength > prevMessagesLength && isUserAtBottom) {
            scrollToBottom(true);
        }

        prevMessagesLengthRef.current = currentMessagesLength;
    }, [messages, isUserAtBottom]);

    // Also scroll when component becomes visible (e.g., on mobile when chat opens)
    useEffect(() => {
        if (showMainChat || !isMobile) {
            setTimeout(() => {
                scrollToBottom(true);
                setIsUserAtBottom(true);
            }, 100);
        }
    }, [showMainChat, isMobile]);

    // Update messages state when initialMessages prop changes
    // But preserve recently edited messages and don't remove messages that exist locally
    useEffect(() => {
    if (!initialMessages) return;

    setMessages(prevMessages => {
        const prevMap = new Map(prevMessages.map(msg => [msg.id, msg]));
        const newMap = new Map(initialMessages.map(msg => [msg.id, msg]));

        const merged = initialMessages.map(newMsg => {
            const prevMsg = prevMap.get(newMsg.id);
            if (prevMsg && recentlyEditedRef.current.has(newMsg.id)) {
                return prevMsg; // Keep local edit
            }
            return newMsg;
        });

        // Keep any local edited messages not yet returned from server
        prevMessages.forEach(prevMsg => {
            if (recentlyEditedRef.current.has(prevMsg.id) && !newMap.has(prevMsg.id)) {
                merged.push(prevMsg);
            }
        });

        return merged;
    });
}, [initialMessages]);

    useEffect(() => {
        setContentTab('media');
        setMediaTab('media');
    }, [activeSection]);

    const members = Array.isArray(groupMembers) ? groupMembers : [];

    // Extract links from messages
    // First, update the message links extraction to be more strict
// Replace the existing messageLinks useMemo with this:
const messageLinks = useMemo(() => {
    const links = [];

    // Use messages instead of initialMessages for real-time updates
    messages?.forEach(msg => {
        if (msg.is_deleted || !msg.message) return;

        const urlRegex = /https?:\/\/[^\s<>,;]+/g;
        const urls = msg.message.match(urlRegex) || [];

        urls.forEach(url => {
            try {
                const cleanUrl = url.replace(/[.,;:!?)]+$/, '');
                const isFileUrl = /\.(jpg|jpeg|png|gif|bmp|webp|pdf|docx?|xlsx?|pptx?|txt|zip|rar|7z|mp4|mp3|wav|avi|mov|webm)(\?|$)/i.test(cleanUrl);

                if (!isFileUrl) {
                    const domain = new URL(cleanUrl).hostname.replace('www.', '');
                    links.push({
                        id: `msg-${msg.id}-${cleanUrl}`,
                        media_url: cleanUrl,
                        file_name: domain,
                        original_url: cleanUrl,
                        created_at: msg.created_at,
                        sender_name: msg.sender_name,
                        message_id: msg.id,
                        isLink: true
                    });
                }
            } catch (e) {
                console.warn('Invalid URL in message:', url, e);
            }
        });
    });

    return links;
}, [messages]); // Changed from initialMessages to messages

// Then update the media tab resources to only include direct links
const mediaTabResources = useMemo(() => ({
    photos: [
        ...(groupMediaItems?.images || []),
        ...(groupMediaItems?.videos || [])
    ],
    links: messageLinks, // Only include direct message links
    documents: [
        ...(groupMediaItems?.files || []),
        ...(groupMediaItems?.audio || [])
    ]
}), [groupMediaItems, messageLinks]);

// Update the photo click handler to handle both media items and message attachments
const handlePhotoClick = (item) => {
    console.log('Clicked item:', item); // For debugging

    // If it's a direct link (from messages)
    if (item.isLink) {
        window.open(item.media_url, '_blank');
    }
    // If it's a media item (from group media)
    else {
        const url = item.media_url || item.file_url;
        const isImage = /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(url) ||
                       item.media_type?.startsWith('image') ||
                       item.file_type?.startsWith('image/');

        const isVideo = /\.(mp4|webm|ogg|mov)$/i.test(url) ||
                       item.media_type?.startsWith('video') ||
                       item.file_type?.startsWith('video/');

        const mediaItem = {
            media_url: url,
            file_name: item.file_name || 'Media',
            media_type: isImage ? 'image' : isVideo ? 'video' : 'file'
        };

        setModalPhoto(mediaItem);
    }
};

    const closeModal = () => {
        setModalPhoto(null);
    };

    const handleDeleteMessage = async (messageId) => {
        if (!groupId) {
            smartToast.error('Group ID is missing');
            return;
        }
        try {
            const response = await deleteMessage(groupId, messageId);
            console.log("Delete message response:", response);
            setMessages(prevMessages => prevMessages.filter(msg => msg.id !== messageId));
            smartToast.success('Message deleted successfully');
        } catch (error) {
            smartToast.error('Failed to delete message');
            console.error('Error deleting message:', error);
        }
    };


const handleEditMessage = async (messageId, newText) => {
    if (!groupId) return;
    if (!newText || !newText.trim()) return;

    const trimmedText = newText.trim();

    try {
        // Keep message locally as edited
        recentlyEditedRef.current.add(messageId);
        skipNextUpdateRef.current = true;

        setMessages(prevMessages =>
            prevMessages.map(msg =>
                msg.id === messageId ? { ...msg, text: trimmedText } : msg
            )
        );

        // Send to server
        await updateMessage(groupId, messageId, trimmedText);
        smartToast.success('Message updated successfully');

        if (onMessageEdited) onMessageEdited(messageId, trimmedText);

        // No timeout! Keep in recentlyEditedRef permanently until component unmount
    } catch (error) {
        // revert if server fails
        setMessages(prevMessages =>
            prevMessages.map(msg => {
                if (msg.id === messageId) {
                    const originalMsg = initialMessages?.find(m => m.id === messageId);
                    return { ...msg, text: originalMsg?.text || msg.text };
                }
                return msg;
            })
        );
        smartToast.error('Failed to edit message');
        console.error(error);
    }
};





    // Get file name with extension for download
    const getDownloadFileName = (item) => {
        // Helper function to get extension from file_type (most reliable)
        const getExtensionFromFileType = (fileType) => {
            if (!fileType) return null;

            const typeMap = {
                'application/pdf': 'pdf',
                'application/msword': 'doc',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
                'application/vnd.ms-excel': 'xls',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
                'application/vnd.ms-powerpoint': 'ppt',
                'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
                'text/plain': 'txt',
                'text/csv': 'csv',
                'application/zip': 'zip',
                'application/x-rar-compressed': 'rar',
                'application/x-zip-compressed': 'zip'
            };

            // Check typeMap first
            if (typeMap[fileType]) {
                return typeMap[fileType];
            }

            // Try to extract from MIME type (e.g., "application/pdf" -> "pdf")
            const parts = fileType.split('/');
            if (parts.length === 2) {
                const subtype = parts[1].split(';')[0].trim();
                // If it's a known extension format, use it
                if (subtype && subtype.length <= 5 && !subtype.includes('.')) {
                    return subtype;
                }
            }

            return null;
        };

        // Helper function to extract extension from URL
        const getExtensionFromUrl = (url) => {
            if (!url) return null;
            try {
                // Remove query parameters and hash
                const cleanUrl = url.split('?')[0].split('#')[0];
                // Match extension at the end of the filename (before any query params)
                const match = cleanUrl.match(/\.([a-zA-Z0-9]{1,5})$/);
                return match ? match[1].toLowerCase() : null;
            } catch (e) {
                return null;
            }
        };

        // Extract extension from file_name if it exists
        const getExtensionFromFileName = (fileName) => {
            if (!fileName) return null;
            const match = fileName.match(/\.([a-zA-Z0-9]{1,5})$/);
            return match ? match[1].toLowerCase() : null;
        };

        // Priority: file_type > file_url > file_name
        let extension = getExtensionFromFileType(item.file_type);

        if (!extension) {
            extension = getExtensionFromUrl(item.file_url);
        }

        if (!extension) {
            extension = getExtensionFromFileName(item.file_name);
        }

        // Build the filename
        if (item.file_name) {
            // Check if file_name already has a valid extension
            const existingExt = getExtensionFromFileName(item.file_name);
            if (existingExt) {
                return item.file_name;
            }
            // If no extension in file_name, add the one we found
            return extension ? `${item.file_name}.${extension}` : item.file_name;
        } else {
            // If no file_name, try to extract from URL
            if (item.file_url) {
                try {
                    const urlPath = item.file_url.split('?')[0].split('#')[0];
                    const urlParts = urlPath.split('/');
                    const lastPart = urlParts[urlParts.length - 1];

                    if (lastPart && lastPart.includes('.')) {
                        // URL already has filename with extension
                        return lastPart;
                    } else if (lastPart) {
                        // URL has filename without extension
                        return extension ? `${lastPart}.${extension}` : lastPart;
                    }
                } catch (e) {
                    // Fall through to default
                }
            }
            // Final fallback
            return extension ? `document.${extension}` : 'document';
        }
    };

    const renderMembersSection = () => {
        const sortedMembers = [...members].sort((a, b) => {
            if (a.role === 'Administrator' && b.role !== 'Administrator') return -1;
            if (a.role !== 'Administrator' && b.role === 'Administrator') return 1;
            return 0;
        });

        return (
            <div className="expanded-section1">
                <h4>Members</h4>
                <div className="members-list">
                    {sortedMembers.map((member) => (
                        <div key={member.id} className="member-item">
                            {member.user_photo ? (
                                <img
                                    src={member.user_photo}
                                    alt={member.name}
                                    className="member-avatar"
                                />
                            ) : (
                                <div
                                    className="rounded-3 d-flex align-items-center justify-content-center"
                                    style={{
                                        width: 50,
                                        height: 50,
                                        background: "linear-gradient(135deg, #0076EA, #00DC85)",
                                        color: "white",
                                        fontWeight: 600,
                                    }}
                                >
                                    <UserCheck size={28} />
                                </div>
                            )}

                            <div>
                                <h5>{member.name}</h5>
                                <p>{member.email}</p>
                            </div>
                            <span
                                className="member-role"
                                style={{
                                    fontWeight: member.role === 'Administrator' ? 'bold' : 'normal',
                                    color: member.role === 'Administrator' ? 'blue' : 'black'
                                }}
                            >
                                {member.role}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderResourceGrid = (items = []) => (
    <div className="expanded-items">
        {items.length === 0 && <p className="empty-state">No items yet.</p>}
        {items.map((item, index) => {
            const url = item.media_url || item.file_url;
            const isImage = /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(url) ||
                          item.media_type?.startsWith('image') ||
                          item.file_type?.startsWith('image/');

            return (
                <div
                    key={item.id || index}
                    className="media-item"
                    onClick={() => handlePhotoClick(item)}
                >
                    {isImage ? (
                        <img
                            src={url}
                            className="expanded-photo"
                            alt={item.file_name || 'media'}
                        />
                    ) : (
                        <div className="media-placeholder">
                            <File size={24} />
                            <span>{item.file_name || 'Media'}</span>
                        </div>
                    )}
                </div>
            );
        })}
    </div>
);

    const renderLinkList = (items = []) => {
    console.log('Rendering links:', items);
    return (
        <div className="expanded-items">
            {items.length === 0 && <p className="empty-state">No links yet.</p>}
            {items.map((item, index) => (
                <a
                    key={item.id || index}
                    href={item.media_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link-item"
                    onClick={(e) => {
                        e.preventDefault();
                        console.log('Opening link:', item.media_url);
                        window.open(item.media_url, '_blank', 'noopener,noreferrer');
                    }}
                >
                    <span className="link-title">{item.file_name}</span>
                    <span className="link-url" title={item.original_url || item.media_url}>
                        {item.original_url || item.media_url}
                    </span>
                </a>
            ))}
        </div>
    );
};

    const renderDocumentList = (items = []) => (
        <div className="expanded-items">
            {items.length === 0 && <p className="empty-state">No documents yet.</p>}
            {items.map((item, index) => (
                item.media_type === 'audio' ? (
                    <div key={item.id || index} className="document-item audio-item">
                        <audio controls src={item.media_url || item.file_url} />
                        <span>{item.file_name || 'Audio'}</span>
                    </div>
                ) : (
                    <a
                        key={item.id || index}
                        href={item.file_url || item.media_url}
                        download
                        className="document-item"
                    >
                        {item.file_name || 'Document'}
                    </a>
                )
            ))}
        </div>
    );

    const renderTabbedSection = (source, tabValue, onTabChange) => (
        <div className="expanded-section">
            <div className="tabs-header">
                <button
                    className={`tab-item ${tabValue === 'media' ? 'active' : ''}`}
                    onClick={() => onTabChange('media')}
                >
                    Media
                </button>
                <button
                    className={`tab-item ${tabValue === 'links' ? 'active' : ''}`}
                    onClick={() => onTabChange('links')}
                >
                    Links
                </button>
                <button
                    className={`tab-item ${tabValue === 'documents' ? 'active' : ''}`}
                    onClick={() => onTabChange('documents')}
                >
                    Documents
                </button>
            </div>

            {tabValue === 'media' && renderResourceGrid(source?.photos)}
            {tabValue === 'links' && renderLinkList(source?.links)}
            {tabValue === 'documents' && renderDocumentList(source?.documents)}
        </div>
    );

    const renderExpandedSection = () => {
        if (!activeSection) return null;
        if (activeSection === 'members') return renderMembersSection();
        if (activeSection === 'media') return renderTabbedSection(mediaTabResources, mediaTab, setMediaTab);
        return renderTabbedSection(contentResources, contentTab, setContentTab);
    };

    return (
        <div className={`main-chat rounded-4 shadow-sm ${isMobile && !showMainChat ? 'mobile-hidden' : ''}`}>
            <div className="chat-header">
                {isMobile && (
                    <button className="back-to-chats-btn" onClick={onBackToChats}>
                        ←
                    </button>
                )}
                {activeSection && (
                    <button className="back-to-chat-btn" onClick={onCloseSection}>
                        <ArrowLeft size={20} />
                    </button>
                )}
                <h3>{chatTitle}</h3>
                <div className="chat-header-actions">
                    <button className="join-meeting-btn">Join Meeting</button>
                    <div className="search-icon-header">
                        <MagnifyingGlass size={20} />
                    </div>
                </div>
            </div>
            <div className="chat-messages" ref={messagesContainerRef}>
                {activeSection ? (
                    renderExpandedSection()
                ) : (
                    messages.length === 0 ? (
                        <div className="no-messages-container">
                            <img src="/assets/GroupChat.png" alt="No messages" className="no-messages-image" />
                        </div>
                    ) : (
                        <>
                            {Array.isArray(messages) && messages.length > 0 ? (
                            messages.map((msg, index) => {
                                const msgDate = msg.date || new Date(msg.created_at || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                                const prevDate = index > 0 ? (messages[index - 1].date || new Date(messages[index - 1].created_at || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })) : null;
                                const showSeparator = index === 0 || prevDate !== msgDate;

                                return (
                                    <React.Fragment key={msg.id || index}>
                                        {showSeparator && (
                                            <div className="date-separator-wrapper">
                                                <div className="date-separator">{msgDate}</div>
                                            </div>
                                        )}
                                        <MessageItem
                                            message={msg}
                                            groupId={groupId}
                                            onDeleteMessage={handleDeleteMessage}
                                            onEditMessage={handleEditMessage}
                                            currentUserEmail={currentUserEmail}
                                            onMediaClick={handlePhotoClick}
                                        />
                                    </React.Fragment>
                                );
                            })
                            ) : (
                                <div className="no-messages-container">
                                    <img src="/assets/GroupChat.png" alt="No messages" className="no-messages-image" />
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </>
                    )
                )}
            </div>
            {!activeSection && <ChatInput onSendMessage={onSendMessage} isSending={isSendingMessage} />}
            {modalPhoto && (
    <div className="modal" onClick={closeModal}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
            <span className="close" onClick={closeModal}>&times;</span>
            {modalPhoto.media_type?.startsWith('image') ? (
                <img
                    src={modalPhoto.media_url}
                    alt={modalPhoto.file_name}
                    style={{ maxWidth: '100%', maxHeight: '80vh' }}
                />
            ) : modalPhoto.media_type?.startsWith('video') ? (
                <video
                    controls
                    src={modalPhoto.media_url}
                    style={{ maxWidth: '100%', maxHeight: '80vh' }}
                />
            ) : (
                <a
                    href={modalPhoto.media_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'blue', textDecoration: 'underline' }}
                >
                    Open {modalPhoto.file_name || 'file'}
                </a>
            )}
        </div>
    </div>
)}
        </div>
    );
};

export default MainChat;
