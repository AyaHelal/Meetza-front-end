import React from "react";
import { Container } from "react-bootstrap";
import HomeHeroBanner from "./components/HomeHeroBanner";
import HomeStatsCarousel from "./components/HomeStatsCarousel";
import HomeUpcomingMeetingsCarousel from "./components/HomeUpcomingMeetingsCarousel";
import "./HomePage.css";

/**
 * Dashboard home: Bootstrap layout shell + same visual tokens in HomePage.css
 */
export default function HomePage() {
  return (
    <div className="home-dashboard-page d-flex flex-column flex-grow-1 min-vh-0">
      <Container fluid="xl" className="home-dashboard-inner">
        <HomeHeroBanner />
        <HomeStatsCarousel />
        <div className="home-section-divider" role="presentation" />
        <HomeUpcomingMeetingsCarousel />
        <div className="home-section-divider" role="presentation" />
        <div className="home-dashboard-placeholder" aria-hidden="true" />
      </Container>
    </div>
  );
}
