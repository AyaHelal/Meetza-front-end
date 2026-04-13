import React, { useMemo } from "react";
import { Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { useHorizontalCardSlider, useMostInterestedVideos } from "../hooks";
import { DEFAULT_HOME_VIDEOS } from "../services";
import HomeVideoCard from "./HomeVideoCard";

const SLIDE_SELECTOR = ".home-videos-slider-slide";

export default function HomeVideosCarousel({
  videos = null,
  title = "Videos",
  ariaLabel = "Videos",
  seeMoreTo = "/video",
  fetchMostInterested = true,
  loading: loadingOverride,
  error: errorOverride,
}) {
  const navigate = useNavigate();
  const shouldFetchMostInterested = fetchMostInterested && !Array.isArray(videos);
  const { videos: apiVideos, loading: hookLoading, error: hookError } = useMostInterestedVideos({
    enabled: shouldFetchMostInterested,
    toastOnError: true,
  });
  const loading = loadingOverride ?? hookLoading;
  const error = errorOverride ?? hookError;

  const effectiveVideos = useMemo(() => {
    if (Array.isArray(videos)) return videos;
    if (apiVideos.length > 0) return apiVideos;
    return DEFAULT_HOME_VIDEOS;
  }, [videos, apiVideos]);

  const { trackRef, canPrev, canNext, updateScrollState, scrollByDirection } =
    useHorizontalCardSlider(SLIDE_SELECTOR, effectiveVideos);

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
          {loading ? (
            <div className="home-videos-slider-slide">
              <div className="home-video-card" aria-label="Loading videos">
                <div className="home-video-card-body">
                  <div className="text-muted small">Loading videos…</div>
                </div>
              </div>
            </div>
          ) : error ? (
            <div className="home-videos-slider-slide">
              <div className="home-video-card" aria-label="Videos error">
                <div className="home-video-card-body">
                  <div className="text-danger small">{error}</div>
                </div>
              </div>
            </div>
          ) : (
            effectiveVideos.map((v) => (
              <div key={v.id} className="home-videos-slider-slide">
                <HomeVideoCard video={v} />
              </div>
            ))
          )}
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

