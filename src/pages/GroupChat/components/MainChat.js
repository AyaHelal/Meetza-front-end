import React, { useEffect, useRef, useState } from 'react';
import { MagnifyingGlass } from '@phosphor-icons/react';
import MessageItem from './MessageItem';
import ChatInput from './ChatInput';
import { ArrowLeft } from '@phosphor-icons/react';
import { categorizeResources } from './utils';
import { deleteMessage, updateMessage } from '../../../API/auth';
import './MainChat.css';
import { smartToast } from "../../../API/toastManager";

const MainChat = ({
    messages: initialMessages,
    chatTitle,
    isMobile,
    showMainChat,
    onBackToChats,
    onSendMessage,
    expandedSection,
    groupInfo,
    setExpandedSection,
    currentUserEmail
}) => {
    const messagesContainerRef = useRef(null);
    const [modalPhoto, setModalPhoto] = useState(null);
    const [isUserAtBottom, setIsUserAtBottom] = useState(true);
    const prevMessagesLengthRef = useRef(0);
    const [messages, setMessages] = useState(initialMessages || []);

    // Check if user is at the bottom of the chat
    const checkIfAtBottom = () => {
        if (!messagesContainerRef.current) return false;
        const container = messagesContainerRef.current;
        const threshold = 100; // 100px threshold
        const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
        return isAtBottom;
    };

    // Auto-scroll to bottom when new messages arrive (only if user is at bottom)
    const scrollToBottom = (force = false) => {
        if (force || isUserAtBottom) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    };

    // Handle scroll event to detect if user scrolled up
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

    // Auto-scroll when new messages arrive (only if user was at bottom)
    useEffect(() => {
        const currentMessagesLength = messages.length;
        const prevMessagesLength = prevMessagesLengthRef.current;

        // Only auto-scroll if:
        // 1. New messages were added (length increased)
        // 2. User is at the bottom
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
    useEffect(() => {
        setMessages(initialMessages || []);
    }, [initialMessages]);

    const { photos, links, documents } = categorizeResources(groupInfo?.content?.resources);

    const handlePhotoClick = (photo) => {
        setModalPhoto(photo);
    };

    const closeModal = () => {
        setModalPhoto(null);
    };

    const handleDeleteMessage = async (messageId) => {
        try {
            await deleteMessage(messageId);
            setMessages(prevMessages => prevMessages.filter(msg => msg.id !== messageId));
        } catch (error) {
            smartToast.error('Failed to delete message:', error);
        }
    };

    const handleEditMessage = async (messageId, newText) => {
        try {
            await updateMessage(messageId, newText);
            setMessages(prevMessages => prevMessages.map(msg =>
                msg.id === messageId ? { ...msg, text: newText } : msg
            ));
        } catch (error) {
            smartToast.error('Failed to edit message:', error);
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

    const renderExpandedSection = () => {
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
                                    <img src={item.file_url} alt={item.file_name || 'Photo'} className="expanded-photo" onClick={() => handlePhotoClick(item)} />
                                )}
                                {expandedSection === 'links' && (
                                    <a href={item.file_url} target="_blank" rel="noopener noreferrer" className="link-item">
                                        {item.file_url}
                                    </a>
                                )}
                                {expandedSection === 'documents' && (
                                    <a href={item.file_url} download={getDownloadFileName(item)} target="_blank" rel="noopener noreferrer">
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

    return (
        <div className={`main-chat rounded-4 shadow-sm ${isMobile && !showMainChat ? 'mobile-hidden' : ''}`}>
            <div className="chat-header">
                {isMobile && (
                    <button className="back-to-chats-btn" onClick={onBackToChats}>
                        <ArrowLeft size={24} />

                    </button>
                )}
                {expandedSection && (
                    <button className="back-to-chat-btn" onClick={() => setExpandedSection(null)}>
                        <ArrowLeft size={24} />

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
                {expandedSection ? (
                    renderExpandedSection()
                ) : (
                    messages.length === 0 ? (
                        <div className="no-messages-container">
                            <img src="/assets/GroupChat.png" alt="No messages" className="no-messages-image" />
                        </div>
                    ) : (
                        <>
                            {messages.map((msg, index) => {
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
                                            onDeleteMessage={handleDeleteMessage}
                                            onEditMessage={handleEditMessage}
                                             currentUserEmail={currentUserEmail}
                                        />
                                    </React.Fragment>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </>
                    )
                )}
            </div>
            {!expandedSection && <ChatInput onSendMessage={onSendMessage} />}
            {modalPhoto && (
                <div className="photo-modal" onClick={closeModal}>
                    <img src={modalPhoto.file_url} alt={modalPhoto.file_name || 'Photo'} />
                    <button className="photo-modal-close" onClick={closeModal}>×</button>
                </div>
            )}
        </div>
    );
};

export default MainChat;
