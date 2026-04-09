import "./CareersSection.css";

export default function CareersSection() {
  return (
    <section id="landing-careers" className="landing-careers">
      <div className="landing-careers__inner">
        <header className="landing-careers__header">
          <h2 className="landing-careers__title">Careers</h2>
          <p className="landing-careers__subtitle">
            Meetza is building a calmer, more connected way to meet, learn, and collaborate.
          </p>
        </header>

        <div className="landing-careers__grid">
          <article className="landing-careers__card">
            <h3 className="landing-careers__cardTitle">About Meetza</h3>
            <p className="landing-careers__cardText">
              We bring together video meetings, group chat, and scheduling in one place—so teams and
              students can focus on what matters.
            </p>
          </article>

          <article className="landing-careers__card landing-careers__card--primary">
            <h3 className="landing-careers__cardTitle">Who we’re looking for</h3>
            <ul className="landing-careers__list">
              <li>People who enjoy building clean, reliable features</li>
              <li>Strong communicators who like teamwork</li>
              <li>Curious learners who iterate fast and ship</li>
              <li>Anyone who cares about user experience</li>
            </ul>
          </article>

          <article className="landing-careers__card">
            <h3 className="landing-careers__cardTitle">What you’ll work on</h3>
            <ul className="landing-careers__list">
              <li>UI polish and responsive layouts</li>
              <li>Real-time experiences (chat, meetings)</li>
              <li>Performance, accessibility, and quality</li>
              <li>Product iterations driven by feedback</li>
            </ul>
          </article>
        </div>
      </div>
    </section>
  );
}

