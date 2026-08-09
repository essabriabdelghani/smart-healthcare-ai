import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { roleHome } from "../utils/roleHome";
import type { UserRole } from "../types/user";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

export default function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  // 1. Vérification du chargement de l'utilisateur
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <p className="text-sm text-ink-soft">
          Chargement...
        </p>
      </div>
    );
  }

  // 2. Utilisateur non connecté
  if (!isAuthenticated || !user) {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    );
  }

  // 3. Vérification du rôle
  if (
    allowedRoles &&
    !allowedRoles.includes(user.role)
  ) {
    return <Navigate to={roleHome(user.role)} replace />;
  }

  // 4. Utilisateur authentifié → accès à la page
  return <>{children}</>;
}