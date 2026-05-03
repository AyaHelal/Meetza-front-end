import React from "react";
import { Link } from "react-router-dom";
import { Button } from "react-bootstrap";
import { ArrowRight } from "@phosphor-icons/react";

export default function HomeStatCard({ item }) {
  const Icon = item.icon;
  const to = item.to;
  const arrowClass =
    "home-stat-card-arrow flex-shrink-0 d-flex align-items-center justify-content-center p-0 border-0";

  return (
    <div className="home-stat-card d-flex flex-column h-100">
      <div className="home-stat-card-head d-flex flex-column min-w-0 flex-grow-1">
        <div className="home-stat-card-head-top d-flex flex-column min-w-0">
          <div className="home-stat-card-title-row d-flex align-items-center gap-2 min-w-0">
            <div className="home-stat-card-icon-wrap flex-shrink-0 d-flex align-items-center justify-content-center">
              <Icon size={22} weight="regular" className="home-stat-card-icon" />
            </div>
            <h3 className="home-stat-card-title mb-0 min-w-0 flex-grow-1">{item.title}</h3>
          </div>
          <p className="home-stat-card-value mb-0">
            {item.value} <span className="home-stat-card-unit">{item.unit}</span>
          </p>
        </div>
      </div>
      <div className="home-stat-card-arrow-row d-flex justify-content-end">
        {to ? (
          <Button
            as={Link}
            to={to}
            variant="primary"
            className={arrowClass}
            aria-label={`Go to ${item.title}`}
          >
            <ArrowRight size={20} weight="bold" />
          </Button>
        ) : (
          <Button type="button" variant="primary" className={arrowClass} disabled aria-label={item.title}>
            <ArrowRight size={20} weight="bold" />
          </Button>
        )}
      </div>
    </div>
  );
}
