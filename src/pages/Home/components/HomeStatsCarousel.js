import React from "react";
import { Button } from "react-bootstrap";
import { useHorizontalCardSlider } from "../hooks";
import { DEFAULT_HOME_STAT_ITEMS } from "../services";
import HomeStatCard from "./HomeStatCard";

const SLIDE_SELECTOR = ".home-stats-slider-slide";

/**
 * Stats: horizontal row of cards + scroll-by-nav (not paged carousel slides)
 */
function HomeStatsCarousel({ items = DEFAULT_HOME_STAT_ITEMS }) {
  const { trackRef, canPrev, canNext, updateScrollState, scrollByDirection } =
    useHorizontalCardSlider(SLIDE_SELECTOR, items);

  return (
    <section className="home-section home-stats-section">
      <div className="home-section-header">
        <h2 className="home-section-title visually-hidden">Quick stats</h2>
      </div>
      <div className="home-carousel-wrap position-relative home-bootstrap-carousel home-stats-slider-wrap home-stats-carousel">
        <button
          type="button"
          className="carousel-control-prev"
          aria-label="Scroll stats left"
          disabled={!canPrev}
          onClick={() => scrollByDirection(-1)}
        >
          <span className="carousel-control-prev-icon" aria-hidden />
        </button>
        <div
          ref={trackRef}
          className="home-stats-slider-track"
          role="region"
          aria-label="Statistics"
          onScroll={updateScrollState}
        >
          {items.map((item) => (
            <div key={item.key} className="home-stats-slider-slide">
              <HomeStatCard item={item} />
            </div>
          ))}
        </div>
        <button
          type="button"
          className="carousel-control-next"
          aria-label="Scroll stats right"
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

export default HomeStatsCarousel;
