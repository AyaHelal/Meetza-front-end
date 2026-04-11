import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { smartToast } from '../../../API/toastManager';
import { SEMESTER_OPTIONS } from '../constants';

const inputStyle = { border: '2px solid #E9ECEF', fontSize: '16px' };
const labelStyle = { color: '#010101', fontSize: '16px' };

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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Edit Group</h3>
          <button type="button" onClick={onClose} disabled={submitting}>
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
                  styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
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
