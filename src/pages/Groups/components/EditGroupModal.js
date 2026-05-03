import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { smartToast } from '../../../API/toastManager';
import { SEMESTER_OPTIONS } from '../constants';

const inputStyle = { 
  backgroundColor: 'var(--bg-light)', 
  border: '2px solid var(--border-color)', 
  color: 'var(--text-primary)',
  fontSize: '16px' 
};
const labelStyle = { color: 'var(--text-primary)', fontSize: '16px' };

const selectStyles = {
  control: (base, state) => ({
    ...base,
    backgroundColor: 'var(--bg-light)',
    borderColor: state.isFocused ? 'var(--primary-color)' : 'var(--border-color)',
    color: 'var(--text-primary)',
    boxShadow: state.isFocused ? '0 0 0 1px var(--primary-color)' : 'none',
    '&:hover': {
      borderColor: 'var(--primary-color)'
    }
  }),
  menu: (base) => ({
    ...base,
    backgroundColor: 'var(--card-bg)',
    border: '1px solid var(--border-color)',
  }),
  option: (base, { isFocused, isSelected }) => ({
    ...base,
    backgroundColor: isSelected 
      ? 'var(--primary-color)' 
      : isFocused 
        ? 'var(--bg-color)' 
        : 'transparent',
    color: isSelected ? 'white' : 'var(--text-primary)',
    cursor: 'pointer',
    '&:active': {
      backgroundColor: 'var(--primary-color)'
    }
  }),
  singleValue: (base) => ({
    ...base,
    color: 'var(--text-primary)',
  }),
  input: (base) => ({
    ...base,
    color: 'var(--text-primary)',
  }),
  placeholder: (base) => ({
    ...base,
    color: 'var(--text-muted)',
  }),
};

export default function EditGroupModal({
  show,
  onClose,
  group,
  onSubmit,
  submitting,
}) {
  const [formData, setFormData] = useState({
    group_name: '',
    year: '',
    semester: '',
    description: '',
    group_photo: null,
  });

  useEffect(() => {
    if (group) {
      const y = group.year ?? group.Year;
      setFormData({
        group_name: group.name || group.group_name || group.title || '',
        year: y != null && y !== '' ? String(y) : '',
        semester: group.semester || group.Semester || '',
        description: group.description ?? '',
        group_photo: null,
      });
    }
  }, [group]);

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    if (name === 'group_photo') {
      setFormData((prev) => ({ ...prev, [name]: files?.length ? files[0] : null }));
    } else {
      const next =
        type === 'number' ? (value === '' ? '' : Number(value)) : value;
      setFormData((prev) => ({ ...prev, [name]: next }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const hasText =
      String(formData.group_name || '').trim() !== '' ||
      String(formData.description || '').trim() !== '' ||
      String(formData.year || '').trim() !== '' ||
      String(formData.semester || '').trim() !== '';
    const hasPhoto = Boolean(formData.group_photo);
    if (!hasText && !hasPhoto) {
      smartToast.error(
        'Change at least one field: name, description, year, semester, or poster.'
      );
      return;
    }
    onSubmit(formData);
  };

  if (!show || !group) return null;

  const semesterValue = formData.semester
    ? { value: formData.semester, label: formData.semester }
    : null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)' }}>
        <div className="modal-header" style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--card-bg)' }}>
          <h3 style={{ color: 'var(--text-primary)' }}>Edit Group</h3>
          <button type="button" onClick={onClose} disabled={submitting} style={{ color: 'var(--text-secondary)', filter: 'var(--close-btn-filter)' }}>
            ×
          </button>
        </div>
        <form className="modal-body" onSubmit={handleSubmit}>
          <div className="row justify-content-center">
            <div className="col-lg-10 col-md-12 col-sm-12 panelcard">
              <div className="mb-0 lg-mb-4 pading">
                <label className="form-label fw-semibold" style={labelStyle}>
                  Group Name
                </label>
                <input
                  type="text"
                  className="form-control rounded-3 size mb-3"
                  name="group_name"
                  value={formData.group_name}
                  onChange={handleChange}
                  placeholder="Enter group name"
                  style={inputStyle}
                />
              </div>

              <div className="mb-0 lg-mb-4 pading">
                <label className="form-label fw-semibold" style={labelStyle}>
                  Year
                </label>
                <input
                  type="number"
                  className="form-control rounded-3 mb-3 size"
                  name="year"
                  min={1}
                  max={4}
                  value={formData.year === '' ? '' : formData.year}
                  onChange={handleChange}
                  placeholder="1–4"
                  style={inputStyle}
                />
              </div>

              <div className="p-0 mb-4">
                <label className="form-label fw-semibold" style={labelStyle}>
                  Semester
                </label>
                <Select
                  className="rounded-3 size mb-3"
                  options={SEMESTER_OPTIONS}
                  value={semesterValue}
                  onChange={(opt) =>
                    setFormData((prev) => ({ ...prev, semester: opt?.value ?? '' }))
                  }
                  placeholder="Select semester"
                  isClearable
                  menuPortalTarget={document.body}
                  styles={{ ...selectStyles, menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
                />
              </div>

              <div className="p-0 mb-4">
                <label className="form-label fw-semibold" style={labelStyle}>
                  Description
                </label>
                <textarea
                  className="form-control rounded-3"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Enter group description"
                  style={{ ...inputStyle, minHeight: 90 }}
                />
              </div>

              <div className="p-0 mb-4">
                <label className="form-label fw-semibold" style={labelStyle}>
                  Poster (optional — replace image)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  className="form-control"
                  name="group_photo"
                  onChange={handleChange}
                />
              </div>

              <div className="text-center">
                <button
                  type="submit"
                  className="btn rounded-3 px-5 py-2"
                  disabled={submitting}
                  style={{
                    background: '#0076EA',
                    color: 'white',
                    border: 'none',
                    fontSize: '16px',
                    fontWeight: '600',
                  }}
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
