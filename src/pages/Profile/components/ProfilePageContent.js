import React from "react";
import { useNavigate } from "react-router-dom";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import ListGroup from "react-bootstrap/ListGroup";
import Ratio from "react-bootstrap/Ratio";
import Stack from "react-bootstrap/Stack";
import {
  HandWavingIcon,
  PencilSimple,
  TrashIcon,
  YoutubeLogo as YoutubeLogoIcon,
  CaretRight,
} from "@phosphor-icons/react";
import UserPhoto from "../../../components/UserPhoto/UserPhoto";
import { ConfirmDeleteModal } from "../../../components/shared/ConfirmDeleteModal";
import ContactForm from "../../../components/Contact/ContactForm";
import { FILE_GRID_LABELS } from "../services/profilePageConstants";
import { dateBadgeFromDate, firstName, formatClockPartsFromDate } from "../services/profilePageUtils";
import { ProfileSavedVideoCard } from "./ProfileSavedVideoCard";

export function ProfilePageContent(props) {
  const navigate = useNavigate();
  const {
    user,
    savedVideos,
    savedVideosLoading,
    savedVideosError,
    profileMeetings,
    meetingsLoading,
    meetingsError,
    isMemberProfile,
    nameEditing,
    nameDraft,
    setNameDraft,
    nameSaving,
    contactModalOpen,
    setContactModalOpen,
    displayName,
    email,
    username,
    contactPrefillName,
    contactPrefillEmail,
    limitedMeetings,
    limitedSavedVideos,
    limitedLiveMeetings,
    limitedNotifications,
    hasSavedVideos,
    groupsMap,
    handleJoinLiveMeeting,
    showPositionProfileSection,
    startNameEdit,
    cancelNameEdit,
    handleSaveName,
    positionPutId,
    positionLabel,
    positionFetchLoading,
    positionFetchError,
    positionEditing,
    positionDraft,
    setPositionDraft,
    positionSaving,
    startPositionEdit,
    cancelPositionEdit,
    handleSavePosition,
    positionDeleting,
    showDeletePositionModal,
    openDeletePositionModal,
    closeDeletePositionModal,
    confirmDeletePosition,
    triggerPhotoPicker,
    profilePhotoFileInputId,
  } = props;

  return (
    <div
      className={[
        "profile-page d-flex flex-column flex-grow-1 min-vh-0",
        isMemberProfile && "profile-page--member",
        !hasSavedVideos && "profile-page--no-saved-videos",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Container fluid="xl" className="profile-dashboard-inner py-4 px-3 flex-grow-1">
        <Row className="g-3 g-md-4 align-items-start align-items-xl-stretch">
          <Col xl={4} md={12} xs={12} className="d-flex flex-column min-h-0">
            <Stack gap={4} className="profile-dashboard-stack">
              <Card className="border-0 profile-design-card profile-welcome-card">
                <Card.Body className="d-flex align-items-center gap-2">
                  <HandWavingIcon
                    size={20}
                    weight="regular"
                    color="var(--profile-blue)"
                    className="profile-welcome-hand flex-shrink-0"
                    aria-hidden
                  />
                  <span className="text-secondary mb-0 fs-6">
                    <strong className="text-dark">Welcome {firstName(displayName)}</strong>
                  </span>
                </Card.Body>
              </Card>

              <Card className="border-0 profile-design-card">
                <Card.Body className="text-center pt-3 pb-3 px-3">
                  <div className="profile-avatar-block mx-auto mb-4">
                    <UserPhoto user={user} size="large" variant="default" fileInputId={profilePhotoFileInputId} />
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      className="profile-avatar-edit rounded-circle p-0 d-inline-flex align-items-center justify-content-center border border-2 border-white shadow-sm"
                      aria-label="Change profile photo"
                      onClick={triggerPhotoPicker}
                    >
                      <PencilSimple size={16} weight="bold" />
                    </Button>
                  </div>
                  <div className="text-start px-1">
                    <div className="profile-field-row align-items-start">
                      <div className="profile-field-main">
                        <span className="profile-field-label">Name</span>
                        {nameEditing ? (
                          <div className="profile-name-edit mt-1">
                            <Form.Control
                              id="profile-edit-name"
                              type="text"
                              value={nameDraft}
                              onChange={(e) => setNameDraft(e.target.value)}
                              placeholder="Your name"
                              autoComplete="name"
                              disabled={nameSaving}
                              className="profile-name-edit-input"
                              autoFocus
                            />
                            <div className="d-flex flex-wrap gap-2 mt-2">
                              <Button type="button" size="sm" variant="primary" onClick={handleSaveName} disabled={nameSaving}>
                                {nameSaving ? "Saving…" : "Save"}
                              </Button>
                              <Button type="button" size="sm" variant="outline-secondary" onClick={cancelNameEdit} disabled={nameSaving}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="profile-field-value">{username}</div>
                        )}
                      </div>
                      {!nameEditing ? (
                        <Button
                          type="button"
                          variant="link"
                          className="profile-field-edit-btn flex-shrink-0"
                          aria-label="Edit name"
                          onClick={startNameEdit}
                        >
                          <PencilSimple size={20} />
                        </Button>
                      ) : null}
                    </div>
                    <div className="profile-field-row">
                      <div className="profile-field-main">
                        <span className="profile-field-label">Email</span>
                        <div className="profile-field-value text-break">{email}</div>
                      </div>
                    </div>
                    {showPositionProfileSection ? (
                      <div className="profile-field-row align-items-start">
                        <div className="profile-field-main">
                          <span className="profile-field-label">Position</span>
                          {positionEditing ? (
                            <div className="profile-name-edit mt-1">
                              <Form.Control
                                id="profile-edit-position"
                                type="text"
                                value={positionDraft}
                                onChange={(e) => setPositionDraft(e.target.value)}
                                placeholder="Position title"
                                autoComplete="organization-title"
                                disabled={positionSaving}
                                className="profile-name-edit-input"
                                autoFocus
                              />
                              <div className="d-flex flex-wrap gap-2 mt-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="primary"
                                  onClick={handleSavePosition}
                                  disabled={positionSaving}
                                >
                                  {positionSaving ? "Saving…" : "Save"}
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline-secondary"
                                  onClick={cancelPositionEdit}
                                  disabled={positionSaving}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : positionFetchLoading ? (
                            <div className="profile-field-value text-muted">Loading positions…</div>
                          ) : positionFetchError ? (
                            <div className="profile-field-value text-danger small">{positionFetchError}</div>
                          ) : (
                            <div className="profile-field-value">{positionLabel}</div>
                          )}
                        </div>
                        {!positionEditing ? (
                          <div className="d-flex align-items-start gap-0 flex-shrink-0">
                            <Button
                              type="button"
                              variant="link"
                              className="profile-field-edit-btn"
                              aria-label={positionPutId ? "Edit position" : "Create position"}
                              onClick={startPositionEdit}
                              disabled={positionFetchLoading || positionDeleting}
                              title={
                                positionFetchLoading
                                  ? "Loading positions…"
                                  : !positionPutId
                                    ? "Create position"
                                    : undefined
                              }
                            >
                              <PencilSimple size={20} />
                            </Button>
                            <Button
                              type="button"
                              variant="link"
                              className="profile-field-edit-btn profile-field-delete-btn"
                              aria-label="Delete position"
                              onClick={() => {
                                openDeletePositionModal();
                              }}
                              disabled={!positionPutId || positionFetchLoading || positionDeleting}
                              title={
                                !positionPutId
                                  ? "No position available to delete"
                                  : positionDeleting
                                    ? "Deleting…"
                                    : "Delete position"
                              }
                            >
                              <TrashIcon size={20} />
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    <div
                      className="profile-field-row profile-field-row--clickable profile-contact-row"
                      role="button"
                      tabIndex={0}
                      onClick={() => setContactModalOpen(true)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setContactModalOpen(true);
                        }
                      }}
                      aria-label="Contact us"
                    >
                      <div className="profile-contact-row__left">Send us a message</div>
                      <div className="profile-contact-row__right">Contact</div>
                    </div>
                  </div>
                </Card.Body>
              </Card>

              <Card className="border-0 profile-design-card profile-notif-card">
                <Card.Body className="p-0">
                  <h2 className="profile-notif-card__title">Notification</h2>
                  <ul className="profile-notif-card__list">
                    {limitedNotifications.map((n) => (
                      <li key={n.id} className={n.highlight ? "profile-notif-card__item is-highlight" : "profile-notif-card__item"}>
                        {n.text}
                      </li>
                    ))}
                  </ul>
                </Card.Body>
              </Card>
            </Stack>
          </Col>

          <Col xl={4} md={12} xs={12} className="d-flex flex-column min-h-0">
            <Stack gap={4} className="profile-dashboard-stack profile-dashboard-mid-stack flex-xl-grow-1 d-flex flex-column min-h-0">
              <Card className="border-0 profile-design-card profile-saved-videos-card overflow-hidden flex-shrink-0">
                <Card.Header className="profile-saved-videos-card__head border-0 d-flex align-items-center gap-2">
                  <span className="profile-saved-head-icon" aria-hidden>
                    <YoutubeLogoIcon size={26} weight="regular" className="profile-saved-head-icon__yt" />
                  </span>
                  <Card.Title as="h2" className="h6 mb-0 text-white flex-grow-1 profile-saved-videos-card__title">
                    Saved Videos
                  </Card.Title>
                  <Button
                    type="button"
                    variant="link"
                    className="profile-saved-videos-view-all p-0 text-white text-decoration-none small flex-shrink-0"
                    onClick={() => navigate("/saved-videos")}
                  >
                    View all
                  </Button>
                </Card.Header>
                <Card.Body className="profile-saved-videos-card__body">
                  {savedVideosLoading ? (
                    <p className="profile-saved-videos-status mb-0">Loading saved videos…</p>
                  ) : savedVideosError ? (
                    <p className="profile-saved-videos-status profile-saved-videos-status--error mb-0">{savedVideosError}</p>
                  ) : savedVideos.length === 0 ? (
                    <p className="profile-saved-videos-status mb-0">No saved videos yet.</p>
                  ) : (
                    <div className="profile-saved-videos-list d-flex flex-column">
                      {limitedSavedVideos.map((v) => (
                        <ProfileSavedVideoCard
                          key={v.id}
                          video={v}
                          onOpen={(video) => {
                            const id = video?.id;
                            if (id == null) {
                              navigate("/saved-videos");
                              return;
                            }
                            navigate("/saved-videos", { state: { selectVideoId: id } });
                          }}
                        />
                      ))}
                    </div>
                  )}
                </Card.Body>
              </Card>

              <Card className="border-0 profile-design-card profile-meetings-card d-flex flex-column min-h-0">
                <Card.Body className="profile-meetings-card__body d-flex flex-column flex-grow-1 min-h-0 p-0">
                  <div className="profile-meetings-card__head d-flex align-items-center gap-2">
                    <Card.Title as="h2" className="profile-meetings-card__title h6 mb-0 flex-grow-1">
                      Meetings
                    </Card.Title>
                    <Button
                      type="button"
                      variant="link"
                      className="profile-meetings-view-calendar p-0 text-decoration-none small flex-shrink-0"
                      onClick={() => navigate("/calendar")}
                    >
                      Calendar
                    </Button>
                  </div>
                  <div className="profile-meetings-card__scroll flex-grow-1 min-h-0">
                    {meetingsLoading ? (
                      <p className="profile-meetings-status text-muted small mb-0">Loading meetings…</p>
                    ) : meetingsError ? (
                      <p className="profile-meetings-status profile-meetings-status--error text-danger small mb-0">
                        {meetingsError}
                      </p>
                    ) : profileMeetings.length === 0 ? (
                      <p className="profile-meetings-status text-muted small mb-0">No upcoming meetings.</p>
                    ) : (
                      <ListGroup variant="flush" className="profile-meetings-list">
                        {limitedMeetings.map((m) => {
                          const badge = dateBadgeFromDate(m.startAt);
                          const startParts = formatClockPartsFromDate(m.startAt);
                          const endParts = formatClockPartsFromDate(m.endAt);
                          return (
                            <ListGroup.Item
                              key={m.id}
                              className="profile-meetings-row d-flex gap-3 border-0 bg-transparent rounded-0"
                            >
                              <div className="profile-meeting-date text-center flex-shrink-0">
                                <span className="profile-meeting-month">{badge.month}</span>
                                <span className="profile-meeting-day">{badge.day}</span>
                              </div>
                              <div className="d-flex flex-column gap-2 min-w-0 flex-grow-1 py-0">
                                <span className="profile-meeting-online">Online</span>
                                <span className="profile-meeting-group-line d-flex align-items-center gap-2 min-w-0">
                                  <span
                                    className={`profile-meeting-live-dot flex-shrink-0${m.isLive ? "" : " profile-meeting-live-dot--idle"}`}
                                    aria-hidden
                                  />
                                  <span className="profile-meeting-group-name text-truncate">
                                    {m.meetingTitle || "Meeting"}
                                  </span>
                                </span>
                                <div className="profile-meeting-times" dir="ltr">
                                  <div className="profile-meeting-time-block">
                                    <span className="profile-meeting-time-clock">{startParts.clock}</span>
                                    <span className="profile-meeting-time-meridian">{startParts.meridiem}</span>
                                  </div>
                                  <CaretRight size={14} weight="bold" className="profile-meeting-times__chev flex-shrink-0" aria-hidden />
                                  <div className="profile-meeting-time-block">
                                    <span className="profile-meeting-time-clock">{endParts.clock}</span>
                                    <span className="profile-meeting-time-meridian">{endParts.meridiem}</span>
                                  </div>
                                </div>
                              </div>
                            </ListGroup.Item>
                          );
                        })}
                      </ListGroup>
                    )}
                  </div>
                </Card.Body>
              </Card>
            </Stack>
          </Col>

          <Col xl={4} md={12} xs={12} className="d-flex flex-column min-h-0">
            <Stack gap={4} className="profile-dashboard-stack profile-right-col-stack flex-grow-1 min-h-0">
              <Card className="border-0 profile-design-card flex-shrink-0 profile-files-card">
                <Card.Body className="p-3 profile-files-card__body">
                  <Stack gap={3} className="profile-files-stack">
                    <Card.Title as="h2" className="h6 fw-bold text-dark mb-0">
                      Uploaded Files from chats
                    </Card.Title>
                    <div className="profile-files-scroll">
                      <div className="profile-files-grid">
                        {FILE_GRID_LABELS.map((label, idx) => (
                          <div key={idx} className="profile-files-grid__cell">
                            <Ratio aspectRatio="1x1">
                              <div className="profile-file-cell d-flex align-items-center justify-content-center rounded-4">
                                {label ? <span className="profile-file-label">{label}</span> : null}
                              </div>
                            </Ratio>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Stack>
                </Card.Body>
              </Card>

              {limitedLiveMeetings.length > 0 ? (
                <Card className="border-0 profile-design-card profile-live-meetings-card flex-grow-1 min-h-0">
                  <Card.Body className="p-3 profile-live-meetings-card__body">
                    <div className="profile-live-meetings-scroll">
                      <div className="profile-live-meetings">
                        {limitedLiveMeetings.map((m, idx) => (
                          <div
                            key={m.id ?? idx}
                            className="alert alert-success profile-live-meeting-alert"
                            role="button"
                            tabIndex={0}
                            onClick={() => handleJoinLiveMeeting(m.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                handleJoinLiveMeeting(m.id);
                              }
                            }}
                          >
                            <div className="d-flex align-items-start justify-content-between gap-3">
                              <div className="min-w-0">
                                <div className="fw-bold">Live meeting now</div>
                                <div className="small text-muted text-truncate">
                                  Meeting: {m.title || m.meetingTitle || "Meeting"}
                                </div>
                                <div className="small text-muted text-truncate">
                                  Group: {m.groupName || (m.groupId ? (groupsMap[String(m.groupId)] || "—") : "—")}
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="success"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleJoinLiveMeeting(m.id);
                                }}
                                className="flex-shrink-0"
                              >
                                Join
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              ) : null}
            </Stack>
          </Col>
        </Row>
      </Container>

      <ConfirmDeleteModal
        show={showDeletePositionModal}
        onClose={closeDeletePositionModal}
        onConfirm={confirmDeletePosition}
        title="Delete position"
        message="Are you sure you want to delete this position? This cannot be undone."
        confirming={positionDeleting}
        confirmLabel="Delete"
      />

      {contactModalOpen ? (
        <div
          className="profile-contact-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Contact us"
          onClick={() => setContactModalOpen(false)}
        >
          <div className="profile-contact-modal" onClick={(e) => e.stopPropagation()}>
            <div className="profile-contact-modal__head">
              <h2 className="profile-contact-modal__title">Contact us</h2>
              <button
                type="button"
                className="profile-contact-modal__close"
                onClick={() => setContactModalOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <ContactForm
              mode="profile"
              initialFullName={contactPrefillName}
              initialEmail={contactPrefillEmail}
              onSuccess={() => setContactModalOpen(false)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
