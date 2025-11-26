import React, { useState, useRef, useEffect } from 'react';
import { Plus, Microphone, PaperPlaneTilt, Smiley } from '@phosphor-icons/react';
import EmojiPicker from 'emoji-picker-react';
import './ChatInput.css';

const ChatInput = ({ onSendMessage }) => {
    const [message, setMessage] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const emojiPickerRef = useRef(null);

    // Close emoji picker when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
                setShowEmojiPicker(false);
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
    };

    return (
        <div className="chat-input shadow-sm">
            <form className="input-wrapper" onSubmit={handleSubmit}>
                <div className="input-icon input-icon-left">
                    <Plus size={20} />
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
