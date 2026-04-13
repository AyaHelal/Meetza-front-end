import React, { useEffect, useRef, useContext, useState, useCallback } from "react";
import { PaperPlaneRight } from "@phosphor-icons/react";
import { useSocket } from "../../../context/SocketContext";
import { AuthContext } from "../../../context/AuthContext";
import { useMeetingContext } from "../../../context/MeetingContext";
import * as meetingSocketService from "../services/meetingSocketService";
import "./MeetingChat.css";

const MeetingChat = () => {
    const messagesEndRef = useRef(null);
    const [draft, setDraft] = useState("");
    const { socket, isConnected } = useSocket();
    const { user } = useContext(AuthContext);
    const { meetingId, chatMessages, addChatMessage } = useMeetingContext();

    // Scroll to bottom when new messages arrive
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [chatMessages]);

    const handleSend = useCallback(() => {
        if (!socket || !isConnected || !meetingId) return;
        const trimmed = (draft || "").trim();
        if (!trimmed) return;
        const senderId = user?.id ?? user?.member_id ?? null;
        const optimisticMessage = {
            id: `opt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            text: trimmed,
            senderName: "You",
            senderId,
            senderPhoto: null,
            timestamp: Date.now(),
            isOwn: true,
        };
        addChatMessage(optimisticMessage);
        setDraft("");
        meetingSocketService.sendMeetingChatMessage(
            socket,
            { meetingId: String(meetingId), text: trimmed },
            (ack) => {
                if (ack && !ack.ok) {
                    setDraft(trimmed);
                }
            }
        );
    }, [socket, isConnected, meetingId, draft, addChatMessage, user?.id, user?.member_id]);

    // Messages are loaded from localStorage in MeetingContext when meetingId is set
    // No need to fetch from API since backend doesn't store messages

    // Socket listener for incoming chat messages
    useEffect(() => {
        if (!socket || !isConnected) {
            return;
        }

        const onMeetingChatMessage = (data) => {
            // Validate message data - only require text
            if (!data) {
                return;
            }

            // Handle different data structures - check for text in various fields
            const messageText = data.text || data.message || data.content || data.body;
            if (!messageText || !String(messageText).trim()) {
                return;
            }

            // Check meetingId if provided, but be very flexible - accept if no meetingId in data
            if (data.meetingId && meetingId) {
                const dataMeetingId = String(data.meetingId).trim();
                const currentMeetingId = String(meetingId).trim();
                if (dataMeetingId !== currentMeetingId) {
                    return;
                }
            }
            // If no meetingId in data, accept it anyway (backend might not include it in broadcast)

            // Use only backend-provided identity; never use participants, storage, or state for name
            const senderId = data.userId ?? data.senderId ?? null;
            const senderName = (data.userName != null && data.userName !== "") ? String(data.userName).trim() : "Unknown";
            const senderPhoto = (data.userPhoto != null && typeof data.userPhoto === "string" && data.userPhoto.trim()) ? data.userPhoto.trim() : null;
            const isOwnMessage = senderId && user?.id && (
                String(senderId) === String(user.id) ||
                String(senderId) === String(user.member_id)
            );

            // Parse timestamp - backend sends ISO string, convert to number
            let timestamp = Date.now();
            if (data.timestamp) {
                if (typeof data.timestamp === 'string') {
                    timestamp = new Date(data.timestamp).getTime();
                } else if (typeof data.timestamp === 'number') {
                    timestamp = data.timestamp;
                }
            }

            const newMessage = {
                id: data.id || data.messageId || `msg-${timestamp}-${Math.random().toString(36).substr(2, 9)}`,
                text: String(messageText).trim(),
                senderName: senderName,
                senderId: senderId,
                senderPhoto: senderPhoto,
                timestamp: timestamp,
                isOwn: isOwnMessage,
            };

            addChatMessage(newMessage);
        };

        // Listen for the event
        socket.on("meetingChatMessage", onMeetingChatMessage);
        // Also listen for alternative event names in case backend uses different naming
        socket.on("chatMessage", onMeetingChatMessage);
        socket.on("message", onMeetingChatMessage);
        socket.on("meetingMessage", onMeetingChatMessage);

        return () => {
            socket.off("meetingChatMessage", onMeetingChatMessage);
            socket.off("chatMessage", onMeetingChatMessage);
            socket.off("message", onMeetingChatMessage);
            socket.off("meetingMessage", onMeetingChatMessage);
        };
    }, [socket, isConnected, meetingId, user?.id, user?.member_id, addChatMessage]);


    return (
        <div className="meeting-chat">
            <h4 className="meeting-chat-title">Comments during meeting</h4>

            <div className="meeting-chat-messages">
                {chatMessages.length === 0 ? (
                    <div className="meeting-chat-empty">
                        <p>No comments yet.</p>
                    </div>
                ) : (
                    chatMessages.map((message) => (
                        <div
                            key={message.id}
                            className="meeting-chat-message"
                        >
                            <div className="meeting-chat-message-avatar">
                                {(() => {
                                    const s = message.senderPhoto && typeof message.senderPhoto === "string" ? message.senderPhoto.trim() : "";
                                    return s ? (
                                    <img 
                                        src={s} 
                                        alt={message.senderName}
                                        className="meeting-chat-message-avatar-img"
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                            const fallback = e.target.nextElementSibling;
                                            if (fallback) fallback.style.display = 'flex';
                                        }}
                                    />
                                    ) : null;
                                })()}
                                <span 
                                    className="meeting-chat-message-avatar-initial"
                                    style={{ display: (message.senderPhoto && typeof message.senderPhoto === "string" && message.senderPhoto.trim()) ? 'none' : 'flex' }}
                                >
                                    {message.senderName?.charAt(0)?.toUpperCase() || "?"}
                                </span>
                            </div>
                            <div className="meeting-chat-message-content">
                                <div className="meeting-chat-message-sender">
                                    {message.senderName}
                                </div>
                                <div className="meeting-chat-message-text">{message.text}</div>
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="meeting-chat-input-row">
                <input
                    id="meeting-chat-input-field"
                    type="text"
                    className="meeting-chat-field"
                    placeholder="Type a message..."
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                        }
                    }}
                    autoComplete="off"
                />
                <button
                    type="button"
                    className="meeting-chat-send"
                    aria-label="Send message"
                    onClick={handleSend}
                    disabled={!draft.trim() || !socket || !isConnected || !meetingId}
                >
                    <PaperPlaneRight size={22} weight="fill" />
                </button>
            </div>
        </div>
    );
};

export default MeetingChat;

