import React, { useMemo } from "react";
import { useHomeSavedVideos } from "../hooks";
import HomeVideosCarousel from "./HomeVideosCarousel";

export default function HomeSavedVideosCarousel({ videos = null, limit = 10 }) {
  const { videos: apiVideos, loading, error } = useHomeSavedVideos({
    enabled: !Array.isArray(videos),
    limit,
    toastOnError: true,
  });

  const effectiveVideos = useMemo(() => {
    if (Array.isArray(videos)) return videos;
    if (apiVideos.length > 0) return apiVideos;
    return [];
  }, [videos, apiVideos]);

  return (
    <HomeVideosCarousel
      videos={effectiveVideos}
      title="Saved Videos"
      ariaLabel="Saved videos"
      seeMoreTo="/saved-videos"
      fetchMostInterested={false}
      loading={loading}
      error={error}
      emptyMessage="No saved videos"
    />
  );
}

