import { useState } from 'react';
import { INITIAL_FORM_DATA } from '../constants';

export function useCreateGroupForm(onCreateGroup, options = {}) {
  const { isSuperAdmin = false, onSuccess } = options;
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
    if (!formData.group_name || !formData.year || !formData.semester || !formData.group_content_name) {
      return { error: 'Please fill all required fields: group name, year, semester and content name' };
    }
    if (isSuperAdmin && (formData.assigned_admin_id == null || formData.assigned_admin_id === '')) {
      return { error: 'Please select an administrator for this group' };
    }
    try {
      const payload = {
        name: formData.group_name,
        year: formData.year,
        semester: formData.semester,
        content_name: formData.group_content_name,
        content_description: formData.content_description,
        description: formData.description,
        photo: formData.group_photo,
      };
      if (formData.position_id != null && formData.position_id !== '') {
        payload.position_id = formData.position_id;
      }
      if (isSuperAdmin && formData.assigned_admin_id !== '' && formData.assigned_admin_id != null) {
        payload.adminUserId = formData.assigned_admin_id;
      }
      await onCreateGroup(payload);
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
