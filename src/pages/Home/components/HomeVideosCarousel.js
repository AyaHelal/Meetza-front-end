import React from "react";
import { Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { useHorizontalCardSlider } from "../hooks";
import { DEFAULT_HOME_VIDEOS } from "../services";
import HomeVideoCard from "./HomeVideoCard";

const SLIDE_SELECTOR = ".home-videos-slider-slide";

export default function HomeVideosCarousel({
  videos = DEFAULT_HOME_VIDEOS,
  title = "Videos",
  ariaLabel = "Videos",
  seeMoreTo = "/video",
}) {
  const navigate = useNavigate();
  const { trackRef, canPrev, canNext, updateScrollState, scrollByDirection } =
    useHorizontalCardSlider(SLIDE_SELECTOR, videos);

  return (
    <section className="home-section home-videos-section">
      <div className="home-section-header">
        <h2 className="home-section-title">{title}</h2>
      </div>

      <div className="home-carousel-wrap position-relative home-bootstrap-carousel home-videos-slider-wrap home-videos-carousel">
        <button
          type="button"
          className="carousel-control-prev"
          aria-label="Scroll videos left"
          disabled={!canPrev}
          onClick={() => scrollByDirection(-1)}
        >
          <span className="carousel-control-prev-icon" aria-hidden />
        </button>

        <div
          ref={trackRef}
          className="home-videos-slider-track"
          role="region"
          aria-label={ariaLabel}
          onScroll={updateScrollState}
        >
          {videos.map((v) => (
            <div key={v.id} className="home-videos-slider-slide">
              <HomeVideoCard video={v} />
            </div>
          ))}
        </div>

        <button
          type="button"
          className="carousel-control-next"
          aria-label="Scroll videos right"
          disabled={!canNext}
          onClick={() => scrollByDirection(1)}
        >
          <span className="carousel-control-next-icon" aria-hidden />
        </button>
      </div>

      <div className="home-section-footer">
        <Button
          variant="link"
          className="home-see-more text-decoration-none p-0"
          onClick={() => navigate(seeMoreTo)}
        >
          See more
        </Button>
      </div>
    </section>
  );
}

