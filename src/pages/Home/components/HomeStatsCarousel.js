import React, { useContext, useMemo } from "react";
import { AuthContext } from "../../../context/AuthContext";
import { useHorizontalCardSlider, useHomeStats } from "../hooks";
import { buildHomeStatItems, getMeetingsStatLinkForRole } from "../services";
import HomeStatCard from "./HomeStatCard";

const SLIDE_SELECTOR = ".home-stats-slider-slide";

/**
 * Stats: horizontal row of cards + scroll-by-nav (not paged carousel slides)
 * Counts from GET /home/stats; arrow navigates to the related app area.
 */
function HomeStatsCarousel({ items: itemsProp = null }) {
  const { user } = useContext(AuthContext);
  const { data, loading, error } = useHomeStats({ enabled: itemsProp == null, toastOnError: true });

  const items = useMemo(() => {
    if (Array.isArray(itemsProp)) return itemsProp;

    const meetingsTo = getMeetingsStatLinkForRole(user?.role);
    const withMeetingsLink = (list) =>
      list.map((it) => (it.key === "meetings" ? { ...it, to: meetingsTo } : it));

    if (loading && data == null && !error) {
      return withMeetingsLink(buildHomeStatItems({}).map((x) => ({ ...x, value: "—" })));
    }
    return withMeetingsLink(buildHomeStatItems(data ?? {}));
  }, [itemsProp, data, loading, error, user?.role]);

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
    </section>
  );
}

export default HomeStatsCarousel;
