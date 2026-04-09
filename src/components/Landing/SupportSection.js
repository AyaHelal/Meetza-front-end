import "./SupportSection.css";

export default function SupportSection() {
  return (
    <section id="landing-support" className="landing-support">
      <div className="landing-support__inner">
        <header className="landing-support__header">
          <h2 className="landing-support__title">Support</h2>
          <p className="landing-support__subtitle">
            Find answers fast, fix common issues, or contact our team.
          </p>
        </header>

        <div className="landing-support__grid">
          <article className="landing-support__card">
            <div className="landing-support__icon" aria-hidden="true">
              ?
            </div>
            <h3 className="landing-support__cardTitle">FAQ</h3>
            <p className="landing-support__cardText">
              Quick answers for meetings, chat, scheduling, and video sessions.
            </p>
            <div className="landing-support__actions">
              <a className="landing-support__btn landing-support__btn--ghost" href="#contact-section">
                Ask a question
              </a>
            </div>
          </article>

          <article className="landing-support__card">
            <div className="landing-support__icon" aria-hidden="true">
              !
            </div>
            <h3 className="landing-support__cardTitle">Troubleshoot</h3>
            <p className="landing-support__cardText">
              Fix microphone/camera, joining meetings, notifications, and slow loading.
            </p>
            <div className="landing-support__actions">
              <a className="landing-support__btn landing-support__btn--ghost" href="#contact-section">
                Report a bug
              </a>
            </div>
          </article>

          <article className="landing-support__card landing-support__card--primary">
            <div className="landing-support__icon" aria-hidden="true">
              ✉
            </div>
            <h3 className="landing-support__cardTitle">Contact Support</h3>
            <p className="landing-support__cardText">
              Need help now? Send us a message and we’ll get back to you.
            </p>
            <div className="landing-support__actions">
              <a className="landing-support__btn landing-support__btn--solid" href="#contact-section">
                Contact us
              </a>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

