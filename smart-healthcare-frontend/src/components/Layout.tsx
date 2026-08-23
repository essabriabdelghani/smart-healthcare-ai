import type { ReactElement, ReactNode, SVGProps } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { roleHome } from "../utils/roleHome";
import { VitalLine } from "./VitalLine";
import { NotificationBell } from "./NotificationBell";
import type { UserRole } from "../types/user";

/* =========================================================
   Icons — inline SVG (no dependency on external fonts)
========================================================= */

type IconProps = SVGProps<SVGSVGElement>;

const iconBase = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function IconDashboard(props: IconProps) {
  return (
    <svg {...iconBase} {...props}>
      <rect x="4" y="4" width="7" height="7" rx="1" />
      <rect x="13" y="4" width="7" height="4" rx="1" />
      <rect x="13" y="11" width="7" height="9" rx="1" />
      <rect x="4" y="14" width="7" height="6" rx="1" />
    </svg>
  );
}

function IconUsers(props: IconProps) {
  return (
    <svg {...iconBase} {...props}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="17" cy="8" r="2.5" />
      <path d="M15.5 14.2c2.4.5 4.5 2.6 4.5 5.8" />
    </svg>
  );
}

function IconFilePlus(props: IconProps) {
  return (
    <svg {...iconBase} {...props}>
      <path d="M7 3h7l4 4v14H7z" />
      <path d="M14 3v4h4" />
      <path d="M12 12v5M9.5 14.5h5" />
    </svg>
  );
}

function IconCalendar(props: IconProps) {
  return (
    <svg {...iconBase} {...props}>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 10h16M8 3v4M16 3v4" />
    </svg>
  );
}

function IconShieldLock(props: IconProps) {
  return (
    <svg {...iconBase} {...props}>
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
      <rect x="9.5" y="11" width="5" height="4" rx="1" />
      <path d="M11 11V9.5a1 1 0 0 1 2 0V11" />
    </svg>
  );
}

