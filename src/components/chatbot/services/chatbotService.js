import api from "../../../API/axiosInstance";

export const sendMessageToBot = async (message) => {
  try {
    const response = await api.post("/chat-bot/message", { message });
    return response.data?.data?.reply || response.data?.message || "I received your message!";
  } catch (error) {
    console.error("❌ Chatbot Service Error:", error);
    throw error;
  }
};
