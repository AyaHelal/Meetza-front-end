import React, { useState, useEffect } from 'react';
import Select from 'react-select';

const inputStyle = { border: '2px solid #E9ECEF', fontSize: '16px' };
const labelStyle = { color: '#010101', fontSize: '16px' };

export default function EditGroupModal({
  show,
  onClose,
  group,
  positions,
  onSubmit,
  submitting,
}) {
  const [formData, setFormData] = useState({
    group_name: '',
    position_id: '',
    group_content_id: '',
    description: '',
    group_photo: null,
  });

  useEffect(() => {
    if (group) {
      setFormData({
        group_name: group.name || group.group_name || group.title || '',
        position_id: group.position_id || '',
        group_content_id: group.group_content_id || group.content_id || '',
        description: group.description || '',
        group_photo: null,
      });
    }
  }, [group]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'group_photo') {
      setFormData((prev) => ({ ...prev, [name]: files[0] }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handlePositionChange = (opt) => {
    setFormData((prev) => ({ ...prev, position_id: opt?.value ?? '' }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  if (!show || !group) return null;

  const positionOptions = positions.map((p) => ({
    value: p.id,
    label: p.name || p.position_name || p.title || `Position ${p.id}`,
  }));
  const selectedPosition = positionOptions.find((p) => String(p.value) === String(formData.position_id));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Edit Group</h3>
          <button onClick={onClose} disabled={submitting}>×</button>
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
                  Position
                </label>
                <Select
                  className="rounded-3 size mb-3"
                  options={positionOptions}
                  value={selectedPosition || null}
                  onChange={handlePositionChange}
                  placeholder="Select a position"
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
                  Poster (Opitonal - replace image)
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
