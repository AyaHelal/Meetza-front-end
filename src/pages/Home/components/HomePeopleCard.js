import React from "react";

export default function HomePeopleCard({ person }) {
  const name = person?.name ?? "Dr Ahmed Mohammed";
  const role = person?.role ?? "php doctor";
  const avatarUrl =
    person?.avatarUrl ||
    "https://i.pravatar.cc/160?img=12";

  return (
    <article className="home-people-card" aria-label={name}>
      <div className="home-people-card-avatar-wrap" aria-hidden="true">
        <img className="home-people-card-avatar" src={avatarUrl} alt="" />
      </div>
      <h3 className="home-people-card-name">{name}</h3>
      <p className="home-people-card-role">{role}</p>
    </article>
  );
}

