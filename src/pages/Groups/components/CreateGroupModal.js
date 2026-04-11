import React from 'react';
import Select from 'react-select';
import { SEMESTER_OPTIONS } from '../constants';

const inputStyle = { border: '2px solid #E9ECEF', fontSize: '16px' };
const labelStyle = { color: '#010101', fontSize: '16px' };

export default function CreateGroupModal({
  show,
  onClose,
  formData,
  handleContentChange,
  onSubmit,
  isSuperAdmin = false,
  administrators = [],
  administratorsLoading = false,
}) {
  if (!show) return null;

  const adminOptions = administrators.map((a) => ({
    value: a.id,
    label: a.email ? `${a.name} (${a.email})` : a.name || `Administrator ${a.id}`,
  }));
  const selectedAdmin = administrators.find((a) => String(a.id) === String(formData.assigned_admin_id));
  const adminSelectValue = selectedAdmin
    ? {
      value: selectedAdmin.id,
      label: selectedAdmin.email
        ? `${selectedAdmin.name} (${selectedAdmin.email})`
        : selectedAdmin.name || `Administrator ${selectedAdmin.id}`,
    }
    : null;
  const semesterValue = formData.semester ? { value: formData.semester, label: formData.semester } : null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Create New Group</h3>
          <button onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="row justify-content-center">
            <div className="col-lg-10 col-md-12 col-sm-12 panelcard">
              <div className="mb-0 lg-mb-4 pading">
                <label className="form-label fw-semibold" style={labelStyle}>
                  Group Name <span style={{ color: '#FF0000' }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-control rounded-3 size mb-3"
                  name="group_name"
                  value={formData.group_name || ''}
                  onChange={handleContentChange}
                  placeholder="Enter group name"
                  style={inputStyle}
                />
              </div>

              {isSuperAdmin && (
                <div className="mb-0 lg-mb-4">
                  <label className="form-label fw-semibold" style={labelStyle}>
                    Group administrator <span style={{ color: '#FF0000' }}>*</span>
                  </label>
                  <Select
                    className="rounded-3 size mb-3"
                    options={adminOptions}
                    value={adminSelectValue}
                    onChange={(opt) => {
                      const id = opt?.value ?? '';
                      const sel = administrators.find((a) => String(a.id) === String(id));
                      handleContentChange({ target: { name: 'assigned_admin_id', value: id } });
                      if (sel?.position_id != null && String(sel.position_id).trim() !== '') {
                        handleContentChange({
                          target: { name: 'position_id', value: sel.position_id },
                        });
                      } else {
                        handleContentChange({ target: { name: 'position_id', value: '' } });
                      }
                    }}
                    placeholder={
                      administratorsLoading ? 'Loading administrators…' : 'Select an administrator'
                    }
                    isLoading={administratorsLoading}
                    isDisabled={administratorsLoading}
                    menuPortalTarget={document.body}
                    styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
                  />
                </div>
              )}

              <div className="mb-4">
                <label className="form-label fw-semibold" style={labelStyle}>
                  Year <span style={{ color: '#FF0000' }}>*</span>
                </label>
                <input
                  type="number"
                  className="form-control rounded-3 mb-3 size"
                  name="year"
                  min={1}
                  value={formData.year || ''}
                  onChange={handleContentChange}
                  placeholder="Enter year"
                  style={inputStyle}
                />
                <div className="p-0 mb-4">
                  <label className="form-label fw-semibold" style={labelStyle}>
                    Semester <span style={{ color: '#FF0000' }}>*</span>
                  </label>
                  <Select
                    options={SEMESTER_OPTIONS}
                    value={semesterValue}
                    onChange={(opt) => handleContentChange({ target: { name: 'semester', value: opt?.value ?? '' } })}
                    placeholder="Select semester"
                    menuPortalTarget={document.body}
                    styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
                  />
                </div>

                <div className="p-0 mb-4">
                  <label className="form-label fw-semibold" style={labelStyle}>
                    Content Name <span style={{ color: '#FF0000' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control rounded-3"
                    name="group_content_name"
                    value={formData.group_content_name || ''}
                    onChange={handleContentChange}
                    placeholder="Enter content name"
                    style={inputStyle}
                  />
                </div>

                <div className="p-0 mb-4">
                  <label className="form-label fw-semibold" style={labelStyle}>
                    Content Description
                  </label>
                  <textarea
                    className="form-control rounded-3"
                    name="content_description"
                    value={formData.content_description || ''}
                    onChange={handleContentChange}
                    placeholder="Enter content description (optional)"
                    style={{ ...inputStyle, minHeight: 90 }}
                  />
                </div>

                <div className="p-0 mb-4">
                  <label className="form-label fw-semibold" style={labelStyle}>
                    Description
                  </label>
                  <textarea
                    className="form-control rounded-3"
                    name="description"
                    value={formData.description || ''}
                    onChange={handleContentChange}
                    placeholder="Enter group description (optional)"
                    style={{ ...inputStyle, minHeight: 90 }}
                  />
                </div>

                <div className="p-0 mb-4">
                  <label className="form-label fw-semibold" style={labelStyle}>
                    Poster (upload image)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    className="form-control"
                    name="group_photo"
                    onChange={handleContentChange}
                  />
                  {formData.group_photo && (
                    <div style={{ marginTop: 8 }}>
                      <small>Selected file: {formData.group_photo.name}</small>
                    </div>
                  )}
                </div>

                <div className="text-center">
                  <button
                    type="button"
                    className="btn rounded-3 px-5 py-2"
                    onClick={onSubmit}
                    disabled={Boolean(isSuperAdmin && administratorsLoading)}
                    style={{
                      background: '#0076EA',
                      color: 'white',
                      border: 'none',
                      fontSize: '16px',
                      fontWeight: '600',
                    }}
                  >
                    Create Group
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
