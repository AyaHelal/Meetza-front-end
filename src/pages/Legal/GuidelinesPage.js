import "./LegalPage.css";
import { useNavigate } from "react-router-dom";
import React, { useMemo } from "react";
import { useBranding } from "../../context/BrandingContext";

export default function GuidelinesPage() {
  const navigate = useNavigate();
  const { guidelinesHtml } = useBranding();

  const DEFAULT_TEXT = useMemo(
    () =>
      [
        "These guidelines help keep Meetza respectful and productive. This is a placeholder page.",
        "",
        "Be respectful",
        "- No harassment, hate speech, or bullying.",
        "- Respect privacy and consent when sharing content.",
      ].join("\n"),
    []
  );

  return (
    <div
      className="legal-page"
      style={{
        backgroundImage:
          "linear-gradient(180deg, rgba(33, 74, 184, 0.92) 0%, rgba(0, 220, 133, 0.25) 55%, rgba(33, 74, 184, 0.92) 100%), url(/assets/background-farida%202.png)",
        backgroundRepeat: "no-repeat, no-repeat",
        backgroundSize: "cover, cover",
        backgroundPosition: "top center, top center",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="legal-wrap">
        <button type="button" className="legal-back" onClick={() => navigate("/landing")}>
          ← Back to Landing
        </button>
        <div className="legal-card">
          <h1 className="legal-title">Community Guidelines</h1>
          <div className="legal-body">
            <div className="legal-body-pre">{guidelinesHtml || DEFAULT_TEXT}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

