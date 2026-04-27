import RobotOrb from "./ui/RobotOrb";
import ChatbotWindow from "./ui/ChatbotWindow";
import { ChatbotProvider, useChatbotContext } from "./ChatbotProvider";

const ChatbotContainer = () => {
  const { isChatbotOpen, toggleChatbot, closeChatbot } = useChatbotContext();
  
  return (
    <>
      <RobotOrb onClick={toggleChatbot} />
      <ChatbotWindow isOpen={isChatbotOpen} onClose={closeChatbot} />
    </>
  );
};

export { ChatbotProvider, ChatbotContainer, RobotOrb, ChatbotWindow };
