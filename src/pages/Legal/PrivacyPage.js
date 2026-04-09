import "./LegalPage.css";
import { useNavigate } from "react-router-dom";

export default function PrivacyPage() {
  const navigate = useNavigate();

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
          <p className="legal-subtitle">Last updated: April 2026</p>
          <div className="legal-body">
            <p>
              This page explains how Meetza handles personal data. This is a placeholder policy that
              can be replaced with your final privacy text.
            </p>
            <h2>What we collect</h2>
            <ul>
              <li>Account information you provide.</li>
              <li>Usage data needed to operate the service.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

