import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

/**
 * Allows access only for Member and Super_Admin roles.
 * Administrator and other roles are redirected to /home.
 */
const CalendarRoute = ({ children }) => {
  const { user, initializing } = useContext(AuthContext);

  if (initializing) return null;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const userRole = (user?.role || "").toString().trim().toLowerCase();
  const canAccessCalendar =
    userRole === "member" ||
    userRole.includes("super_admin") ||
    userRole.includes("super-admin");

  if (!canAccessCalendar) {
    return <Navigate to="/home" replace />;
  }

  return children;
};

export default CalendarRoute;
