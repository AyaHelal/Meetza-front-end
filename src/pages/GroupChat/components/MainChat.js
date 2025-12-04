import React, { useEffect, useRef, useState, useMemo } from 'react';
import MessageItem from './MessageItem';
import ChatInput from './ChatInput';
import { MagnifyingGlass, ArrowLeft } from '@phosphor-icons/react';
import { deleteMessage, updateMessage, getMessages } from '../../../API/auth';
import { categorizeResources } from './utils';
import './MainChat.css';
import { smartToast } from "../../../API/toastManager";
import '../GroupChat.css';
import { UserCheck, File } from "lucide-react";

const MainChat = ({
    messages: initialMessages,
    chatTitle,
    isMobile,
    showMainChat,
    onBackToChats,
    onSendMessage,
    activeSection,
    expandedSection,
    onCloseSection,
    setExpandedSection,
    contentResources,
    groupMediaItems,
    groupMembers,
    groupInfo,
    currentUserEmail,
    groupId,
    onMessageEdited,
    isSendingMessage = false,
    onGroupNameClick
}) => {
    const messagesContainerRef = useRef(null);
    const messagesEndRef = useRef(null);
    const [modalPhoto, setModalPhoto] = useState(null);
    const [isUserAtBottom, setIsUserAtBottom] = useState(true);
    const prevMessagesLengthRef = useRef(0);
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

    const [messages, setMessages] = useState(() => {
        if (!Array.isArray(initialMessages)) {
            console.warn('initialMessages is not an array:', initialMessages);
            return [];
        }
        console.log('Initial messages count:', initialMessages.length);
        return formatMessages(initialMessages);
    });

    // Check if user is at the bottom of the chat
    const checkIfAtBottom = () => {
        if (!messagesContainerRef.current) return false;
        const container = messagesContainerRef.current;
        const threshold = 100;
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

    useEffect(() => {
        if (showMainChat || !isMobile) {
            setTimeout(() => {
                scrollToBottom(true);
                setIsUserAtBottom(true);
            }, 100);
        }
    }, [showMainChat, isMobile]);

    useEffect(() => {
        if (!initialMessages || !Array.isArray(initialMessages)) return;

        const formattedNew = formatMessages(initialMessages);
        setMessages(formattedNew);
    }, [initialMessages]);

    useEffect(() => {
        setContentTab('media');
        setMediaTab('media');
    }, [activeSection]);

    const members = Array.isArray(groupMembers) ? groupMembers : [];

    // Extract links from messages
    const messageLinks = useMemo(() => {
        const links = [];

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
    }, [messages]);

    const mediaTabResources = useMemo(() => ({
        photos: [
            ...(groupMediaItems?.images || []),
            ...(groupMediaItems?.videos || [])
        ],
        links: messageLinks,
        documents: [
            ...(groupMediaItems?.files || []),
            ...(groupMediaItems?.audio || [])
        ]
    }), [groupMediaItems, messageLinks]);

    // Legacy support for groupInfo-based resources (from first file)
    const { photos, links, documents } = groupInfo?.content?.resources ?
        categorizeResources(groupInfo.content.resources) :
        { photos: [], links: [], documents: [] };

    const handlePhotoClick = (item) => {
        console.log('Clicked item:', item);

        if (item.isLink) {
            window.open(item.media_url, '_blank');
            return;
        }

        const url = item.media_url || item.file_url;
        const isImage = /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(url) ||
            item.media_type?.startsWith('image') ||
            item.file_type?.startsWith('image/');

        const isVideo = /\.(mp4|webm|ogg|mov)$/i.test(url) ||
            item.media_type?.startsWith('video') ||
            item.file_type?.startsWith('video/');

        const mediaItem = {
            media_url: url,
            file_url: url,
            file_name: item.file_name || 'Media',
            media_type: isImage ? 'image' : isVideo ? 'video' : 'file'
        };

        setModalPhoto(mediaItem);
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
            // Step 1: Call the edit API
            await updateMessage(groupId, messageId, trimmedText);

            // Step 2: Fetch all messages from the server using GET /chat/groups/{groupId}/messages
            const response = await getMessages(groupId);

            // Step 3: Format the messages (including media and links)
            let fetchedMessages = [];
            if (response && response.messages && Array.isArray(response.messages)) {
                fetchedMessages = response.messages;
            } else if (Array.isArray(response)) {
                fetchedMessages = response;
            }

            // Format messages with media and links
            const formattedMessages = formatMessages(fetchedMessages);

            // Step 4: Update messages state with fresh data from server
            setMessages(formattedMessages);

            smartToast.success('Message updated successfully');

            // Call the callback if provided
            if (onMessageEdited) onMessageEdited(messageId, trimmedText);
        } catch (error) {
            smartToast.error('Failed to edit message');
            console.error('Error editing message:', error);
        }
    };

    const getDownloadFileName = (item) => {
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

            if (typeMap[fileType]) {
                return typeMap[fileType];
            }

            const parts = fileType.split('/');
            if (parts.length === 2) {
                const subtype = parts[1].split(';')[0].trim();
                if (subtype && subtype.length <= 5 && !subtype.includes('.')) {
                    return subtype;
                }
            }

            return null;
        };

        const getExtensionFromUrl = (url) => {
            if (!url) return null;
            try {
                const cleanUrl = url.split('?')[0].split('#')[0];
                const match = cleanUrl.match(/\.([a-zA-Z0-9]{1,5})$/);
                return match ? match[1].toLowerCase() : null;
            } catch (e) {
                return null;
            }
        };

        const getExtensionFromFileName = (fileName) => {
            if (!fileName) return null;
            const match = fileName.match(/\.([a-zA-Z0-9]{1,5})$/);
            return match ? match[1].toLowerCase() : null;
        };

        let extension = getExtensionFromFileType(item.file_type);

        if (!extension) {
            extension = getExtensionFromUrl(item.file_url);
        }

        if (!extension) {
            extension = getExtensionFromFileName(item.file_name);
        }

        if (item.file_name) {
            const existingExt = getExtensionFromFileName(item.file_name);
            if (existingExt) {
                return item.file_name;
            }
            return extension ? `${item.file_name}.${extension}` : item.file_name;
        } else {
            if (item.file_url) {
                try {
                    const urlPath = item.file_url.split('?')[0].split('#')[0];
                    const urlParts = urlPath.split('/');
                    const lastPart = urlParts[urlParts.length - 1];

                    if (lastPart && lastPart.includes('.')) {
                        return lastPart;
                    } else if (lastPart) {
                        return extension ? `${lastPart}.${extension}` : lastPart;
                    }
                } catch (e) {
                    // Fall through to default
                }
            }
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
                            console.log('Opening link:', item.media_url || item.file_url);
                            window.open(item.media_url || item.file_url, '_blank', 'noopener,noreferrer');
                        }}
                    >
                        <span className="link-title">{item.file_name}</span>
                        <span className="link-url" title={item.original_url || item.media_url || item.file_url}>
                            {item.original_url || item.media_url || item.file_url}
                        </span>
                    </a>
                ))}
            </div>
        );
    };

    const renderDocumentList = (items = []) => {
        const getFileExtension = (fileName) => {
            if (!fileName) return 'FILE';
            const parts = fileName.split('.');
            if (parts.length > 1) {
                const ext = parts[parts.length - 1].toUpperCase();
                return ext.length <= 4 ? ext : 'FILE';
            }
            return 'FILE';
        };

        return (
            <div className="expanded-items documents-grid">
                {items.length === 0 && <p className="empty-state">No documents yet.</p>}
                {items.map((item, index) => (
                    item.media_type === 'audio' ? (
                        <div key={item.id || index} className="document-item audio-item">
                            <audio controls src={item.media_url || item.file_url} />
                            <span>{item.file_name || 'Audio'}</span>
                        </div>
                    ) : (
                        (() => {
                            const fileName = getDownloadFileName(item);
                            const fileUrl = item.file_url || item.media_url;

                            const handleDownload = async (e) => {
                                e.preventDefault();
                                try {
                                    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
                                    const response = await fetch(fileUrl, {
                                        method: 'GET',
                                        headers: token ? {
                                            'Authorization': `Bearer ${token}`
                                        } : {}
                                    });

                                    if (!response.ok) {
                                        throw new Error('Failed to download file');
                                    }

                                    const blob = await response.blob();
                                    const url = window.URL.createObjectURL(blob);
                                    const link = document.createElement('a');
                                    link.href = url;
                                    link.download = fileName;
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                    window.URL.revokeObjectURL(url);
                                } catch (error) {
                                    console.error('Error downloading file:', error);
                                    // Fallback to opening in new tab
                                    window.open(fileUrl, '_blank');
                                }
                            };

                            return (
                                <a
                                    key={item.id || index}
                                    href={fileUrl}
                                    onClick={handleDownload}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="document-item document-square"
                                    title={fileName}
                                >
                                    <div className="document-icon">
                                        <span className="document-extension">{getFileExtension(fileName)}</span>
                                    </div>
                                    <div className="document-name">{fileName}</div>
                                </a>
                            );
                        })()
                    )
                ))}
            </div>
        );
    };

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

    // Legacy support for old expandedSection prop
    const renderLegacyExpandedSection = () => {
        if (!expandedSection) return null;

        let items = [];
        let title = '';

        switch (expandedSection) {
            case 'photos':
                items = photos;
                title = 'Photos';
                break;
            case 'links':
                items = links;
                title = 'Links';
                break;
            case 'documents':
                items = documents;
                title = 'Documents';
                break;
            default:
                return null;
        }

        return (
            <div className="expanded-section">
                <h4>{title}</h4>
                <div className={`expanded-items ${expandedSection === 'links' ? 'expanded-links' : ''}`}>
                    {items.length === 0 ? (
                        <p>No {title.toLowerCase()} available.</p>
                    ) : (
                        items.map((item, index) => (
                            <div key={index} className="expanded-item">
                                {expandedSection === 'photos' && (
                                    <img
                                        src={item.file_url}
                                        alt={item.file_name || 'Photo'}
                                        className="expanded-photo"
                                        onClick={() => handlePhotoClick(item)}
                                    />
                                )}
                                {expandedSection === 'links' && (
                                    <a href={item.file_url} target="_blank" rel="noopener noreferrer" className="link-item">
                                        {item.file_url}
                                    </a>
                                )}
                                {expandedSection === 'documents' && (
                                    <a
                                        href={item.file_url}
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
    };

    const renderExpandedSection = () => {
        // New tabbed section support
        if (activeSection) {
            if (activeSection === 'members') return renderMembersSection();
            if (activeSection === 'media') return renderTabbedSection(mediaTabResources, mediaTab, setMediaTab);
            return renderTabbedSection(contentResources, contentTab, setContentTab);
        }

        // Legacy support for old expandedSection
        return renderLegacyExpandedSection();
    };

    return (
        <div className={`main-chat rounded-4 shadow-sm ${isMobile && !showMainChat ? 'mobile-hidden' : ''}`}>
            <div className="chat-header">
                {/* Show section back button if viewing a section, otherwise show mobile back button */}
                {(activeSection || expandedSection) ? (
                    <button
                        className="back-to-chat-btn"
                        onClick={onCloseSection || (() => setExpandedSection && setExpandedSection(null))}
                    >
                        <ArrowLeft size={20} color="white" />
                    </button>
                ) : isMobile && (
                    <button className="back-to-chats-btn" onClick={onBackToChats}>
                        <ArrowLeft size={20} color="white" />
                    </button>
                )}
                <h3
                    onClick={onGroupNameClick}
                    style={onGroupNameClick ? { cursor: 'pointer' } : {}}
                >
                    {chatTitle}
                </h3>
                <div className="chat-header-actions">
                    <button className="join-meeting-btn">Join Meeting</button>
                    <div className="search-icon-header">
                        <MagnifyingGlass size={20} />
                    </div>
                </div>
            </div>
            <div className="chat-messages" ref={messagesContainerRef}>
                {(() => {
                    console.log('Render check:', {
                        activeSection,
                        expandedSection,
                        groupId,
                        messagesLength: messages.length,
                        messagesArray: Array.isArray(messages)
                    });
                    return null;
                })()}
                {(activeSection || expandedSection) ? (
                    renderExpandedSection()
                ) : !groupId ? (
                    <>
                        <div className="no-messages-container">
                            <img src="/assets/GroupChat.png"
                                alt="No chat selected" className="no-messages-image" />
                            <p className="no-messages-text fw-semibold mt-3">No chats selected yet!</p>
                        </div>
                        <p style={{ color: '#888888', textAlign: 'center', marginTop: 'auto', padding: '1rem' }}>
                            Select chat to start a conversation
                        </p>
                    </>
                ) : (
                    messages.length === 0 ? (
                        <div className="no-messages-container">
                            <img src="/assets/GroupChat.png"
                                alt="No messages" className="no-messages-image" />
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
                                            {/* Debug: {JSON.stringify({ id: msg.id, hasText: !!msg.text, hasMessage: !!msg.message })} */}
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
            {!activeSection && !expandedSection && groupId && (
                <ChatInput onSendMessage={onSendMessage} isSending={isSendingMessage} />
            )}
            {modalPhoto && (
                <div className="photo-modal" onClick={closeModal}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <button className="photo-modal-close" onClick={closeModal}>×</button>
                        {modalPhoto.media_type?.startsWith('image') ? (
                            <img
                                src={modalPhoto.file_url || modalPhoto.media_url}
                                alt={modalPhoto.file_name || 'Photo'}
                                style={{ maxWidth: '100%', maxHeight: '80vh' }}
                            />
                        ) : modalPhoto.media_type?.startsWith('video') ? (
                            <video
                                controls
                                src={modalPhoto.media_url || modalPhoto.file_url}
                                style={{ maxWidth: '100%', maxHeight: '80vh' }}
                            />
                        ) : (
                            <a
                                href={modalPhoto.media_url || modalPhoto.file_url}
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
