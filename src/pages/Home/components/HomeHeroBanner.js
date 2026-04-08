import React from "react";
import { Card, Col, Form, InputGroup, Row } from "react-bootstrap";
import { MagnifyingGlass } from "@phosphor-icons/react";
import heroBg from "../assets/home-hero-banner.png";

/**
 * Hero: Bootstrap Card + image + overlay; look kept via home-hero-* classes + CSS
 */
function HomeHeroBanner() {
  return (
    <Card className="home-hero-banner border-0 shadow rounded-4 overflow-hidden">
      <div className="home-hero-banner-media position-relative">
        <Card.Img
          variant="top"
          src={heroBg}
          alt=""
          className="object-fit-cover w-100"
          style={{ minHeight: "200px", maxHeight: "250px" }}
        />
        <Card.ImgOverlay className="home-hero-inner d-flex flex-column justify-content-center align-items-center text-center text-white">
          <h1 className="home-hero-title mb-2">Hello, again Welcome back</h1>
          <p className="home-hero-subtitle mb-3 mb-md-4">This is what we have for you today</p>
          <Row className="justify-content-center w-100 g-0">
            <Col xs={11} sm={10} md={8} lg={6} xl={5}>
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
            </Col>
          </Row>
        </Card.ImgOverlay>
      </div>
    </Card>
  );
}

export default HomeHeroBanner;
