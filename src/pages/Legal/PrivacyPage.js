import "./LegalPage.css";
import { useNavigate } from "react-router-dom";
import React, { useMemo } from "react";
import { useBranding } from "../../context/BrandingContext";

export default function PrivacyPage() {
  const navigate = useNavigate();
  const { privacyHtml } = useBranding();

  const DEFAULT_TEXT = useMemo(
    () =>
      [
        "This page explains how Meetza handles personal data. This is a placeholder policy that can be replaced with your final privacy text.",
        "",
        "What we collect",
        "- Account information you provide.",
        "- Usage data needed to operate the service.",
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
          <h1 className="legal-title">Privacy Policy</h1>
          <div className="legal-body">
            <div className="legal-body-pre">{privacyHtml || DEFAULT_TEXT}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

