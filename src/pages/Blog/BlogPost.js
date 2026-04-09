import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BLOG_POSTS } from "./posts";
import "./BlogPost.css";

function renderBlocks(lines) {
  return lines.map((line, idx) => {
    if (line.startsWith("## ")) {
      return (
        <h2 key={idx} className="blogpost-h2">
          {line.replace("## ", "")}
        </h2>
      );
    }
    if (line.startsWith("- ")) {
      return (
        <li key={idx} className="blogpost-li">
          {line.replace("- ", "")}
        </li>
      );
    }
    if (!line.trim()) {
      return <div key={idx} style={{ height: 10 }} />;
    }
    return (
      <p key={idx} className="blogpost-p">
        {line}
      </p>
    );
  });
}

export default function BlogPost() {
  const navigate = useNavigate();
  const { slug } = useParams();

  const post = useMemo(() => BLOG_POSTS.find((p) => p.slug === slug), [slug]);
  const related = useMemo(() => {
    if (!post) return [];
    return BLOG_POSTS.filter((p) => p.slug !== post.slug && p.category === post.category).slice(0, 3);
  }, [post]);

  if (!post) {
    return (
      <div
        className="blogpost-page"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(33, 74, 184, 0.92) 0%, rgba(0, 220, 133, 0.18) 55%, rgba(33, 74, 184, 0.92) 100%), url(/assets/background-farida%202.png)",
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover",
          backgroundPosition: "top center",
          backgroundAttachment: "fixed",
        }}
      >
        <div className="blogpost-wrap">
          <button type="button" className="blogpost-back" onClick={() => navigate("/blog")}>
            ← Back to Blog
          </button>
          <h1 className="blogpost-title">Post not found</h1>
          <p className="blogpost-p">This post doesn’t exist yet.</p>
        </div>
      </div>
    );
  }

  // Build a proper <ul> for consecutive bullet lines
  const content = [];
  let pendingLis = [];
  const flushList = () => {
    if (!pendingLis.length) return;
    content.push(
      <ul key={`ul-${content.length}`} className="blogpost-ul">
        {pendingLis}
      </ul>
    );
    pendingLis = [];
  };
  post.content.forEach((line, idx) => {
    if (line.startsWith("- ")) {
      pendingLis.push(
        <li key={`li-${idx}`} className="blogpost-li">
          {line.replace("- ", "")}
        </li>
      );
      return;
    }
    flushList();
    content.push(renderBlocks([line], idx));
  });
  flushList();

  return (
    <div
      className="blogpost-page"
      style={{
        backgroundImage:
          "linear-gradient(180deg, rgba(33, 74, 184, 0.92) 0%, rgba(0, 220, 133, 0.18) 55%, rgba(33, 74, 184, 0.92) 100%), url(/assets/background-farida%202.png)",
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
        backgroundPosition: "top center",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="blogpost-wrap">
        <button type="button" className="blogpost-back" onClick={() => navigate("/blog")}>
          ← Back to Blog
        </button>

        <div className="blogpost-hero">
          <div className="blogpost-meta">
            <span className="blogpost-chip">{post.category}</span>
            <span className="blogpost-metaText">
              {post.date} · {post.readTime}
            </span>
          </div>
          <h1 className="blogpost-title">{post.title}</h1>
          <p className="blogpost-excerpt">{post.excerpt}</p>
        </div>

        <article className="blogpost-article">{content}</article>

        {related.length > 0 && (
          <section className="blogpost-related" aria-label="Related posts">
            <h2 className="blogpost-h2">Related</h2>
            <div className="blogpost-relatedGrid">
              {related.map((p) => (
                <button
                  key={p.slug}
                  type="button"
                  className="blogpost-relatedCard"
                  onClick={() => navigate(`/blog/${p.slug}`)}
                >
                  <div className="blogpost-meta">
                    <span className="blogpost-chip">{p.category}</span>
                    <span className="blogpost-metaText">
                      {p.date} · {p.readTime}
                    </span>
                  </div>
                  <div className="blogpost-relatedTitle">{p.title}</div>
                  <div className="blogpost-relatedExcerpt">{p.excerpt}</div>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

