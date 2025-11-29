import React, { useState, useRef, useEffect } from 'react';
import { Plus, Microphone, PaperPlaneTilt, Smiley, Image, File as FileIcon, MapPin, Camera, MusicNote } from '@phosphor-icons/react';
import EmojiPicker from 'emoji-picker-react';
import './ChatInput.css';

const ChatInput = ({ onSendMessage }) => {
    const [message, setMessage] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);

    const emojiPickerRef = useRef(null);
    const attachmentMenuRef = useRef(null);

    // Close emoji picker when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
                setShowEmojiPicker(false);
            }
            if (attachmentMenuRef.current && !attachmentMenuRef.current.contains(event.target)) {
                if (!event.target.closest('.attachment-button')) {
                    setShowAttachmentMenu(false);
                }
            }
        };

        if (showEmojiPicker) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showEmojiPicker]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (message.trim()) {
            onSendMessage(message);
            setMessage('');
            setShowEmojiPicker(false);
        }
    };

    const handleEmojiClick = (emojiData) => {
        setMessage(prev => prev + emojiData.emoji);
        setShowEmojiPicker(false);
    };

    const toggleEmojiPicker = () => {
        setShowEmojiPicker(!showEmojiPicker);
        setShowAttachmentMenu(false);
    };

    const toggleAttachmentMenu = () => {
        setShowAttachmentMenu(!showAttachmentMenu);
        setShowEmojiPicker(false);
    };

    const handleAttachmentSelect = (type) => {
        console.log(`Selected attachment type: ${type}`);
        // Here you would typically open a file picker or other appropriate UI
        setShowAttachmentMenu(false);
    };

    return (
        <div className="chat-input shadow-sm">
            <form className="input-wrapper" onSubmit={handleSubmit}>
                <div className="input-icon input-icon-left attachment-button" onClick={toggleAttachmentMenu}>
                    <Plus size={20} />
                    {showAttachmentMenu && (
                        <div className="attachment-menu" ref={attachmentMenuRef}>
                            <button type="button" onClick={() => handleAttachmentSelect('image')}>
                                <Image size={20} />
                                <span>Photo</span>
                            </button>
                            <button type="button" onClick={() => handleAttachmentSelect('video')}>
                                <Camera size={20} />
                                <span>Video</span>
                            </button>
                            <button type="button" onClick={() => handleAttachmentSelect('document')}>
                                <FileIcon size={20} />
                                <span>Document</span>
                            </button>
                            <button type="button" onClick={() => handleAttachmentSelect('location')}>
                                <MapPin size={20} />
                                <span>Location</span>
                            </button>
                            <button type="button" onClick={() => handleAttachmentSelect('audio')}>
                                <MusicNote size={20} />
                                <span>Audio</span>
                            </button>
                        </div>
                    )}
                </div>

                <input
                    type="text"
                    placeholder="Type a message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                />
                <div className="input-icon input-icon-right">
                    <Microphone size={20} />
                </div>
                <div className="input-icon input-icon-right emoji-icon" onClick={toggleEmojiPicker}>
                    <Smiley size={20} />
                </div>

                {showEmojiPicker && (
                    <div className="emoji-picker-wrapper" ref={emojiPickerRef}>
                        <EmojiPicker onEmojiClick={handleEmojiClick} />
                    </div>
                )}

                <button type="submit" className="input-icon send input-icon-right">
                    <PaperPlaneTilt size={18} weight="fill" />
                </button>
            </form>
        </div>
    );
};

export default ChatInput;