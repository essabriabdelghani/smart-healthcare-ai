import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getDoctorPatients } from "../services/patientService";
import { useAuth } from "../contexts/AuthContext";
import type { DoctorPatientRow, RiskLevel } from "../types/patient";

const riskDot: Record<RiskLevel, string> = {
  low: "bg-risk-low",
  medium: "bg-risk-medium",
  high: "bg-risk-high",
  critical: "bg-risk-critical",
};

const riskText: Record<RiskLevel, string> = {
  low: "text-risk-low",
  medium: "text-risk-medium",
  high: "text-risk-high",
  critical: "text-risk-critical",
};

const riskLabel: Record<RiskLevel, string> = {
  low: "Low",
  medium: "Moderate",
  high: "High",
  critical: "Critical",
};

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "1 day ago";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return "1 week ago";
  if (weeks < 5) return `${weeks} weeks ago`;
  const months = Math.floor(days / 30);
  if (months <= 1) return "1 month ago";
  return `${months} months ago`;
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 6) return phone;
  return digits.match(/.{1,2}/g)?.join(" ") ?? phone;
}

interface PatientGroup {
  key: string;
  phoneLabel: string;
  rows: DoctorPatientRow[];
  needsReview: boolean;
  latestCreatedAt: string;
}

function groupByContact(rows: DoctorPatientRow[]): PatientGroup[] {
  const groups = new Map<string, DoctorPatientRow[]>();

  for (const row of rows) {
    const key = row.emergencyPhone?.trim() || `__no_contact__:${row.patientId}`;
    const existing = groups.get(key);
    if (existing) {
      existing.push(row);
    } else {
      groups.set(key, [row]);
    }
  }

  const result: PatientGroup[] = [];
  for (const [key, groupRows] of groups) {
    const sorted = [...groupRows].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    result.push({
      key,
      phoneLabel: key.startsWith("__no_contact__") ? "No contact provided" : formatPhone(key),
      rows: sorted,
      needsReview: sorted.length > 1,
      latestCreatedAt: sorted[0].createdAt,
    });
  }

  return result.sort(
    (a, b) => new Date(b.latestCreatedAt).getTime() - new Date(a.latestCreatedAt).getTime()
  );
}

export default function DoctorDashboardPage() {
  const { user } = useAuth();
  const canAddPatient = user?.role === "doctor";

  const [rows, setRows] = useState<DoctorPatientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    getDoctorPatients()
      .then(setRows)
      .catch(() => setError("Unable to load patient list."))
      .finally(() => setLoading(false));
  }, []);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      `${r.firstName} ${r.lastName} ${r.reasonForVisit}`.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const groups = useMemo(() => groupByContact(filteredRows), [filteredRows]);
  const criticalCount = rows.filter((r) => r.riskLevel === "critical").length;

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-xs font-medium uppercase tracking-widest text-brass">
            Clinician view
          </span>
          <h1 className="font-display text-4xl text-pine">Patients grouped</h1>
          {criticalCount > 0 && (
            <p className="mt-1 text-sm font-medium text-risk-critical">
              {criticalCount} critical case{criticalCount > 1 ? "s" : ""} awaiting review
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            placeholder="Search for a patient or reason..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64 rounded-lg border border-sand-dark bg-paper-raised px-3.5 py-2 text-sm text-ink outline-none transition-colors focus:border-pine"
          />
          {canAddPatient && (
            <Link
              to="/doctor/patients/new"
              className="whitespace-nowrap rounded-lg bg-pine px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-pine-dark"
            >
              + Add patient
            </Link>
          )}
        </div>
      </div>

      {loading ? (
        <p className="text-ink-soft">Loading...</p>
      ) : error ? (
        <div className="rounded-2xl border border-risk-high/20 bg-risk-high/5 px-8 py-10 text-center">
          <p className="text-risk-high">{error}</p>
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-sand-dark bg-paper-raised px-8 py-16 text-center">
          <p className="text-ink-soft">
            {search ? "No results for this search." : "No patients at the moment."}
          </p>
          {!search && canAddPatient && (
            <Link
              to="/doctor/patients/new"
              className="mt-3 inline-block font-medium text-pine hover:text-pine-dark"
            >
              Add first patient →
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div
              key={group.key}
              className="overflow-hidden rounded-2xl border border-sand-dark/60 bg-paper-raised shadow-sm"
            >
              <div
                className={`flex items-center justify-between px-5 py-3 ${
                  group.needsReview ? "bg-sage-light/50" : "bg-sand/30"
                }`}
              >
                <span className="font-mono text-sm tracking-wide text-ink">
                  {group.phoneLabel}
                </span>
                {group.needsReview ? (
                  <span className="rounded-full bg-brass/15 px-3 py-1 text-xs font-medium text-brass">
                    To check — {group.rows.length} admissions
                  </span>
                ) : (
                  <span className="text-xs text-ink-soft">
                    {group.rows.length} admission{group.rows.length > 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {group.rows.map((r) => (
                <div
                  key={r.intakeId}
                  className="flex items-center justify-between border-t border-sand-dark/40 px-5 py-3.5 hover:bg-sage-light/20"
                >
                  <div>
                    <p className="font-medium text-ink">
                      {r.firstName} {r.lastName}
                      {!r.hasAccount && (
                        <span className="ml-2 rounded-full border border-brass/40 bg-brass/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-brass">
                          Direct admission
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-ink-soft">
                      {r.reasonForVisit} · {formatRelativeTime(r.createdAt)}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    {r.riskLevel && r.riskScore !== null ? (
                      <span className="inline-flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${riskDot[r.riskLevel]}`} />
                        <span className={`font-mono text-sm font-medium ${riskText[r.riskLevel]}`}>
                          {r.riskScore}
                        </span>
                      </span>
                    ) : (
                      <span className="text-sm text-ink-soft">—</span>
                    )}
                    <Link
                      to={`/risk-result/${r.intakeId}`}
                      className="text-sm font-medium text-pine hover:text-pine-dark"
                    >
                      View
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ))}

          <div className="flex flex-wrap items-center gap-5 rounded-2xl border border-sand-dark/60 bg-paper-raised px-5 py-3.5">
            {(["low", "medium", "high", "critical"] as RiskLevel[]).map((level) => (
              <span key={level} className="inline-flex items-center gap-2 text-sm text-ink-soft">
                <span className={`h-2 w-2 rounded-full ${riskDot[level]}`} />
                {riskLabel[level]}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}