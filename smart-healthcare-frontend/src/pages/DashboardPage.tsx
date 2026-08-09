import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getPatients, getRiskResult } from "../services/patientService";
import type { Patient, RiskLevel } from "../types/patient";

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

export default function DashboardPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [risks, setRisks] = useState<Record<string, RiskLevel | undefined>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    getPatients()
      .then(async (list) => {
        setPatients(list);
        setLoading(false);

        // Le risque vit dans une table séparée (RiskAssessment, clé = intake_id) :
        // on le récupère intake par intake, sans bloquer l'affichage de la liste.
        const settled = await Promise.allSettled(
          list.map((p) => getRiskResult(p.id).then((r) => [p.id, r.level] as const))
        );
        const next: Record<string, RiskLevel | undefined> = {};
        for (const result of settled) {
          if (result.status === "fulfilled") {
            const [id, level] = result.value;
            next[id] = level;
          }
        }
        setRisks(next);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = patients.filter((p) =>
    p.reasonForVisit.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-xs font-medium uppercase tracking-widest text-brass">
            Vue d'ensemble
          </span>
          <h1 className="font-display text-4xl text-pine">Admissions</h1>
        </div>
        <input
          placeholder="Rechercher par motif..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64 rounded-lg border border-sand-dark bg-paper-raised px-3.5 py-2 text-sm text-ink outline-none transition-colors focus:border-pine"
        />
      </div>

      {loading ? (
        <p className="text-ink-soft">Chargement...</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-sand-dark bg-paper-raised px-8 py-16 text-center">
          <p className="text-ink-soft">Aucune admission pour le moment.</p>
          <Link
            to="/patient-form"
            className="mt-3 inline-block font-medium text-pine hover:text-pine-dark"
          >
            Créer la première admission →
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-sand-dark/60 bg-paper-raised shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-sand-dark/60 text-xs uppercase tracking-wide text-ink-soft">
                <th className="px-5 py-3 font-medium">Motif</th>
                <th className="px-5 py-3 font-medium">Symptômes</th>
                <th className="px-5 py-3 font-medium">Admission</th>
                <th className="px-5 py-3 font-medium">Risque</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const level = risks[p.id];
                return (
                  <tr
                    key={p.id}
                    className="border-b border-sand-dark/40 last:border-0 hover:bg-sage-light/30"
                  >
                    <td className="px-5 py-3.5 font-medium text-ink">{p.reasonForVisit}</td>
                    <td className="max-w-xs truncate px-5 py-3.5 text-ink-soft">
                      {p.symptomsText}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-ink-soft">
                      {new Date(p.createdAt).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-5 py-3.5">
                      {level ? (
                        <span className="inline-flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${riskDot[level]}`} />
                          {riskLabel[level]}
                        </span>
                      ) : (
                        <span className="text-ink-soft">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        to={`/risk-result/${p.id}`}
                        className="font-medium text-pine hover:text-pine-dark"
                      >
                        Voir →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}