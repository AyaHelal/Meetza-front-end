import React, { useState, useRef, useEffect } from "react";
import { X, PaperPlaneTilt, Robot } from "@phosphor-icons/react";
import api from "../../API/axiosInstance";

export default function Chatbot({ isOpen, onClose }) {
  const [messages, setMessages] = useState([
    { id: 1, text: "Hello! I'm your Meetza assistant. How can I help you today?", isBot: true },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;
    
    const userMessageText = inputValue;
    const newUserMessage = { id: Date.now(), text: userMessageText, isBot: false };
    setMessages((prev) => [...prev, newUserMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await api.post("/chat-bot/message", { message: userMessageText });
      
      const botResponse = { 
        id: Date.now() + 1, 
        text: response.data?.data?.reply || response.data?.message || "I received your message!", 
        isBot: true 
      };
      setMessages((prev) => [...prev, botResponse]);
    } catch (error) {
      console.error("❌ Chatbot Error:", error);
      const errorMessage = { 
        id: Date.now() + 1, 
        text: "Sorry, I'm having trouble connecting to my brain right now. Please try again later.", 
        isBot: true,
        isError: true
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
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
          width: fit-content;
          padding: 12px 16px;
          border-radius: 18px;
          font-size: 0.95rem;
          line-height: 1.5;
          position: relative;
          word-break: break-word;
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
        .message.error-message {
          background: #fee2e2;
          color: #b91c1c;
          border: 1px solid #fecaca;
        }

        .typing-indicator {
          align-self: flex-start;
          background: white;
          padding: 12px 16px;
          border-radius: 18px;
          border-bottom-left-radius: 4px;
          display: flex;
          gap: 4px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }

        .typing-dot {
          width: 6px;
          height: 6px;
          background: #94a3b8;
          border-radius: 50%;
          animation: typingPulse 1.4s infinite ease-in-out;
        }

        .typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .typing-dot:nth-child(3) { animation-delay: 0.4s; }

        @keyframes typingPulse {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(-4px); opacity: 1; }
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
          <div key={msg.id} className={`message ${msg.isBot ? "bot-message" : "user-message"} ${msg.isError ? "error-message" : ""}`}>
            {msg.text}
          </div>
        ))}
        {isLoading && (
          <div className="typing-indicator">
            <div className="typing-dot"></div>
            <div className="typing-dot"></div>
            <div className="typing-dot"></div>
          </div>
        )}
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
        <button className="send-btn" onClick={handleSend} disabled={isLoading || !inputValue.trim()}>
          <PaperPlaneTilt size={20} weight="fill" style={{ opacity: isLoading || !inputValue.trim() ? 0.5 : 1 }} />
        </button>
      </div>
    </div>
  );
}
