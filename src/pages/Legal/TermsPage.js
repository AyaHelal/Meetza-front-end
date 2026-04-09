import "./LegalPage.css";
import { useNavigate } from "react-router-dom";

export default function TermsPage() {
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
          <h1 className="legal-title">Terms of Service</h1>
          <p className="legal-subtitle">Last updated: April 2026</p>
          <div className="legal-body">
            <p>
              These Terms describe how you can use Meetza. This is a placeholder page that can be
              expanded later with your official terms.
            </p>
            <h2>Use of the service</h2>
            <ul>
              <li>Use the app responsibly and follow applicable rules.</li>
              <li>Do not abuse, disrupt, or attempt to harm the service.</li>
            </ul>

            <h2>Account registration (roles)</h2>
            <ul>
              <li>
                Admins and Leaders are registered by the system team. An admin/leader should provide
                a seed file that contains the list of admin accounts to the system supervisor so
                those accounts can be created.
              </li>
              <li>
                Only members can create accounts via the Sign Up flow.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

