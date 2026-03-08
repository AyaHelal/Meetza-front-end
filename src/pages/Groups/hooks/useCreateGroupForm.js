import { useState } from 'react';
import { INITIAL_FORM_DATA } from '../constants';

export function useCreateGroupForm(onCreateGroup, onSuccess) {
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);

  const handleContentChange = (e) => {
    const { name, value, type, files } = e.target;
    const newValue =
      type === 'file' ? (files?.length ? files[0] : null) : value === '' ? null : type === 'number' ? Number(value) : value;
    setFormData((prev) => ({ ...prev, [name]: newValue }));
  };

  const resetForm = () => {
    setFormData(INITIAL_FORM_DATA);
  };

  const handleSubmit = async () => {
    if (!formData.group_name || !formData.position_id || !formData.year || !formData.semester || !formData.group_content_name) {
      return { error: 'Please fill all required fields: group name, position, year, semester and content name' };
    }
    try {
      await onCreateGroup({
        name: formData.group_name,
        year: formData.year,
        semester: formData.semester,
        position_id: formData.position_id,
        content_name: formData.group_content_name,
        content_description: formData.content_description,
        description: formData.description,
        photo: formData.group_photo,
      });
      resetForm();
      onSuccess?.();
      return {};
    } catch (error) {
      console.error('Error creating group:', error);
      return { error: error.message };
    }
  };

  return { formData, setFormData, handleContentChange, handleSubmit, resetForm };
}
