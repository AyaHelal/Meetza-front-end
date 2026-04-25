import React, { useMemo } from "react";
import { Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { useHorizontalCardSlider, useHomeUpcomingMeetings } from "../hooks";
import { CalendarBlank } from "@phosphor-icons/react";
import { EmptyState } from "../../../components/shared/EmptyState";
import HomeMeetingCard from "./HomeMeetingCard";

const SLIDE_SELECTOR = ".home-meetings-slider-slide";

/**
 * Upcoming meetings from GET /home/upcoming-meetings; horizontal row + scroll-by-nav.
 */
function HomeUpcomingMeetingsCarousel({ meetings: meetingsProp = null, limit = 10, searchTerm = "" }) {
  const navigate = useNavigate();
  const shouldFetch = !Array.isArray(meetingsProp);
  const { meetings: apiMeetings, loading, error } = useHomeUpcomingMeetings({
    enabled: shouldFetch,
    limit,
    search: searchTerm,
    toastOnError: true,
  });

  const meetings = useMemo(() => {
    if (Array.isArray(meetingsProp)) return meetingsProp;
    return apiMeetings;
  }, [meetingsProp, apiMeetings]);

  const { trackRef, canPrev, canNext, hasOverflow, updateScrollState, scrollByDirection } =
    useHorizontalCardSlider(SLIDE_SELECTOR, meetings);

  return (
    <section className="home-section home-meetings-section">
      <div className="home-section-header">
        <h2 className="home-section-title">Upcoming Meetings</h2>
      </div>
      <div className="home-carousel-wrap position-relative home-bootstrap-carousel home-meetings-slider-wrap home-meetings-carousel">
        <button
          type="button"
          className="carousel-control-prev"
          aria-label="Scroll meetings left"
          disabled={!canPrev}
          onClick={() => scrollByDirection(-1)}
        >
          <span className="carousel-control-prev-icon" aria-hidden />
        </button>
        <div
          ref={trackRef}
          className="home-meetings-slider-track"
          role="region"
          aria-label="Upcoming meetings"
          onScroll={updateScrollState}
        >
          {shouldFetch && loading ? (
            <div className="home-meetings-slider-slide">
              <div className="home-meeting-card h-100 d-flex flex-column justify-content-center p-3">
                <p className="text-muted small mb-0">Loading upcoming meetings…</p>
              </div>
            </div>
          ) : shouldFetch && error ? (
            <div className="home-meetings-slider-slide w-100">
              <div className="home-meeting-card border-0 shadow-none bg-transparent h-100 p-3">
                <p className="text-danger small mb-0">{error}</p>
              </div>
            </div>
          ) : meetings.length === 0 ? (
            <div className="home-meetings-slider-slide w-100">
              <EmptyState
                icon={CalendarBlank}
                title="No upcoming meetings"
                description="Your schedule is clear. New meetings will appear here once scheduled."
                iconColor="#0d6efd"
                iconBg="#eef2ff"
              />
            </div>
          ) : (
            meetings.map((m, idx) => (
              <div key={m.id || `upcoming-${idx}`} className="home-meetings-slider-slide">
                <HomeMeetingCard meeting={m} />
              </div>
            ))
          )}
        </div>
        <button
          type="button"
          className="carousel-control-next"
          aria-label="Scroll meetings right"
          disabled={!canNext}
          onClick={() => scrollByDirection(1)}
        >
          <span className="carousel-control-next-icon" aria-hidden />
        </button>
      </div>
      {hasOverflow && (
        <div className="home-section-footer">
          <Button
            variant="link"
            className="home-see-more text-decoration-none p-0"
            onClick={() => navigate("/calendar")}
          >
            See more
          </Button>
        </div>
      )}
    </section>
  );
}

export default HomeUpcomingMeetingsCarousel;
