import React, { createContext, useContext, useState } from "react";

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

  const toggleChatbot = () => setIsChatbotOpen((prev) => !prev);
  const closeChatbot = () => setIsChatbotOpen(false);
  const openChatbot = () => setIsChatbotOpen(true);

  return (
    <ChatbotContext.Provider value={{ isChatbotOpen, toggleChatbot, closeChatbot, openChatbot }}>
      {children}
    </ChatbotContext.Provider>
  );
};
