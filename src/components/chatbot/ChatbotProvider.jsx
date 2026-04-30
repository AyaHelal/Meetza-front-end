import React, { createContext, useContext, useState } from "react";
import { playChatbotOpenVoice } from "../../utils/uiSounds";

const ChatbotContext = createContext();

export const useChatbotContext = () => {
  const context = useContext(ChatbotContext);
  if (!context) {
    throw new Error("useChatbotContext must be used within a ChatbotProvider");
  }
  return context;
};

export const ChatbotProvider = ({ children }) => {
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);

  const toggleChatbot = () =>
    setIsChatbotOpen((prev) => {
      const next = !prev;
      if (next) playChatbotOpenVoice();
      return next;
    });

  const closeChatbot = () => setIsChatbotOpen(false);

  const openChatbot = () =>
    setIsChatbotOpen((prev) => {
      if (!prev) playChatbotOpenVoice();
      return true;
    });

  return (
    <ChatbotContext.Provider value={{ isChatbotOpen, toggleChatbot, closeChatbot, openChatbot }}>
      {children}
    </ChatbotContext.Provider>
  );
};
