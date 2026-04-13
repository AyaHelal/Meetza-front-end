import React, { useCallback, useContext, useMemo, useState } from "react";
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
  YoutubeLogo as YoutubeLogoIcon,
  CaretRight,
} from "@phosphor-icons/react";
import { AuthContext } from "../../context/AuthContext";
import UserPhoto from "../../components/UserPhoto/UserPhoto";
import useSavedVideos from "../SavedVideos/hooks/useSavedVideos";
import useProfileMeetings from "./hooks/useProfileMeetings";
import { DEFAULT_THUMB } from "../SavedVideos/components/constants";
import { smartToast } from "../../API/toastManager";
import { extractUserFromToken } from "../../utils/token";
import { patchUser } from "./services/profileUserService";
import "./ProfilePage.css";

const PROFILE_PHOTO_FILE_INPUT_ID = "profile-user-photo-input";

const PLACEHOLDER_NOTIFICATIONS = [
  { id: "1", text: "Dr Dawlat replied to your comment", highlight: false },
  { id: "2", text: "Dr Dawlat uploaded a new video", highlight: true },
  { id: "3", text: "Meeting reminder in 30 minutes", highlight: false },
];

const FILE_GRID_LABELS = ["PDF", "PHOTO", "", "PDF", "", "PHOTO", "", "PDF", "PHOTO"];

