import { useState, useRef, useEffect, useCallback } from 'react';
import { useVoiceRecording } from './useVoiceRecording';
import { useFileAttachment } from './useFileAttachment';
import { useAttachmentMenu } from './useAttachmentMenu';

export const useChatInput = ({ onSendMessage, isSending, chatId }) => {
    const [message, setMessage] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const emojiPickerRef = useRef(null);

    const fileAttachment = useFileAttachment();
    const voiceRecording = useVoiceRecording(fileAttachment.handleFileSelection);
    const attachmentMenu = useAttachmentMenu();

    const { handleFileCleanup, determineMediaCategory, selectedFile, mediaCategory } = fileAttachment;
    const { recording, stopRecording, handleRecordToggle } = voiceRecording;
    const { setShowAttachmentMenu, attachmentMenuRef, showAttachmentMenu } = attachmentMenu;

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
                setShowEmojiPicker(false);
            }
            if (attachmentMenuRef.current && !attachmentMenuRef.current.contains(event.target)) {
                if (!event.target.closest('.attachment-button')) {
                    setShowAttachmentMenu(false);
                }
            }
        };
        if (showEmojiPicker || showAttachmentMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showEmojiPicker, showAttachmentMenu, attachmentMenuRef, setShowAttachmentMenu]);

    // Reset state on chatId change
    useEffect(() => {
        if (!chatId) return;
        stopRecording(true);
        handleFileCleanup();
        setMessage('');
        setShowEmojiPicker(false);
        setShowAttachmentMenu(false);
        // We only want to reset when the chatId actually changes
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chatId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSending || recording) return;
        const trimmed = message.trim();
        if (!trimmed && !selectedFile) return;
        const categoryForSend = mediaCategory || (selectedFile ? determineMediaCategory(selectedFile) : undefined);
        const success = await onSendMessage({ text: trimmed, file: selectedFile, mediaCategory: categoryForSend });
        if (success) {
            setMessage('');
            handleFileCleanup();
            setShowEmojiPicker(false);
        }
    };

    const handleEmojiClick = (emojiData) => {
        setMessage(prev => prev + emojiData.emoji);
        setShowEmojiPicker(false);
    };

    const toggleEmojiPicker = () => {
        setShowEmojiPicker(!showEmojiPicker);
        setShowAttachmentMenu(false);
    };

    const onToggleAttachmentMenu = () => {
        attachmentMenu.toggleAttachmentMenu(() => setShowEmojiPicker(false));
    };

    const onAttachmentSelect = (type) => {
        fileAttachment.handleAttachmentSelect(type);
        setShowAttachmentMenu(false);
    };

    return {
        message, setMessage,
        showEmojiPicker,
        emojiPickerRef,
        handleEmojiClick,
        toggleEmojiPicker,
        handleSubmit,
        ...fileAttachment,
        ...voiceRecording,
        ...attachmentMenu,
        toggleAttachmentMenu: onToggleAttachmentMenu,
        handleAttachmentSelect: onAttachmentSelect
    };
};
