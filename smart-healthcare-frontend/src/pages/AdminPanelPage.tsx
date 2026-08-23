import { useEffect, useMemo, useState, type ReactNode } from "react";
import { getAuditLog, getDashboardStats } from "../services/dashboardService";
import { getClinicUsers, toggleUserStatus } from "../services/userService";
import { getAllAppointments } from "../services/appointmentService";
import type { Appointment, AuditLogEntry, DashboardStats, RiskLevel } from "../types/patient";
import type { User, UserRole } from "../types/user";

type RoleFilter = "all" | UserRole;

/* =========================================================
   Icons — consistent with those in the sidebar (Layout.tsx)
========================================================= */

const iconBase = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function IconUsers({ className }: { className?: string }) {
  return (
    <svg {...iconBase} className={className}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="17" cy="8" r="2.5" />
      <path d="M15.5 14.2c2.4.5 4.5 2.6 4.5 5.8" />
    </svg>
  );
}

function IconStethoscope({ className }: { className?: string }) {
  return (
    <svg {...iconBase} className={className}>
      <path d="M5 3v5.5a4 4 0 0 0 8 0V3" />
      <path d="M9 12.5V15a5 5 0 0 0 10 0v-1.5" />
      <circle cx="19" cy="11.5" r="1.6" />
      <circle cx="5" cy="3" r="1" />
      <circle cx="13" cy="3" r="1" />
    </svg>
  );
}

function IconPatient({ className }: { className?: string }) {
  return (
    <svg {...iconBase} className={className}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c0-4.1 3.4-7.5 7.5-7.5s7.5 3.4 7.5 7.5" />
    </svg>
  );
}

function IconCalendar({ className }: { className?: string }) {
  return (
    <svg {...iconBase} className={className}>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 10h16M8 3v4M16 3v4" />
    </svg>
  );
}

/* =========================================================
   Helpers
========================================================= */

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const borderByRisk: Record<RiskLevel | "none", string> = {
  critical: "border-l-4 border-risk-critical",
  high: "border-l-4 border-risk-high",
  medium: "border-l-4 border-risk-medium",
  low: "border-l-4 border-risk-low",
  none: "border-l-4 border-sand-dark",
};

const statusLabel: Record<string, string> = {
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No show",
};

const statusStyle: Record<string, string> = {
  scheduled: "bg-sage-light text-pine-dark",
  completed: "bg-sand text-ink-soft",
  cancelled: "bg-risk-critical/10 text-risk-critical",
  no_show: "bg-brass/15 text-brass",
};

const roleBadgeStyle: Record<UserRole, string> = {
  doctor: "bg-sage-light text-pine-dark",
  patient: "bg-sand text-ink-soft",
  admin: "bg-brass/20 text-brass",
};

const roleBadgeLabel: Record<UserRole, string> = {
  doctor: "Doctor",
  patient: "Patient",
  admin: "Admin",
};

const riskLabel: Record<RiskLevel, string> = {
  low: "low",
  medium: "moderate",
  high: "high",
  critical: "critical",
};

/* =========================================================
   Small components
========================================================= */

