import React from "react";
import "./AdminMeetingPage.css";
import { useAdminMeetingPage } from "./hooks/useAdminMeetingPage";
import { AdminMeetingPageContent } from "./components/AdminMeetingPageContent";

export default function AdminMeetingPage() {
  const props = useAdminMeetingPage();
  return <AdminMeetingPageContent {...props} />;
}
