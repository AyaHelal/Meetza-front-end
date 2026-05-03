import React from 'react';
import { createPortal } from 'react-dom';
import { Plus, Microphone, PaperPlaneTilt, Smiley, Image, File as FileIcon, MapPin, Camera, MusicNote, X } from '@phosphor-icons/react';
import EmojiPicker from 'emoji-picker-react';
import { useChatInput } from '../hooks/useChatInput';
import './ChatInput.css';

const ChatInput = ({
    onSendMessage,
    isSending = false,
    chatId,
    replyTo = null,
    onCancelReply,
}) => {
    const {
        message, setMessage,
        showEmojiPicker,
        showAttachmentMenu,
        selectedFile,
        previewUrl,
        previewType,
        recording,
        recordingError,
        fileAccept,
        mediaCategory,
        attachmentMenuPosition,
        emojiPickerRef,
        attachmentMenuRef,
        attachmentButtonRef,
        fileInputRef,
        handleFileCleanup,
        handleSubmit,
        handleEmojiClick,
        toggleEmojiPicker,
        toggleAttachmentMenu,
        handleAttachmentSelect,
        handleFileChange,
        handleRecordToggle
    } = useChatInput({ onSendMessage, isSending, chatId });

    return (
        <div className="chat-input shadow-sm">
            {replyTo && (
                <div className="chat-reply-banner" role="status">
                    <div className="chat-reply-banner-body">
                        <span className="chat-reply-banner-label">Replying to</span>
                        <span className="chat-reply-banner-meta">{replyTo.sender}</span>
                        {replyTo.snippet ? (
                            <span className="chat-reply-banner-snippet">{replyTo.snippet}</span>
                        ) : null}
                    </div>
                    <button
                        type="button"
                        className="chat-reply-banner-dismiss"
                        onClick={() => onCancelReply?.()}
                        aria-label="Cancel reply"
                    >
                        <X size={18} weight="bold" />
                    </button>
                </div>
            )}
            {(previewUrl || recording) && (
                <div className="chat-media-preview">
                    <div className="preview-content">
                        {recording && !previewUrl ? (
                            <div className="recording-indicator">
                                <span className="recording-dot" />
                                <span>Recording...</span>
                            </div>
                        ) : previewType === 'image' ? (
                            <img src={previewUrl || undefined} alt="Selected media" />
                        ) : previewType === 'video' ? (
                            <video src={previewUrl || undefined} controls />
                        ) : previewType === 'audio' ? (
                            <div className="audio-preview-wrapper">
                                <audio src={previewUrl || undefined} controls />
                                <span className="audio-ready-label">
                                    {mediaCategory === 'voice_note' ? 'Voice note ready to send' : 'Audio file ready to send'}
                                </span>
                            </div>
                        ) : (
                            <div className="preview-fallback">
                                <FileIcon size={20} />
                                <span>{selectedFile?.name || 'Attachment ready'}</span>
                            </div>
                        )}
                    </div>
                    {!recording && selectedFile && (
                        <button type="button" className="remove-preview-btn" onClick={handleFileCleanup}>
                            <X size={16} weight="bold" />
                        </button>
                    )}
                </div>
            )}
            {recordingError && <p className="recording-error">{recordingError}</p>}
            <form className="input-wrapper" onSubmit={handleSubmit}>
                <div
                    ref={attachmentButtonRef}
                    className="input-icon input-icon-left attachment-button"
                    onClick={toggleAttachmentMenu}
                >
                    <Plus size={20} />
                </div>

                <input
                    type="text"
                    placeholder="Type a message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                />
                <div className={`input-icon input-icon-right ${recording ? 'recording-active' : ''}`} onClick={handleRecordToggle}>
                    <Microphone size={20} />
                </div>
                <div className="input-icon input-icon-right emoji-icon" onClick={toggleEmojiPicker}>
                    <Smiley size={20} />
                </div>

                {showEmojiPicker && (
                    <div className="emoji-picker-wrapper" ref={emojiPickerRef}>
                        <EmojiPicker onEmojiClick={handleEmojiClick} />
                    </div>
                )}

                <button type="submit" className="input-icon send input-icon-right" disabled={isSending || recording}>
                    <PaperPlaneTilt size={18} weight="fill" />
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept={fileAccept}
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                />
            </form>

            {showAttachmentMenu && attachmentMenuPosition && createPortal(
                <div
                    className="attachment-menu attachment-menu-portal"
                    ref={attachmentMenuRef}
                    style={{
                        position: 'fixed',
                        left: attachmentMenuPosition.left,
                        bottom: attachmentMenuPosition.bottom,
                        zIndex: 10000,
                    }}
                >
                    <button type="button" onClick={() => handleAttachmentSelect('image')}>
                        <Image size={20} />
                        <span>Photo</span>
                    </button>
                    <button type="button" onClick={() => handleAttachmentSelect('video')}>
                        <Camera size={20} />
                        <span>Video</span>
                    </button>
                    <button type="button" onClick={() => handleAttachmentSelect('audio')}>
                        <MusicNote size={20} />
                        <span>Audio</span>
                    </button>
                    <button type="button" onClick={() => handleAttachmentSelect('document')}>
                        <FileIcon size={20} />
                        <span>Document</span>
                    </button>
                </div>,
                document.body
            )}
        </div>
    );
};

export default ChatInput;