function IconSettings(props: IconProps) {
  return (
    <svg {...iconBase} {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 0 0-2-1.2L14.2 3H9.8l-.4 2.6a7 7 0 0 0-2 1.2l-2.3-.9-2 3.4 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-.9a7 7 0 0 0 2 1.2l.4 2.6h4.4l.4-2.6a7 7 0 0 0 2-1.2l2.3.9 2-3.4-2-1.5c.07-.4.1-.8.1-1.2Z" />
    </svg>
  );
}

function IconHelp(props: IconProps) {
  return (
    <svg {...iconBase} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.3c.3-1.4 1.5-2.3 2.9-2.1 1.3.2 2.2 1.3 2.1 2.6-.1 1.3-1.5 1.7-2.1 2.7-.2.4-.3.8-.3 1.3" />
      <circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconLogout(props: IconProps) {
  return (
    <svg {...iconBase} {...props}>
      <path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3" />
      <path d="M14 8l4 4-4 4M18 12H9" />
    </svg>
  );
}

const iconByLabel: Record<string, (props: IconProps) => ReactElement> = {
  "Dashboard": IconDashboard,
  "My admissions": IconDashboard,
  "Patients": IconUsers,
  "New admission": IconFilePlus,
  "Add patient": IconFilePlus,
  "Appointments": IconCalendar,
  "Administration": IconShieldLock,
};

/* =========================================================
   Role-based navigation
========================================================= */

const navItemsByRole: Record<UserRole, { to: string; label: string }[]> = {
  patient: [
    { to: "/dashboard", label: "My admissions" },
    { to: "/patient-form", label: "New admission" },
    { to: "/my-appointments", label: "My appointments" },
  ],
  doctor: [
    { to: "/doctor/dashboard", label: "Patients" },
    { to: "/doctor/patients/new", label: "Add patient" },
    { to: "/doctor/appointments", label: "Appointments" },
  ],
  admin: [
    { to: "/doctor/dashboard", label: "Patients" },
    { to: "/admin", label: "Administration" },
  ],
};

function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = user ? navItemsByRole[user.role] : [];
  const homeTo = user ? roleHome(user.role) : "/login";

  const roleLabel: Record<UserRole, string> = {
    patient: "Patient",
    doctor: "Doctor",
    admin: "Administrator",
  };

  return (
    <div className="flex h-screen overflow-hidden bg-paper">
      {/* ============ Sidebar (fixed, never scrolls with content) ============ */}
      <aside className="hidden h-screen w-56 shrink-0 flex-col overflow-y-auto bg-pine px-3 py-4 lg:flex">
        <div className="mb-2 flex items-center justify-between gap-2 border-b border-white/10 px-2 pb-5">
          <Link to={homeTo} className="flex min-w-0 items-center gap-2">
            <VitalLine className="h-4 w-8 shrink-0 text-brass" strokeWidth={2.5} />
            <span className="truncate font-display text-sm text-paper">
              Digital&nbsp;<span className="italic">Clinic</span>
            </span>
          </Link>
          <NotificationBell dark />
        </div>

        <nav className="flex flex-1 flex-col gap-0.5">
          {navItems.map((item) => {
            const active = location.pathname === item.to;
            const Icon = iconByLabel[item.label] ?? IconDashboard;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors ${
                  active
                    ? "bg-brass font-medium text-ink"
                    : "text-sage-light hover:bg-white/5 hover:text-paper"
                }`}
              >
                <Icon className="h-[15px] w-[15px] shrink-0" />
                {item.label}
              </Link>
            );
          })}

          <div className="mt-3.5 flex flex-col gap-0.5 border-t border-white/10 pt-3">
            <Link
              to="/settings"
              className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors ${
                location.pathname === "/settings"
                  ? "bg-brass font-medium text-ink"
                  : "text-sage-light/90 hover:bg-white/5 hover:text-paper"
              }`}
            >
              <IconSettings className="h-[15px] w-[15px] shrink-0" />
              Settings
            </Link>
            <Link
              to="/support"
              className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors ${
                location.pathname === "/support"
                  ? "bg-brass font-medium text-ink"
                  : "text-sage-light/90 hover:bg-white/5 hover:text-paper"
              }`}
            >
              <IconHelp className="h-[15px] w-[15px] shrink-0" />
              Support
            </Link>
          </div>
        </nav>

        {user && (
          <div className="mt-2 flex items-center gap-2.5 rounded-xl bg-pine-dark p-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brass text-[13px] font-medium text-ink">
              {initials(user.full_name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-paper">{user.full_name}</p>
              <p className="text-[10px] text-sage-light/70">{roleLabel[user.role]}</p>
            </div>
            <button
              onClick={() => {
                logout();
                navigate("/login");
              }}
              aria-label="Logout"
              className="shrink-0 text-sage-light/70 transition-colors hover:text-paper"
            >
              <IconLogout className="h-[15px] w-[15px]" />
            </button>
          </div>
        )}
      </aside>

      {/* ============ Mobile nav (sidebar hidden < lg) ============ */}
      <div className="flex h-screen flex-1 flex-col overflow-hidden">
        <header className="shrink-0 flex items-center justify-between border-b border-sand-dark/60 bg-paper-raised px-4 py-3 lg:hidden">
          <Link to={homeTo} className="flex items-center gap-2">
            <VitalLine className="h-4 w-8 text-brass" strokeWidth={2.5} />
            <span className="font-display text-sm text-pine">Digital Clinic</span>
          </Link>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button
              onClick={() => {
                logout();
                navigate("/login");
              }}
              className="text-xs font-medium text-ink-soft"
            >
              Logout
            </button>
          </div>
        </header>

        <nav className="shrink-0 flex gap-1 overflow-x-auto border-b border-sand-dark/60 bg-paper-raised px-3 py-2 lg:hidden">
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

        {/* Only this area scrolls — sidebar and headers stay fixed */}
        <main className="flex-1 overflow-y-auto px-6 py-8 lg:px-10 lg:py-10">{children}</main>
      </div>
    </div>
  );
}