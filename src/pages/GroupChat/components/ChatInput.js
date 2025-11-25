import React from 'react';
import { Plus, Microphone, PaperPlaneTilt } from '@phosphor-icons/react';
import './ChatInput.css';

const ChatInput = ({ onSendMessage }) => {
    const [message, setMessage] = React.useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (message.trim()) {
            onSendMessage(message);
            setMessage('');
        }
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
                <button type="submit" className="input-icon send input-icon-right">
                    <PaperPlaneTilt size={18} weight="fill" />
                </button>
            </form>
        </div>
    );
};

export default ChatInput;

