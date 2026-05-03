import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Blog.css";
import { BLOG_CATEGORIES, BLOG_POSTS } from "./posts";

export default function Blog() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState("All");

  const categories = BLOG_CATEGORIES;
  const posts = BLOG_POSTS;

  const visiblePosts = useMemo(() => {
    if (activeCategory === "All") return posts;
    return posts.filter((p) => p.category === activeCategory);
  }, [activeCategory, posts]);

  const featured = posts[0];

  return (
    <div
      className="blog-page"
      style={{
        backgroundImage:
          "linear-gradient(180deg, rgba(33, 74, 184, 0.92) 0%, rgba(0, 220, 133, 0.18) 55%, rgba(33, 74, 184, 0.92) 100%), url(/assets/background-farida%202.png)",
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
        backgroundPosition: "top center",
        backgroundAttachment: "fixed",
      }}
    >
      <header className="blog-hero">
        <div className="blog-hero__inner">
          <button type="button" className="blog-back" onClick={() => navigate("/landing")}>
            ← Back to Landing
          </button>

          <h1 className="blog-title">Meetza Blog</h1>
          <p className="blog-subtitle">
            Guides, product updates, and practical tips for meetings, chat, scheduling, and video
            sessions.
          </p>

          <section className="blog-featured" aria-label="Featured post">
            <div className="blog-featured__badge">Featured</div>
            <div className="blog-featured__meta">
              <span className="blog-chip">{featured.category}</span>
              <span className="blog-meta">{featured.date}</span>
            </div>
            <h2 className="blog-featured__title">{featured.title}</h2>
            <p className="blog-featured__excerpt">{featured.excerpt}</p>
            <div className="blog-featured__actions">
              <button
                type="button"
                className="blog-btn blog-btn--primary"
                onClick={() => navigate(`/blog/${featured.slug}`)}
              >
                Read
              </button>
              <button
                type="button"
                className="blog-btn blog-btn--ghost"
                onClick={() => setActiveCategory(featured.category)}
              >
                More like this
              </button>
            </div>
          </section>
        </div>
      </header>

      <main className="blog-main">
        <div className="blog-toolbar">
          <div className="blog-categories" role="tablist" aria-label="Categories">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                role="tab"
                aria-selected={activeCategory === c}
                className={`blog-cat ${activeCategory === c ? "is-active" : ""}`}
                onClick={() => setActiveCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <section className="blog-grid" aria-label="Posts">
          {visiblePosts.map((post) => (
            <article key={post.slug} className="blog-card">
              <div className="blog-card__meta">
                <span className="blog-chip">{post.category}</span>
                <span className="blog-meta">{post.date}</span>
              </div>
              <h3 className="blog-card__title">{post.title}</h3>
              <p className="blog-card__excerpt">{post.excerpt}</p>
              <div className="blog-card__actions">
                <button
                  type="button"
                  className="blog-btn blog-btn--ghost"
                  onClick={() => navigate(`/blog/${post.slug}`)}
                >
                  Read
                </button>
              </div>
            </article>
          ))}
        </section>

        <section className="blog-cta" aria-label="Support CTA">
          <div className="blog-cta__inner">
            <h2 className="blog-cta__title">Need help?</h2>
            <p className="blog-cta__text">
              If you have a question or want to report an issue, contact our team.
            </p>
            <button
              type="button"
              className="blog-btn blog-btn--primary"
              onClick={() => navigate("/landing#contact-section")}
            >
              Contact Support
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

