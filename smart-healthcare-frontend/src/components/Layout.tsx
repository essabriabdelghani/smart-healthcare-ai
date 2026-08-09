import type { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { roleHome } from "../utils/roleHome";
import { VitalLine } from "./VitalLine";
import type { UserRole } from "../types/user";

const navItemsByRole: Record<UserRole, { to: string; label: string }[]> = {
  patient: [
    { to: "/dashboard", label: "Mes admissions" },
    { to: "/patient-form", label: "Nouvelle admission" },
  ],
  doctor: [
    { to: "/doctor/dashboard", label: "Patients" },
    { to: "/doctor/patients/new", label: "Ajouter un patient" },
  ],
  admin: [
    { to: "/doctor/dashboard", label: "Patients" },
    { to: "/doctor/patients/new", label: "Ajouter un patient" },
    { to: "/admin", label: "Administration" },
  ],
};

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = user ? navItemsByRole[user.role] : [];
  const homeTo = user ? roleHome(user.role) : "/login";

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-sand-dark/60 bg-paper-raised">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to={homeTo} className="flex items-center gap-3">
            <VitalLine className="h-5 w-10 text-brass" strokeWidth={2.5} />
            <span className="font-display text-lg tracking-tight text-pine">
              Clinique&nbsp;<span className="italic">Numérique</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 sm:flex">
            {navItems.map((item) => {
              const active = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-pine text-paper"
                      : "text-ink-soft hover:bg-sage-light hover:text-pine"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            {user && (
              <span className="hidden font-mono text-xs text-ink-soft sm:inline">
                {user.full_name} · {user.role}
              </span>
            )}
            <button
              onClick={() => {
                logout();
                navigate("/login");
              }}
              className="rounded-full border border-sand-dark px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:border-pine hover:text-pine"
            >
              Déconnexion
            </button>
          </div>
        </div>

        <nav className="flex gap-1 overflow-x-auto border-t border-sand-dark/60 px-4 py-2 sm:hidden">
          {navItems.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium ${
                  active ? "bg-pine text-paper" : "text-ink-soft"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}