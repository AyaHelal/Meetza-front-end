import React, { useState, useRef, useEffect } from 'react';
import { Plus, Microphone, PaperPlaneTilt, Smiley, Image, File as FileIcon, MapPin, Camera, MusicNote, X } from '@phosphor-icons/react';
import EmojiPicker from 'emoji-picker-react';
import './ChatInput.css';

const ChatInput = ({ onSendMessage, isSending = false, chatId }) => {
    const [message, setMessage] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [previewType, setPreviewType] = useState(null);
    const [recording, setRecording] = useState(false);
    const [recordingError, setRecordingError] = useState(null);
    const [fileAccept, setFileAccept] = useState('image/*,video/*,audio/*');
    const [mediaCategory, setMediaCategory] = useState(null);
    const [pendingCategory, setPendingCategory] = useState(null);

    const emojiPickerRef = useRef(null);
    const attachmentMenuRef = useRef(null);
    const fileInputRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const discardRecordingRef = useRef(false);

    const handleFileCleanup = ({ preserveCategory = false } = {}) => {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
        setPreviewUrl(null);
        setPreviewType(null);
        setSelectedFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        if (!preserveCategory) {
            setMediaCategory(null);
            setPendingCategory(null);
        }
    };

    const determinePreviewType = (file) => {
        if (!file?.type) return 'file';
        if (file.type.startsWith('video')) return 'video';
        if (file.type.startsWith('audio')) return 'audio';
        if (file.type.startsWith('image')) return 'image';
        return 'file';
    };

    const determineMediaCategory = (file) => {
        if (!file?.type) return pendingCategory || null;
        if (file.type.startsWith('video')) return 'video';
        if (file.type.startsWith('audio')) return 'audio';
        if (file.type.startsWith('image')) return 'image';
        return 'document';
    };

    // Close emoji picker when clicking outside
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

        if (showEmojiPicker) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showEmojiPicker]);

    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    const stopRecording = (discard = false) => {
        if (!mediaRecorderRef.current) {
            discardRecordingRef.current = false;
            return;
        }
        discardRecordingRef.current = discard;
        const recorder = mediaRecorderRef.current;
        if (recorder.state !== 'inactive') {
            recorder.stop();
        } else {
            recorder.stream?.getTracks().forEach(track => track.stop());
            mediaRecorderRef.current = null;
            discardRecordingRef.current = false;
            setRecording(false);
        }
    };

    useEffect(() => {
        return () => {
            stopRecording(true);
        };
    }, []);

    useEffect(() => {
        if (!chatId) return;
        stopRecording(true);
        setRecording(false);
        setRecordingError(null);
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
        setPreviewUrl(null);
        setPreviewType(null);
        setSelectedFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        setMessage('');
        setShowEmojiPicker(false);
        setShowAttachmentMenu(false);
        handleFileCleanup();
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

    const toggleAttachmentMenu = () => {
        setShowAttachmentMenu(!showAttachmentMenu);
        setShowEmojiPicker(false);
    };

    const documentAcceptTypes = 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,text/csv,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,*/*';

    const handleAttachmentSelect = (type) => {
        let accept = 'image/*,video/*,audio/*';
        if (type === 'image') accept = 'image/*';
        if (type === 'video') accept = 'video/*';
        if (type === 'audio') accept = 'audio/*';
        if (type === 'document') accept = documentAcceptTypes;
        setFileAccept(accept);
        setShowAttachmentMenu(false);
        setPendingCategory(type);
        if (fileInputRef.current) {
            fileInputRef.current.setAttribute('accept', accept);
            fileInputRef.current.value = '';
            fileInputRef.current.click();
        }
    };

    const handleFileSelection = (file, overrideCategory = null) => {
        if (!file) return;
        handleFileCleanup({ preserveCategory: true });
        const url = URL.createObjectURL(file);
        setSelectedFile(file);
        setPreviewUrl(url);
        setPreviewType(determinePreviewType(file));
        const resolvedCategory = overrideCategory || pendingCategory || determineMediaCategory(file) || null;
        setMediaCategory(resolvedCategory);
        setPendingCategory(null);
    };

    const handleFileChange = (event) => {
        const file = event.target.files?.[0];
        if (file) {
            handleFileSelection(file);
        }
    };

    const startRecording = async () => {
        if (recording) {
            return;
        }
        if (!navigator.mediaDevices?.getUserMedia) {
            setRecordingError('Voice recording is not supported in this browser');
            return;
        }
        setRecordingError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            mediaRecorderRef.current = recorder;
            audioChunksRef.current = [];

            recorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            recorder.onstop = () => {
                stream.getTracks().forEach(track => track.stop());
                const shouldDiscard = discardRecordingRef.current;
                discardRecordingRef.current = false;
                if (!shouldDiscard) {
                    const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                    const audioFile = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
                    handleFileSelection(audioFile, 'audio');
                }
                mediaRecorderRef.current = null;
                setRecording(false);
            };

            recorder.start();
            setRecording(true);
        } catch (error) {
            console.error('Microphone error', error);
            setRecordingError('Microphone access denied');
            setRecording(false);
        }
    };

    const handleRecordToggle = () => {
        if (recording) {
            stopRecording(false);
        } else {
            startRecording();
        }
    };

    return (
        <div className="chat-input shadow-sm">
            {(previewUrl || recording) && (
                <div className="chat-media-preview">
                    <div className="preview-content">
                        {recording && !previewUrl ? (
                            <div className="recording-indicator">
                                <span className="recording-dot" />
                                <span>Recording...</span>
                            </div>
                        ) : previewType === 'image' ? (
                            <img src={previewUrl} alt="Selected media" />
                        ) : previewType === 'video' ? (
                            <video src={previewUrl} controls />
                        ) : previewType === 'audio' ? (
                            <audio src={previewUrl} controls />
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
                <div className="input-icon input-icon-left attachment-button" onClick={toggleAttachmentMenu}>
                    <Plus size={20} />
                    {showAttachmentMenu && (
                        <div className="attachment-menu" ref={attachmentMenuRef}>
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
                        </div>
                    )}
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
        </div>
    );
};

export default ChatInput;