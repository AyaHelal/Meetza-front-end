import { useState, useRef, useEffect, useCallback } from 'react';

export const useFileAttachment = () => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [previewType, setPreviewType] = useState(null);
    const [fileAccept, setFileAccept] = useState('image/*,video/*,audio/*');
    const [mediaCategory, setMediaCategory] = useState(null);
    const [pendingCategory, setPendingCategory] = useState(null);
    const fileInputRef = useRef(null);

    const handleFileCleanup = useCallback(({ preserveCategory = false } = {}) => {
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
    }, [previewUrl]);

    const determinePreviewType = useCallback((file) => {
        if (!file?.type) return 'file';
        if (file.type.startsWith('video')) return 'video';
        if (file.type.startsWith('audio')) return 'audio';
        if (file.type.startsWith('image')) return 'image';
        return 'file';
    }, []);

    const determineMediaCategory = useCallback((file) => {
        if (!file?.type) return pendingCategory || null;
        if (file.type.startsWith('video')) return 'video';
        if (file.type.startsWith('audio')) return 'audio';
        if (file.type.startsWith('image')) return 'image';
        return 'document';
    }, [pendingCategory]);

    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    const handleFileSelection = useCallback((file, overrideCategory = null) => {
        if (!file) return;
        handleFileCleanup({ preserveCategory: true });
        const url = URL.createObjectURL(file);
        setSelectedFile(file);
        setPreviewUrl(url);
        setPreviewType(determinePreviewType(file));
        
        let resolvedCategory = overrideCategory || pendingCategory || determineMediaCategory(file) || null;
        if (file.type?.startsWith('audio/') && !overrideCategory && resolvedCategory !== 'voice_note') {
            resolvedCategory = 'audio';
        }
        setMediaCategory(resolvedCategory);
        setPendingCategory(null);
    }, [handleFileCleanup, pendingCategory, determinePreviewType, determineMediaCategory]);

    const handleAttachmentSelect = useCallback((type) => {
        let accept = 'image/*,video/*,audio/*';
        const documentAcceptTypes = 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,text/csv,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,*/*';
        if (type === 'image') accept = 'image/*';
        if (type === 'video') accept = 'video/*';
        if (type === 'audio') accept = 'audio/*';
        if (type === 'document') accept = documentAcceptTypes;
        
        setFileAccept(accept);
        setPendingCategory(type);
        if (fileInputRef.current) {
            fileInputRef.current.setAttribute('accept', accept);
            fileInputRef.current.value = '';
            fileInputRef.current.click();
        }
    }, []);

    const handleFileChange = useCallback((event) => {
        const file = event.target.files?.[0];
        if (file) {
            handleFileSelection(file);
        }
    }, [handleFileSelection]);

    return {
        selectedFile,
        previewUrl,
        previewType,
        fileAccept,
        mediaCategory,
        pendingCategory,
        fileInputRef,
        handleFileCleanup,
        handleFileSelection,
        handleAttachmentSelect,
        handleFileChange,
        determineMediaCategory
    };
};
