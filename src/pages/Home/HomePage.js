import React, { useState, useEffect } from "react";
import { Container } from "react-bootstrap";
import HomeHeroBanner from "./components/HomeHeroBanner";
import HomeStatsCarousel from "./components/HomeStatsCarousel";
import HomeUpcomingMeetingsCarousel from "./components/HomeUpcomingMeetingsCarousel";
import HomePeopleCarousel from "./components/HomePeopleCarousel";
import HomeVideosCarousel from "./components/HomeVideosCarousel";
import HomeSavedVideosCarousel from "./components/HomeSavedVideosCarousel";
import "./HomePage.css";

/**
 * Dashboard home: Bootstrap layout shell + same visual tokens in HomePage.css
 */
export default function HomePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  return (
    <div className="home-dashboard-page d-flex flex-column flex-grow-1 min-vh-0">
      <Container fluid="xl" className="home-dashboard-inner">
        <HomeHeroBanner searchTerm={searchTerm} onSearchChange={setSearchTerm} />
        <HomeStatsCarousel />
        <div className="home-section-divider" role="presentation" />
        <HomeUpcomingMeetingsCarousel searchTerm={debouncedSearchTerm} />
        <div className="home-section-divider" role="presentation" />
        <HomeVideosCarousel searchTerm={debouncedSearchTerm} />
        <div className="home-section-divider" role="presentation" />
        <HomePeopleCarousel searchTerm={debouncedSearchTerm} />
        <div className="home-section-divider" role="presentation" />
        <HomeSavedVideosCarousel searchTerm={debouncedSearchTerm} />
        <div className="home-section-divider" role="presentation" />
      </Container>
    </div>
  );
}
