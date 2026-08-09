import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { roleHome } from "../utils/roleHome";

export default function RoleHomeRedirect() {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) return null;
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;

  return <Navigate to={roleHome(user.role)} replace />;
}