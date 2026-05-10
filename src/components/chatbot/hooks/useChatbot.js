import { useState, useRef, useEffect, useCallback } from "react";
import { sendMessageToBot } from "../services/chatbotService";

export const useChatbot = () => {
  const [messages, setMessages] = useState([
    { id: 1, text: "Hello! I'm your Meetza assistant. How can I help you today?", isBot: true },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;
    
    const userMessageText = inputValue;
    const newUserMessage = { id: Date.now(), text: userMessageText, isBot: false };
    setMessages((prev) => [...prev, newUserMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const reply = await sendMessageToBot(userMessageText);
      
      const botResponse = { 
        id: Date.now() + 1, 
        text: reply, 
        isBot: true 
      };
      setMessages((prev) => [...prev, botResponse]);
    } catch (error) {
      const errorMessage = { 
        id: Date.now() + 1, 
        text: "Sorry, I'm having trouble connecting to my brain right now. Please try again later.", 
        isBot: true
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    messages,
    inputValue,
    setInputValue,
    isLoading,
    handleSend,
    messagesEndRef,
  };
};
