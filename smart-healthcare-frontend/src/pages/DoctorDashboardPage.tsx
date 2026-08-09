import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDoctorPatients } from "../services/patientService";
import type { DoctorPatientRow, RiskLevel } from "../types/patient";

const riskDot: Record<RiskLevel, string> = {
  low: "bg-risk-low",
  medium: "bg-risk-medium",
  high: "bg-risk-high",
  critical: "bg-risk-critical",
};

const riskLabel: Record<RiskLevel, string> = {
  low: "Faible",
  medium: "Modéré",
  high: "Élevé",
  critical: "Critique",
};

export default function DoctorDashboardPage() {
  const [rows, setRows] = useState<DoctorPatientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    getDoctorPatients()
      .then(setRows)
      .catch(() => setError("Impossible de charger la liste des patients."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = rows.filter((r) =>
    `${r.firstName} ${r.lastName} ${r.reasonForVisit}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const criticalCount = rows.filter((r) => r.riskLevel === "critical").length;

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-xs font-medium uppercase tracking-widest text-brass">
            Vue clinicien
          </span>
          <h1 className="font-display text-4xl text-pine">Patients</h1>
          {criticalCount > 0 && (
            <p className="mt-1 text-sm font-medium text-risk-critical">
              {criticalCount} cas critique{criticalCount > 1 ? "s" : ""} en attente de revue
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            placeholder="Rechercher un patient ou un motif..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64 rounded-lg border border-sand-dark bg-paper-raised px-3.5 py-2 text-sm text-ink outline-none transition-colors focus:border-pine"
          />
          <Link
            to="/doctor/patients/new"
            className="whitespace-nowrap rounded-lg bg-pine px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-pine-dark"
          >
            + Ajouter un patient
          </Link>
        </div>
      </div>

      {loading ? (
        <p className="text-ink-soft">Chargement...</p>
      ) : error ? (
        <div className="rounded-2xl border border-risk-high/20 bg-risk-high/5 px-8 py-10 text-center">
          <p className="text-risk-high">{error}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-sand-dark bg-paper-raised px-8 py-16 text-center">
          <p className="text-ink-soft">Aucun patient pour le moment.</p>
          <Link
            to="/doctor/patients/new"
            className="mt-3 inline-block font-medium text-pine hover:text-pine-dark"
          >
            Ajouter le premier patient →
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-sand-dark/60 bg-paper-raised shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-sand-dark/60 text-xs uppercase tracking-wide text-ink-soft">
                <th className="px-5 py-3 font-medium">Patient</th>
                <th className="px-5 py-3 font-medium">Naissance</th>
                <th className="px-5 py-3 font-medium">Motif</th>
                <th className="px-5 py-3 font-medium">Admission</th>
                <th className="px-5 py-3 font-medium">Risque</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr
                  key={r.intakeId}
                  className="border-b border-sand-dark/40 last:border-0 hover:bg-sage-light/30"
                >
                  <td className="px-5 py-3.5 font-medium text-ink">
                    {r.firstName} {r.lastName}
                    {!r.hasAccount && (
                      <span className="ml-2 rounded-full border border-brass/40 bg-brass/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-brass">
                        Admission directe
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-xs text-ink-soft">
                    {r.dateOfBirth}
                  </td>
                  <td className="px-5 py-3.5 text-ink-soft">{r.reasonForVisit}</td>
                  <td className="px-5 py-3.5 font-mono text-xs text-ink-soft">
                    {new Date(r.createdAt).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-5 py-3.5">
                    {r.riskLevel ? (
                      <span className="inline-flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${riskDot[r.riskLevel]}`} />
                        {riskLabel[r.riskLevel]}
                      </span>
                    ) : (
                      <span className="text-ink-soft">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Link
                      to={`/risk-result/${r.intakeId}`}
                      className="font-medium text-pine hover:text-pine-dark"
                    >
                      Voir →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}