function StatCard({
  icon,
  label,
  value,
  active,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  active: boolean;
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl border p-5 text-left transition-all ${
        active
          ? "border-pine bg-pine shadow-md shadow-pine/20"
          : "border-sand-dark/60 bg-paper-raised hover:border-pine/30 hover:shadow-sm"
      } ${onClick ? "cursor-pointer" : "cursor-default"}`}
    >
      <div className="flex items-center justify-between">
        <p
          className={`flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider ${
            active ? "text-sage-light" : "text-ink-soft"
          }`}
        >
          {label}
        </p>
        <span className={active ? "text-brass" : "text-sand-dark group-hover:text-brass/70"}>
          {icon}
        </span>
      </div>
      <p className={`mt-2 font-mono text-3xl ${active ? "text-paper" : "text-ink"}`}>{value}</p>
    </Tag>
  );
}

function SectionHeading({ eyebrow, title }: { eyebrow?: string; title: string }) {
  return (
    <div className="mb-4">
      {eyebrow && (
        <span className="text-[11px] font-medium uppercase tracking-widest text-brass">
          {eyebrow}
        </span>
      )}
      <h2 className="font-display text-xl text-pine">{title}</h2>
    </div>
  );
}

/* =========================================================
   Page
========================================================= */

export default function AdminPanelPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [loading, setLoading] = useState(true);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getDashboardStats(), getClinicUsers(), getAuditLog(), getAllAppointments()])
      .then(([s, u, a, appts]) => {
        setStats(s);
        setUsers(u);
        setAuditLog(a);
        setAppointments(appts);
      })
      .catch(() => setError("Unable to load administration data."))
      .finally(() => setLoading(false));
  }, []);

  const filteredUsers = useMemo(
    () => (roleFilter === "all" ? users : users.filter((u) => u.role === roleFilter)),
    [users, roleFilter]
  );

  async function handleToggle(user: User) {
    setBusyUserId(user.id);
    try {
      const updated = await toggleUserStatus(user.id);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    } catch (err: unknown) {
      const apiMessage = (err as { response?: { data?: { detail?: unknown } } })?.response?.data
        ?.detail;
      alert(typeof apiMessage === "string" ? apiMessage : "Action failed.");
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8">
        <span className="text-xs font-medium uppercase tracking-widest text-brass">
          Configuration
        </span>
        <h1 className="font-display text-4xl text-pine">Administration</h1>
        <p className="mt-2 text-ink-soft">
          Read-only overview of the clinic — patients, appointments, team and
          clinical decision history.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-risk-high/20 bg-risk-high/5 px-4 py-3">
          <p className="text-sm text-risk-high">{error}</p>
        </div>
      )}

      {/* Stats — the first 3 filter the Users table */}
      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard
          icon={<IconUsers className="h-5 w-5" />}
          label="Users"
          value={stats?.totalUsers ?? 0}
          active={roleFilter === "all"}
          onClick={() => setRoleFilter("all")}
        />
        <StatCard
          icon={<IconStethoscope className="h-5 w-5" />}
          label="Doctors"
          value={stats?.doctorsCount ?? 0}
          active={roleFilter === "doctor"}
          onClick={() => setRoleFilter("doctor")}
        />
        <StatCard
          icon={<IconPatient className="h-5 w-5" />}
          label="Patients"
          value={stats?.totalPatients ?? 0}
          active={roleFilter === "patient"}
          onClick={() => setRoleFilter("patient")}
        />
        <StatCard
          icon={<IconCalendar className="h-5 w-5" />}
          label="Appointments"
          value={appointments.length}
          active={false}
        />
      </div>

      {/* Users and roles */}
      <div className="mt-10">
        <div className="flex items-center justify-between">
          <SectionHeading title="Users and roles" />
          {roleFilter !== "all" && (
            <button
              onClick={() => setRoleFilter("all")}
              className="mb-4 text-xs font-medium text-ink-soft hover:text-pine"
            >
              Reset filter ✕
            </button>
          )}
        </div>

        {loading ? (
          <p className="text-sm text-ink-soft">Loading...</p>
        ) : filteredUsers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-sand-dark bg-paper-raised px-6 py-10 text-center">
            <p className="text-sm text-ink-soft">No users for this filter.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-sand-dark/60 bg-paper-raised shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-sand-dark/60 text-xs uppercase tracking-wide text-ink-soft">
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Email</th>
                  <th className="px-5 py-3 font-medium">Role</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-sand-dark/40 last:border-0 hover:bg-sage-light/20"
                  >
                    <td className="px-5 py-3 font-medium text-ink">{u.full_name}</td>
                    <td className="px-5 py-3 font-mono text-xs text-ink-soft">{u.email}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${roleBadgeStyle[u.role]}`}
                      >
                        {roleBadgeLabel[u.role]}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                          u.is_active ? "text-risk-low" : "text-risk-critical"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            u.is_active ? "bg-risk-low" : "bg-risk-critical"
                          }`}
                        />
                        {u.is_active ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => handleToggle(u)}
                        disabled={busyUserId === u.id}
                        className="text-xs font-medium text-pine hover:text-pine-dark disabled:opacity-50"
                      >
                        {busyUserId === u.id ? "..." : u.is_active ? "Disable" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* All appointments */}
      <div className="mt-10">
        <SectionHeading title="All appointments" />

        {loading ? (
          <p className="text-sm text-ink-soft">Loading...</p>
        ) : appointments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-sand-dark bg-paper-raised px-6 py-10 text-center">
            <p className="text-sm text-ink-soft">No appointments scheduled at the moment.</p>
          </div>
        ) : (
          <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
            {appointments.map((a) => (
              <div
                key={a.id}
                className={`flex items-center justify-between rounded-xl border border-sand-dark/60 bg-paper-raised px-5 py-3 shadow-sm ${
                  borderByRisk[a.lastRiskLevel ?? "none"]
                }`}
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{a.patientName}</p>
                  <p className="truncate text-sm text-ink-soft">
                    {a.doctorName ? `Dr. ${a.doctorName}` : "—"} · {a.notes || "Consultation"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      statusStyle[a.status] ?? "bg-sand text-ink-soft"
                    }`}
                  >
                    {statusLabel[a.status] ?? a.status}
                  </span>
                  <span className="font-mono text-xs text-ink-soft">
                    {formatDateTime(a.appointmentDate)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Audit log — real, populated by clinical reviews */}
      <div className="mt-10">
        <SectionHeading title="Audit log — AI versus clinician" />

        {loading ? (
          <p className="text-sm text-ink-soft">Loading...</p>
        ) : auditLog.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-sand-dark bg-paper-raised px-6 py-10 text-center">
            <p className="text-sm text-ink-soft">
              No clinical reviews recorded at the moment.
            </p>
            <p className="mt-1 text-xs text-ink-soft">
              This log fills up when a doctor confirms or adjusts a score from the patient
              record.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-sand-dark/60 bg-paper-raised shadow-sm">
            {auditLog.map((entry, i) => (
              <div
                key={entry.intakeId}
                className={`flex items-center justify-between gap-3 px-5 py-3.5 ${
                  i > 0 ? "border-t border-sand-dark/40" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${
                      entry.wasModified ? "bg-brass/15 text-brass" : "bg-risk-low/15 text-risk-low"
                    }`}
                    aria-hidden="true"
                  >
                    {entry.wasModified ? "✎" : "✓"}
                  </span>
                  <div>
                    <p className="text-sm text-ink">
                      {entry.doctorName ? `Dr. ${entry.doctorName}` : "A doctor"}{" "}
                      {entry.wasModified ? "adjusted the score of " : "confirmed the score of "}
                      <span className="font-medium">{entry.patientName}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-ink-soft">
                      {entry.wasModified ? (
                        <>
                          AI score: {entry.aiScore} ({riskLabel[entry.aiLevel]}) → adjusted:{" "}
                          {entry.overrideScore ?? entry.aiScore}
                          {entry.overrideLevel ? ` (${riskLabel[entry.overrideLevel]})` : ""}
                        </>
                      ) : (
                        <>
                          AI score: {entry.aiScore} ({riskLabel[entry.aiLevel]}) — no
                          modification
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <span className="whitespace-nowrap font-mono text-xs text-ink-soft">
                  {formatDateTime(entry.reviewedAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}