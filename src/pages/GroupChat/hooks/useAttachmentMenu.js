import { useState, useRef, useEffect, useCallback } from 'react';

export const useAttachmentMenu = () => {
    const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
    const [attachmentMenuPosition, setAttachmentMenuPosition] = useState(null);
    const attachmentMenuRef = useRef(null);
    const attachmentButtonRef = useRef(null);

    const toggleAttachmentMenu = useCallback((onOpen) => {
        setShowAttachmentMenu((prev) => {
            const next = !prev;
            if (next) {
                onOpen?.();
                const btn = attachmentButtonRef.current;
                if (btn) {
                    const rect = btn.getBoundingClientRect();
                    setAttachmentMenuPosition({
                        left: rect.left,
                        bottom: window.innerHeight - rect.top + 8,
                    });
                }
            }
            return next;
        });
    }, []);

    useEffect(() => {
        if (!showAttachmentMenu) return;
        const updatePosition = () => {
            const btn = attachmentButtonRef.current;
            if (!btn) return;
            const rect = btn.getBoundingClientRect();
            setAttachmentMenuPosition({
                left: rect.left,
                bottom: window.innerHeight - rect.top + 8,
            });
        };
        updatePosition();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);
        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [showAttachmentMenu]);

    return {
        showAttachmentMenu,
        setShowAttachmentMenu,
        attachmentMenuPosition,
        attachmentMenuRef,
        attachmentButtonRef,
        toggleAttachmentMenu
    };
};