function formatSavedVideoDuration(value) {
  if (value == null || value === "") return "—";
  if (typeof value === "string" && value.trim() !== "" && !/^\d+$/.test(value.trim())) {
    return value.trim();
  }
  const sec = typeof value === "number" ? Math.floor(value) : parseInt(String(value).trim(), 10);
  if (Number.isNaN(sec) || sec < 0) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function ProfileSavedVideoCard({ video, onOpen }) {
  const title = video?.title || "Video";
  const thumb = video?.thumbnailUrl || DEFAULT_THUMB;
  const durationLabel = formatSavedVideoDuration(video?.duration);

  return (
    <div className="profile-saved-videos-tile">
      <button
        type="button"
        className="profile-saved-video-card profile-saved-video-card--live w-100 text-start border-0 p-0 bg-transparent"
        aria-label={`Open saved video: ${title}`}
        onClick={() => onOpen?.(video)}
      >
        <Ratio aspectRatio="16x9">
          <div className="profile-saved-video-frame overflow-hidden">
            <img
              src={thumb}
              alt=""
              className="profile-saved-video-thumb position-absolute top-0 start-0 w-100 h-100 object-fit-cover"
            />
            <div className="profile-saved-pills" dir="ltr">
              <span className="profile-saved-pill profile-saved-pill--title text-truncate">{title}</span>
              <span className="profile-saved-pill profile-saved-pill--dur">{durationLabel}</span>
            </div>
          </div>
        </Ratio>
      </button>
    </div>
  );
}

function firstName(displayName) {
  if (!displayName || typeof displayName !== "string") return "there";
  const t = displayName.trim();
  return t.split(/\s+/)[0] || "there";
}

function dateBadgeFromDate(d) {
  if (!d || Number.isNaN(d.getTime())) return { month: "—", day: "—" };
  return {
    month: d.toLocaleString(undefined, { month: "short" }),
    day: String(d.getDate()),
  };
}

function formatClockPartsFromDate(d) {
  if (!d || Number.isNaN(d.getTime())) return { clock: "—", meridiem: "" };
  const hours24 = d.getHours();
  const minutes = d.getMinutes();
  const meridiem = hours24 >= 12 ? "PM" : "AM";
  let hours12 = hours24 % 12;
  if (hours12 === 0) hours12 = 12;
  return { clock: `${hours12}:${String(minutes).padStart(2, "0")}`, meridiem };
}

/** Position row: only real position fields from API — not role. */
function positionDisplayFromUser(user) {
  if (!user) return "No positions available";
  const raw = user.position ?? user.position_title ?? user.positionTitle;
  if (raw != null && typeof raw === "object" && raw.title != null) {
    const t = String(raw.title).trim();
    if (t) return t;
  }
  if (raw != null && String(raw).trim() !== "") return String(raw).trim();
  return "No positions available";
}

export default function ProfilePage() {
  const { user, loginUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const { savedVideos, loading: savedVideosLoading, error: savedVideosError } = useSavedVideos(null);
  const { meetings: profileMeetings, loading: meetingsLoading, error: meetingsError } = useProfileMeetings();

  const [nameEditing, setNameEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [nameSaving, setNameSaving] = useState(false);

  const displayName = user?.name || user?.full_name || user?.username || user?.email || "Member";
  const email = user?.email || "—";
  const username = user?.username || user?.name || displayName;
  const positionLabel = positionDisplayFromUser(user);

  const userId = useMemo(() => {
    const fromUser = user?.id ?? user?.user_id ?? user?._id ?? user?.uuid;
    if (fromUser != null && String(fromUser).trim() !== "") return String(fromUser).trim();
    const fromToken = extractUserFromToken()?.id;
    if (fromToken != null && String(fromToken).trim() !== "") return String(fromToken).trim();
    return null;
  }, [user]);

  const startNameEdit = useCallback(() => {
    const initial = (user?.name || user?.full_name || user?.username || "").trim();
    setNameDraft(initial);
    setNameEditing(true);
  }, [user?.name, user?.full_name, user?.username]);

  const cancelNameEdit = useCallback(() => {
    if (nameSaving) return;
    setNameEditing(false);
  }, [nameSaving]);

  const persistUser = useCallback(
    (patch) => {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const rememberMe = localStorage.getItem("remember") === "true";
      loginUser({ ...user, ...patch }, token, rememberMe);
    },
    [user, loginUser]
  );

  const handleSaveName = useCallback(async () => {
    const trimmed = nameDraft.trim();
    if (!trimmed) {
      smartToast.error("Please enter a name.");
      return;
    }
    if (!userId) {
      smartToast.error("User ID not found.");
      return;
    }
    setNameSaving(true);
    try {
      const { patchPayload } = await patchUser(userId, { name: trimmed });
      persistUser({
        ...(patchPayload && typeof patchPayload === "object" ? patchPayload : {}),
        name: patchPayload?.name ?? trimmed,
        full_name: patchPayload?.full_name ?? patchPayload?.name ?? trimmed,
      });
      setNameEditing(false);
      smartToast.success("Name updated");
    } catch (err) {
      smartToast.error(err?.response?.data?.message || err?.message || "Failed to update name");
    } finally {
      setNameSaving(false);
    }
  }, [nameDraft, userId, persistUser]);

  const triggerPhotoPicker = useCallback(() => {
    const el = document.getElementById(PROFILE_PHOTO_FILE_INPUT_ID);
    if (el && typeof el.click === "function") el.click();
    else smartToast.error("Could not open file picker.");
  }, []);

  const onEditField = (label) => {
    smartToast.info(`${label} editing will be available soon.`);
  };

  return (
    <div className="profile-page d-flex flex-column flex-grow-1 min-vh-0">
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
                <Card.Body className="text-center pt-4 pb-4 px-3">
                  <div className="profile-avatar-block mx-auto mb-4">
                    <UserPhoto user={user} size="large" variant="default" fileInputId={PROFILE_PHOTO_FILE_INPUT_ID} />
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
                    <div className="profile-field-row">
                      <div className="profile-field-main">
                        <span className="profile-field-label">Position</span>
                        <div className="profile-field-value">{positionLabel}</div>
                      </div>
                      <Button
                        type="button"
                        variant="link"
                        className="profile-field-edit-btn flex-shrink-0"
                        aria-label="Edit position"
                        onClick={() => onEditField("Position")}
                      >
                        <PencilSimple size={20} />
                      </Button>
                    </div>
                  </div>
                </Card.Body>
              </Card>

              <Card className="border-0 profile-design-card profile-notif-card">
                <Card.Body className="p-0">
                  <h2 className="profile-notif-card__title">Notification</h2>
                  <ul className="profile-notif-card__list">
                    {PLACEHOLDER_NOTIFICATIONS.map((n) => (
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
                      {savedVideos.map((v) => (
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
                        {profileMeetings.map((m) => {
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
            <Stack gap={4} className="profile-dashboard-stack profile-right-col-stack">
              <Card className="border-0 profile-design-card">
                <Card.Body className="p-4">
                  <Stack gap={4}>
                    <Card.Title as="h2" className="h6 fw-bold text-dark mb-0">
                      Uploaded Files from chats
                    </Card.Title>
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
                  </Stack>
                </Card.Body>
              </Card>

              <Card className="border-0 profile-design-card profile-ongoing-card">
                <Card.Body className="p-4">
                  <Card.Title as="h2" className="profile-ongoing-card__title h6 text-dark mb-3">
                    Ongoing meeting
                  </Card.Title>
                  <div className="profile-ongoing-shell">
                    <div className="profile-ongoing-preview">
                      <img
                        src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&auto=format&fit=crop&q=60"
                        alt=""
                        className="profile-ongoing-preview__img"
                      />
                    </div>
                    <Button
                      type="button"
                      className="w-100 profile-ongoing-cta profile-ongoing-cta--static"
                      onClick={(e) => {
                        e.preventDefault();
                      }}
                    >
                      Click to open full video
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Stack>
          </Col>
        </Row>
      </Container>
    </div>
  );
}
