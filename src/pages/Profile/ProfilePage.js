import React from "react";
import "./ProfilePage.css";
import { useProfilePage } from "./hooks/useProfilePage";
import { ProfilePageContent } from "./components/ProfilePageContent";

export default function ProfilePage() {
  const props = useProfilePage();
  return <ProfilePageContent {...props} />;
}
