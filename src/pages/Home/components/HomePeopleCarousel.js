import React, { useMemo } from "react";
import { useHomeLeaders, useHorizontalCardSlider } from "../hooks";
import HomePeopleCard from "./HomePeopleCard";

const SLIDE_SELECTOR = ".home-people-slider-slide";

export default function HomePeopleCarousel({ people = null }) {
  const { people: apiPeople, loading, error } = useHomeLeaders({
    enabled: !Array.isArray(people),
    toastOnError: true,
  });

  const effectivePeople = useMemo(() => {
    if (Array.isArray(people)) return people;
    if (apiPeople.length > 0) return apiPeople;
    return [];
  }, [people, apiPeople]);

  const { trackRef, canPrev, canNext, updateScrollState, scrollByDirection } =
    useHorizontalCardSlider(SLIDE_SELECTOR, effectivePeople);

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
          {loading ? (
            <div className="home-people-slider-slide">
              <div className="home-people-card" aria-label="Loading people">
                <div className="text-muted small">Loading people…</div>
              </div>
            </div>
          ) : error ? (
            <div className="home-people-slider-slide">
              <div className="home-people-card" aria-label="People error">
                <div className="text-danger small">{error}</div>
              </div>
            </div>
          ) : effectivePeople.length === 0 ? (
            <div className="home-people-slider-slide w-100">
              <div className="home-people-card border-0 shadow-none bg-transparent" aria-label="No people">
                <p className="text-muted mb-0 small">No people</p>
              </div>
            </div>
          ) : (
            effectivePeople.map((p) => (
              <div key={p.id} className="home-people-slider-slide">
                <HomePeopleCard person={p} />
              </div>
            ))
          )}
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
    </section>
  );
}

