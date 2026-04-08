import React from "react";
import { Button } from "react-bootstrap";
import { useHorizontalCardSlider } from "../hooks";
import { DEFAULT_UPCOMING_MEETINGS } from "../services";
import HomeMeetingCard from "./HomeMeetingCard";

const SLIDE_SELECTOR = ".home-meetings-slider-slide";

/**
 * Upcoming meetings: horizontal row + scroll-by-nav (same pattern as stats slider)
 */
function HomeUpcomingMeetingsCarousel({ meetings = DEFAULT_UPCOMING_MEETINGS }) {
  const { trackRef, canPrev, canNext, updateScrollState, scrollByDirection } =
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
          {meetings.map((m) => (
            <div key={m.id} className="home-meetings-slider-slide">
              <HomeMeetingCard meeting={m} />
            </div>
          ))}
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
      <div className="home-section-footer">
        <Button variant="link" className="home-see-more text-decoration-none p-0">
          See more
        </Button>
      </div>
    </section>
  );
}

export default HomeUpcomingMeetingsCarousel;
