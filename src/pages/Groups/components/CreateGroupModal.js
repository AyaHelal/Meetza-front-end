import React, { useMemo } from 'react';
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
  adminUsers = [],
  adminUsersLoading = false,
}) {
  const adminOptions = useMemo(
    () =>
      adminUsers
        .map((u) => {
          const id = u.id;
          const base = u.name || u.email || 'User';
          const label = u.email ? `${base} (${u.email})` : base;
          return { value: id, label, user: u };
        })
        .sort((a, b) => String(a.label).localeCompare(String(b.label), undefined, { sensitivity: 'base' })),
    [adminUsers]
  );

  if (!show) return null;

  const adminIds = Array.isArray(formData.admin_ids) ? formData.admin_ids : [];
  const adminSelectValue = adminIds
    .map((id) => adminOptions.find((o) => String(o.value) === String(id)))
    .filter(Boolean);
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
                    Group admins <span style={{ color: '#FF0000' }}>*</span>
                  </label>
                  <Select
                    className="rounded-3 size mb-3"
                    isMulti
                    closeMenuOnSelect={false}
                    options={adminOptions}
                    value={adminSelectValue}
                    onChange={(opts) => {
                      const ordered = (opts || []).map((o) => o.value);
                      handleContentChange({ target: { name: 'admin_ids', value: ordered } });
                      const first = opts?.[0]?.user;
                      if (first?.position_id != null && String(first.position_id).trim() !== '') {
                        handleContentChange({
                          target: { name: 'position_id', value: first.position_id },
                        });
                      } else {
                        handleContentChange({ target: { name: 'position_id', value: '' } });
                      }
                    }}
                    placeholder={
                      adminUsersLoading ? 'Loading users…' : 'Select one or more administrators'
                    }
                    isLoading={adminUsersLoading}
                    isDisabled={adminUsersLoading}
                    menuPortalTarget={document.body}
                    styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
                  />
                  <small className="text-muted d-block mt-1">
                    First selected is the primary group administrator.
                  </small>
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
                    disabled={Boolean(isSuperAdmin && adminUsersLoading)}
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
