import React from "react";
import { Card, Col, Form, InputGroup, Row } from "react-bootstrap";
import { MagnifyingGlass } from "@phosphor-icons/react";
// import Lottie from "lottie-react";
// import heroAnimation from "../../../lottie/SeoIsometric.json";

/**
 * Hero: Bootstrap Card + image + overlay; look kept via home-hero-* classes + CSS
 */
function HomeHeroBanner() {
  return (
    <Card className="home-hero-banner border-0 shadow rounded-4 overflow-hidden">
      <div className="home-hero-banner-media position-relative">
        <div className="home-hero-lottie home-hero-lottie--right" aria-hidden="true">
          {/* Temporarily disabled SeoIsometric animation due to corrupted data */}
          {/* TODO: Replace with working Lottie animation or static image */}
          <div className="home-hero-lottie-placeholder" style={{
            width: '200px',
            height: '200px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '24px',
            fontWeight: 'bold'
          }}>
            Meetza
          </div>
        </div>

        <Card.ImgOverlay className="home-hero-inner text-white">
          <div className="home-hero-content text-center">
            <h1 className="home-hero-title mb-2">Hello, again Welcome back</h1>
            <p className="home-hero-subtitle mb-3 mb-md-4">This is what we have for you today</p>
            <InputGroup className="home-hero-search-wrap">
              <InputGroup.Text className="border-0 bg-transparent px-0 pe-1">
                <MagnifyingGlass size={22} className="home-hero-search-icon" weight="bold" aria-hidden />
              </InputGroup.Text>
              <Form.Control
                type="search"
                className="home-hero-search border-0 shadow-none"
                placeholder="Search"
                aria-label="Search"
              />
            </InputGroup>
          </div>
        </Card.ImgOverlay>
      </div>
    </Card>
  );
}

export default HomeHeroBanner;
