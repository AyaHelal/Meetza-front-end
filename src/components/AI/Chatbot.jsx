import React, { useState } from "react";
import { X, PaperPlaneTilt, Robot } from "@phosphor-icons/react";

export default function Chatbot({ isOpen, onClose }) {
  const [messages, setMessages] = useState([
    { id: 1, text: "Hello! I'm your Meetza assistant. How can I help you today?", isBot: true },
  ]);
  const [inputValue, setInputValue] = useState("");

  const handleSend = () => {
    if (!inputValue.trim()) return;
    
    const newUserMessage = { id: Date.now(), text: inputValue, isBot: false };
    setMessages([...messages, newUserMessage]);
    setInputValue("");

    // Simulate bot response
    setTimeout(() => {
      const botResponse = { 
        id: Date.now() + 1, 
        text: "I'm still learning! My AI brain will be fully functional soon. Stay tuned! 🚀", 
        isBot: true 
      };
      setMessages((prev) => [...prev, botResponse]);
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <div className="chatbot-window">
      <style>{`
        .chatbot-window {
          position: fixed;
          bottom: 180px;
          right: 30px;
          width: 380px;
          height: 550px;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(0, 118, 234, 0.2);
          border-radius: 24px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1), 0 0 20px rgba(0, 118, 234, 0.05);
          display: flex;
          flex-direction: column;
          z-index: 1001;
          overflow: hidden;
          animation: slideUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.1);
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(40px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .chatbot-header {
          padding: 20px;
          background: linear-gradient(135deg, #0076EA, #005bb7);
          color: white;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .header-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .header-info h3 {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 600;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          background: #3395ff;
          border-radius: 50%;
          box-shadow: 0 0 8px #3395ff;
        }

        .close-btn {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .close-btn:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: rotate(90deg);
        }

        .chatbot-messages {
          flex: 1;
          padding: 20px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 16px;
          background: #f8fafc;
        }

        .message {
          max-width: 80%;
          padding: 12px 16px;
          border-radius: 18px;
          font-size: 0.95rem;
          line-height: 1.5;
          position: relative;
        }

        .bot-message {
          align-self: flex-start;
          background: white;
          color: #334155;
          border-bottom-left-radius: 4px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }

        .user-message {
          align-self: flex-end;
          background: #0076EA;
          color: white;
          border-bottom-right-radius: 4px;
        }

        .chatbot-input {
          padding: 20px;
          background: white;
          border-top: 1px solid #e2e8f0;
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .chatbot-input input {
          flex: 1;
          border: 1px solid #e2e8f0;
          padding: 12px 16px;
          border-radius: 12px;
          outline: none;
          transition: border-color 0.2s;
        }

        .chatbot-input input:focus {
          border-color: #0076EA;
        }

        .send-btn {
          background: #0076EA;
          color: white;
          border: none;
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .send-btn:hover {
          background: #005bb7;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 118, 234, 0.2);
        }
      `}</style>

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
          <div key={msg.id} className={`message ${msg.isBot ? "bot-message" : "user-message"}`}>
            {msg.text}
          </div>
        ))}
      </div>

      <div className="chatbot-input">
        <input 
          type="text" 
          placeholder="Type a message..." 
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
        />
        <button className="send-btn" onClick={handleSend}>
          <PaperPlaneTilt size={20} weight="fill" />
        </button>
      </div>
    </div>
  );
}
