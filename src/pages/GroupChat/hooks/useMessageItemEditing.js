import { useState, useEffect, useCallback } from 'react';

export function useMessageItemEditing({ message, onEditMessage }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.message || message.text || '');

  useEffect(() => {
    setEditText(message.message || message.text || '');
  }, [message.message, message.text]);

  const handleEdit = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleEditSubmit = useCallback(() => {
    const trimmedText = editText.trim();
    const currentText = message.message || message.text || '';
    if (trimmedText && trimmedText !== currentText) {
      onEditMessage(message.id, trimmedText);
    } else if (!trimmedText) {
      setEditText(message.message || message.text || '');
      setIsEditing(false);
      return;
    }
    setIsEditing(false);
  }, [editText, message, onEditMessage]);

  const handleEditCancel = useCallback(() => {
    setEditText(message.message || message.text || '');
    setIsEditing(false);
  }, [message.message, message.text]);

  const handleEditKeyDown = useCallback((e) => {
    if (e.key === 'Enter') handleEditSubmit();
    else if (e.key === 'Escape') handleEditCancel();
  }, [handleEditSubmit, handleEditCancel]);

  return {
    isEditing,
    editText,
    setEditText,
    setIsEditing,
    handleEdit,
    handleEditSubmit,
    handleEditCancel,
    handleEditKeyDown,
  };
}
