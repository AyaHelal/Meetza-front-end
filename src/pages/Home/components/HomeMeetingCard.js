import React from "react";
import { ArrowRight } from "@phosphor-icons/react";

export default function HomeMeetingCard({ meeting }) {
  return (
    <div className="home-meeting-card h-100 d-flex flex-column ">
      <div className="home-meeting-card-header d-flex gap-3 min-w-0">
        <div className="home-meeting-accent" aria-hidden="true" />
        <div className="home-meeting-header-text d-flex flex-column min-w-0">
          <p className="home-meeting-group-label">{meeting.groupLabel}</p>
          <p className="home-meeting-title">{meeting.course ?? meeting.title}</p>
        </div>
      </div>
      <div className="home-meeting-times d-flex flex-column gap-2 ">
        <div className="d-flex flex-column gap-1 ms-4 mb-1">
          <span className="home-meeting-time-label ">Start time :</span>
          <span className="home-meeting-time-value">{meeting.start}</span>
        </div>
        <div className="home-meeting-time-arrow d-flex justify-content-center py-1">
          <span className="home-meeting-time-arrow-inner">
            <ArrowRight size={13} weight="bold" aria-hidden />
          </span>
        </div>
        <div className="d-flex flex-column gap-1 ms-4 mt-1">
          <span className="home-meeting-time-label">End time :</span>
          <span className="home-meeting-time-value">{meeting.end}</span>
        </div>
      </div>
    </div>
  );
}
