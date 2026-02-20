import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const AdminRoute = ({ children }) => {
  const { user, initializing } = useContext(AuthContext);

  // Avoid redirect flicker before hydration completes
  if (initializing) return null;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check if user is admin (Administrator or Super_Admin)
  const userRole = (user?.role || "").toString().trim().toLowerCase();
  const isAdmin = userRole.includes("administrator") || userRole.includes("super_admin") || userRole.includes("super-admin");

  if (!isAdmin) {
    return <Navigate to="/home" replace />;
  }

  return children;
};

export default AdminRoute;

