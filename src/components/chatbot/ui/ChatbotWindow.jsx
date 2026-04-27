import React from "react";
import { X, PaperPlaneTilt, Robot } from "@phosphor-icons/react";
import { useChatbot } from "../hooks/useChatbot";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import "./chatbot.css";

const ChatbotWindow = ({ isOpen, onClose }) => {
  const {
    messages,
    inputValue,
    setInputValue,
    isLoading,
    handleSend,
    messagesEndRef,
  } = useChatbot();

  if (!isOpen) return null;

  return (
    <div className="chatbot-window">
      <div className="chatbot-header">
        <div className="header-info">
          <Robot size={28} weight="fill" />
          <div>
            <h3>Meetza Assistant</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div className="status-dot"></div>
              <span style={{ fontSize: '0.75rem', opacity: 0.9 }}>Online</span>
            </div>
          </div>
        </div>
        <button className="close-btn" onClick={onClose}>
          <X size={18} weight="bold" />
        </button>
      </div>

      <div className="chatbot-messages">
        {messages.map((msg) => (
          <MessageBubble 
            key={msg.id} 
            text={msg.text} 
            isBot={msg.isBot} 
            isError={msg.isError} 
          />
        ))}
        {isLoading && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      <div className="chatbot-input">
        <input 
          type="text" 
          placeholder="Type a message..." 
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          disabled={isLoading}
        />
        <button 
          className="send-btn" 
          onClick={handleSend} 
          disabled={isLoading || !inputValue.trim()}
        >
          <PaperPlaneTilt 
            size={20} 
            weight="fill" 
            style={{ opacity: isLoading || !inputValue.trim() ? 0.5 : 1 }} 
          />
        </button>
      </div>
    </div>
  );
};

export default ChatbotWindow;
