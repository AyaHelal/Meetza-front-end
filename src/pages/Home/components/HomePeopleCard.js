import React from "react";

function toText(v, fallback) {
  if (v == null) return fallback;
  if (typeof v === "string") return v.trim() || fallback;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (typeof v === "object") {
    const t = v.title ?? v.name ?? v.role ?? v.label;
    if (t != null) return String(t).trim() || fallback;
    return fallback;
  }
  return fallback;
}

export default function HomePeopleCard({ person }) {
  const name = toText(person?.name, "Dr Ahmed Mohammed");
  const role = toText(person?.role, "php doctor");
  const avatarUrl = typeof person?.avatarUrl === "string" ? person.avatarUrl.trim() : "";
  const firstLetter = (name || "—").trim().charAt(0).toUpperCase() || "—";

  return (
    <article className="home-people-card" aria-label={name}>
      <div className="home-people-card-avatar-wrap" aria-hidden="true">
        {avatarUrl ? (
          <img className="home-people-card-avatar" src={avatarUrl} alt="" />
        ) : (
          <div className="home-people-card-avatar-fallback">{firstLetter}</div>
        )}
      </div>
      <h3 className="home-people-card-name">{name}</h3>
      <p className="home-people-card-role">{role}</p>
    </article>
  );
}

