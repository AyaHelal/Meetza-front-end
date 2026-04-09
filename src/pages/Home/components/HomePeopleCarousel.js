import React from "react";
import { Button } from "react-bootstrap";
import { useHorizontalCardSlider } from "../hooks";
import { DEFAULT_HOME_PEOPLE } from "../services";
import HomePeopleCard from "./HomePeopleCard";

const SLIDE_SELECTOR = ".home-people-slider-slide";

export default function HomePeopleCarousel({ people = DEFAULT_HOME_PEOPLE }) {
  const { trackRef, canPrev, canNext, updateScrollState, scrollByDirection } =
    useHorizontalCardSlider(SLIDE_SELECTOR, people);

  return (
    <section className="home-section home-people-section">
      <div className="home-section-header">
        <h2 className="home-section-title">People</h2>
      </div>

      <div className="home-carousel-wrap position-relative home-bootstrap-carousel home-people-slider-wrap home-people-carousel">
        <button
          type="button"
          className="carousel-control-prev"
          aria-label="Scroll people left"
          disabled={!canPrev}
          onClick={() => scrollByDirection(-1)}
        >
          <span className="carousel-control-prev-icon" aria-hidden />
        </button>

        <div
          ref={trackRef}
          className="home-people-slider-track"
          role="region"
          aria-label="People"
          onScroll={updateScrollState}
        >
          {people.map((p) => (
            <div key={p.id} className="home-people-slider-slide">
              <HomePeopleCard person={p} />
            </div>
          ))}
        </div>

        <button
          type="button"
          className="carousel-control-next"
          aria-label="Scroll people right"
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

