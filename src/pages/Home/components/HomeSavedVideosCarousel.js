import React from "react";
import { DEFAULT_HOME_SAVED_VIDEOS } from "../services";
import HomeVideosCarousel from "./HomeVideosCarousel";

export default function HomeSavedVideosCarousel({ videos = DEFAULT_HOME_SAVED_VIDEOS }) {
  return (
    <HomeVideosCarousel
      videos={videos}
      title="Saved Videos"
      ariaLabel="Saved videos"
      seeMoreTo="/saved-videos"
    />
  );
}

