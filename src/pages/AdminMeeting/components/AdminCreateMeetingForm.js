import React from "react";

export function AdminCreateMeetingForm({
  posterInputId,
  editingMeetingId,
  formData,
  handleInputChange,
  handleFormSubmit,
  groupsLoading,
  groups,
  resetFormForCreate,
}) {
  return (
    <form className="create-meeting-form" onSubmit={handleFormSubmit}>
      <div className="form-group">
        <label>
          Title <span className="required">*</span>
        </label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleInputChange}
          placeholder="Meeting title"
        />
      </div>

      <div className="form-group">
        <label>
          Start - End time <span className="required">*</span>
        </label>
        <div className="time-inputs">
          <input
            type="datetime-local"
            name="startTime"
            className="time-start"
            value={formData.startTime}
            onChange={handleInputChange}
          />
          <input
            type="datetime-local"
            name="endTime"
            className="time-end"
            value={formData.endTime}
            onChange={handleInputChange}
          />
        </div>
      </div>

      <div className="form-group">
        <label>
          Group <span className="required">*</span>
        </label>
        <select name="group_id" value={formData.group_id} onChange={handleInputChange} disabled={groupsLoading}>
          <option value="">Select group...</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>
          Status <span className="required">*</span>
        </label>
        <select name="status" value={formData.status} onChange={handleInputChange}>
          <option value="Scheduled">Scheduled</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      <div className="form-group">
        <label className="mb-2">Record Meeting</label>
        <div className="radio-group">
          <label className="radio-label">
            <input
              type="radio"
              name="recordMeeting"
              value="Recording"
              checked={formData.recordMeeting === "Recording"}
              onChange={handleInputChange}
            />
            Recording
          </label>
          <label className="radio-label">
            <input
              type="radio"
              name="recordMeeting"
              value="Not Recording"
              checked={formData.recordMeeting === "Not Recording"}
              onChange={handleInputChange}
            />
            Not Recording
          </label>
        </div>
      </div>
      <div className="form-group">
        <label className="mb-2">Weekly</label>
        <div className="form-group">
          <label className="radio-label">
            <input
              type="radio"
              name="weeklyOption"
              value="Active"
              checked={formData.weeklyOption === "Active"}
              onChange={handleInputChange}
            />
            Active
          </label>
          <label className="radio-label">
            <input
              type="radio"
              name="weeklyOption"
              value="Inactive"
              checked={formData.weeklyOption === "Inactive"}
              onChange={handleInputChange}
            />
            Inactive
          </label>
        </div>
      </div>

      <div className="form-group">
        <label>Description (optional)</label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          rows={3}
          placeholder="Short description"
        />
      </div>

      <div className="form-group">
        <label>
          Poster {!editingMeetingId && <span className="required">*</span>}
        </label>
        <div className="file-upload">
          <input
            type="file"
            id={posterInputId}
            name="poster_file"
            accept="image/*"
            onChange={handleInputChange}
          />
          <label htmlFor={posterInputId} className="file-upload-label">
            <div className="upload-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="16 16 12 12 8 16" />
                <line x1="12" y1="12" x2="12" y2="21" />
                <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
              </svg>
            </div>
          </label>
        </div>
        {formData.poster_file && <span className="file-selected-name">{formData.poster_file.name}</span>}
      </div>

      {!editingMeetingId && (
        <div className="form-group">
          <label>Resources files (optional)</label>
          <input
            type="file"
            name="files"
            multiple
            accept="*"
            onChange={handleInputChange}
            className="create-meeting-file-input"
          />
          {Array.isArray(formData.files) && formData.files.length > 0 && (
            <div className="selected-files-list">
              <strong>Selected resources:</strong>
              <ul>
                {formData.files.map((f, i) => (
                  <li key={i}>{f.name}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="form-actions-row">
        <button type="submit" className="create-meeting-btn">
          {editingMeetingId ? "Edit Meeting" : "Create Meeting"}
        </button>
        {editingMeetingId && (
          <button type="button" className="cancel-edit-btn" onClick={resetFormForCreate}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
