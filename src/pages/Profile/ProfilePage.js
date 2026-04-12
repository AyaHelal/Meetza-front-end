import React, { useContext, useMemo } from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
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
import { DEFAULT_UPCOMING_MEETINGS } from "../Home/services/homeDashboardService";
import { smartToast } from "../../API/toastManager";
import "./ProfilePage.css";

const PLACEHOLDER_NOTIFICATIONS = [
  { id: "1", text: "Dr Dawlat replied to your comment", highlight: false },
  { id: "2", text: "Dr Dawlat uploaded a new video", highlight: true },
  { id: "3", text: "Meeting reminder in 30 minutes", highlight: false },
];

const FILE_GRID_LABELS = ["PDF", "PHOTO", "", "PDF", "", "PHOTO", "", "PDF", "PHOTO"];

const MEETING_DATE_BADGES = [
  { month: "Sep", day: "25" },
  { month: "Sep", day: "26" },
  { month: "Oct", day: "02" },
  { month: "Oct", day: "08" },
];

/** Decorative cards only — profile Saved Videos section (not linked, not from API) */
const STATIC_SAVED_VIDEO_THUMB =
  "https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=640&auto=format&fit=crop&q=60";

const STATIC_SAVED_VIDEO_DESIGN_IDS = ["d1", "d2", "d3", "d4", "d5", "d6"];

/** Static copy for Saved Videos design mock only (not real data) */
const STATIC_SAVED_VIDEO_TITLE_LABEL = "Video Title";
const STATIC_SAVED_VIDEO_DURATION_LABEL = "3:22";

function ProfileSavedVideoStaticCard() {
  return (
    <div className="profile-saved-videos-tile profile-saved-videos-tile--static">
      <div className="profile-saved-video-card profile-saved-video-card--static" aria-hidden="true">
        <Ratio aspectRatio="16x9">
          <div className="profile-saved-video-frame overflow-hidden">
            <img
              src={STATIC_SAVED_VIDEO_THUMB}
              alt=""
              className="profile-saved-video-thumb position-absolute top-0 start-0 w-100 h-100 object-fit-cover"
            />
            <div className="profile-saved-pills" dir="ltr">
              <span className="profile-saved-pill profile-saved-pill--title text-truncate">{STATIC_SAVED_VIDEO_TITLE_LABEL}</span>
              <span className="profile-saved-pill profile-saved-pill--dur">{STATIC_SAVED_VIDEO_DURATION_LABEL}</span>
            </div>
          </div>
        </Ratio>
      </div>
    </div>
  );
}

function firstName(displayName) {
  if (!displayName || typeof displayName !== "string") return "there";
  const t = displayName.trim();
  return t.split(/\s+/)[0] || "there";
}

/** "Nov 28 2026, 3:30 pm" → { clock: "3:30", meridiem: "PM" } for Frame-style time row */
function parseMeetingTimeParts(meetingField) {
  const fallback = { clock: "8:25", meridiem: "AM" };
  if (!meetingField || typeof meetingField !== "string") return fallback;
  const tail = meetingField.split(",").map((s) => s.trim()).pop() || meetingField;
  const m = tail.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (!m) return fallback;
  return { clock: `${parseInt(m[1], 10)}:${m[2]}`, meridiem: (m[3] || "AM").toUpperCase() };
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
  const { user } = useContext(AuthContext);

  const displayName = user?.name || user?.full_name || user?.username || user?.email || "Member";
  const email = user?.email || "—";
  const username = user?.username || user?.name || displayName;
  const positionLabel = positionDisplayFromUser(user);

  const meetingsPreview = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => {
        const m = DEFAULT_UPCOMING_MEETINGS[i % DEFAULT_UPCOMING_MEETINGS.length];
        return { ...m, id: `${m.id}-${i}` };
      }),
    []
  );

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
                    <UserPhoto user={user} size="large" variant="default" />
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      className="profile-avatar-edit rounded-circle p-0 d-inline-flex align-items-center justify-content-center border border-2 border-white shadow-sm"
                      aria-label="Change profile photo"
                      onClick={() => onEditField("Photo")}
                    >
                      <PencilSimple size={16} weight="bold" />
                    </Button>
                  </div>
                  <div className="text-start px-1">
                    <div className="profile-field-row">
                      <div className="profile-field-main">
                        <span className="profile-field-label">Username</span>
                        <div className="profile-field-value">{username}</div>
                      </div>
                      <Button
                        type="button"
                        variant="link"
                        className="profile-field-edit-btn flex-shrink-0"
                        aria-label="Edit username"
                        onClick={() => onEditField("Username")}
                      >
                        <PencilSimple size={20} />
                      </Button>
                    </div>
                    <div className="profile-field-row">
                      <div className="profile-field-main">
                        <span className="profile-field-label">Email</span>
                        <div className="profile-field-value text-break">{email}</div>
                      </div>
                      <Button
                        type="button"
                        variant="link"
                        className="profile-field-edit-btn flex-shrink-0"
                        aria-label="Edit email"
                        onClick={() => onEditField("Email")}
                      >
                        <PencilSimple size={20} />
                      </Button>
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
                </Card.Header>
                <Card.Body className="profile-saved-videos-card__body">
                  <div className="profile-saved-videos-list profile-saved-videos-list--static d-flex flex-column">
                    {STATIC_SAVED_VIDEO_DESIGN_IDS.map((id) => (
                      <ProfileSavedVideoStaticCard key={id} />
                    ))}
                  </div>
                </Card.Body>
              </Card>

              <Card className="border-0 profile-design-card profile-meetings-card d-flex flex-column min-h-0">
                <Card.Body className="profile-meetings-card__body d-flex flex-column flex-grow-1 min-h-0 p-0">
                  <Card.Title as="h2" className="profile-meetings-card__title h6 mb-0">
                    Meetings
                  </Card.Title>
                  <div className="profile-meetings-card__scroll flex-grow-1 min-h-0">
                    <ListGroup variant="flush" className="profile-meetings-list">
                      {meetingsPreview.map((m, i) => {
                        const badge = MEETING_DATE_BADGES[i % MEETING_DATE_BADGES.length];
                        const startParts = parseMeetingTimeParts(m.start);
                        const endParts = parseMeetingTimeParts(m.end);
                        return (
                          <ListGroup.Item
                            key={m.id || i}
                            className="profile-meetings-row d-flex gap-3 border-0 bg-transparent rounded-0"
                          >
                            <div className="profile-meeting-date text-center flex-shrink-0">
                              <span className="profile-meeting-month">{badge.month}</span>
                              <span className="profile-meeting-day">{badge.day}</span>
                            </div>
                            <div className="d-flex flex-column gap-2 min-w-0 flex-grow-1 py-0">
                              <span className="profile-meeting-online">Online</span>
                              <span className="profile-meeting-group-line d-flex align-items-center gap-2 min-w-0">
                                <span className="profile-meeting-live-dot flex-shrink-0" aria-hidden />
                                <span className="profile-meeting-group-name text-truncate">
                                  {m.groupLabel || "Group Meeting"}
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
