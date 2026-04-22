import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const ProfileRoute = ({ children }) => {
  const { user, initializing } = useContext(AuthContext);

  if (initializing) return null;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const userRole = (user?.role || "").toString().trim().toLowerCase();
  const isSuperAdmin = userRole.includes("super_admin") || userRole.includes("super-admin");

  // Prevent super_admin from accessing profile
  if (isSuperAdmin) {
    return <Navigate to="/home" replace />;
  }

  return children;
};

export default ProfileRoute;
