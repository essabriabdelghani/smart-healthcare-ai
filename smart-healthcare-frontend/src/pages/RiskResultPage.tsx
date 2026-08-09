import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getIntakeEntities, getRiskResult } from "../services/patientService";
import type { ExtractedEntity, RiskLevel, RiskResult } from "../types/patient";

const riskColor: Record<RiskLevel, string> = {
  low: "var(--color-risk-low)",
  medium: "var(--color-risk-medium)",
  high: "var(--color-risk-high)",
  critical: "var(--color-risk-critical)",
};

const riskLabel: Record<RiskLevel, string> = {
  low: "Risque faible",
  medium: "Risque modéré",
  high: "Risque élevé",
  critical: "Risque critique",
};

const entityTypeLabel: Record<string, string> = {
  symptom: "Symptôme",
  disease: "Antécédent / maladie",
  medication: "Médicament",
  allergy: "Allergie",
};

function RiskGauge({ score, level }: { score: number; level: RiskLevel }) {
  const radius = 72;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);
  const color = riskColor[level];

  return (
    <svg viewBox="0 0 180 180" className="h-44 w-44 -rotate-90">
      <circle cx="90" cy="90" r={radius} fill="none" stroke="var(--color-sand)" strokeWidth="12" />
      <circle
        cx="90"
        cy="90"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
    </svg>
  );
}

// Le backend renvoie "explanation" comme une phrase unique
// (ex: "Chest pain reported (+35); High fever 38.6°C (+20)").
// On la redécoupe uniquement pour l'affichage en liste.
function splitExplanation(explanation: string): string[] {
  return explanation
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function RiskResultPage() {
  const { intakeId } = useParams<{ intakeId: string }>();
  const [result, setResult] = useState<RiskResult | null>(null);
  const [entities, setEntities] = useState<ExtractedEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!intakeId) return;
    getRiskResult(intakeId)
      .then(setResult)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));

    getIntakeEntities(intakeId)
      .then(setEntities)
      .catch(() => setEntities([]));
  }, [intakeId]);

  if (loading) return <p className="text-ink-soft">Chargement...</p>;

  if (notFound || !result) {
    return (
      <div className="rounded-2xl border border-dashed border-sand-dark bg-paper-raised px-8 py-16 text-center">
        <p className="text-ink-soft">Aucun résultat de risque pour cette admission.</p>
        <Link to="/dashboard" className="mt-3 inline-block font-medium text-pine hover:text-pine-dark">
          ← Retour aux admissions
        </Link>
      </div>
    );
  }

  const factors = splitExplanation(result.explanation);
  const clinicalEntities = entities.filter((e) => !e.entityType.startsWith("spacy:"));

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <span className="text-xs font-medium uppercase tracking-widest text-brass">
          Triage assisté par IA
        </span>
        <h1 className="font-display text-4xl text-pine">Évaluation du risque</h1>
      </div>

      <div className="rounded-2xl border border-sand-dark/60 bg-paper-raised p-8 shadow-sm">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-center sm:gap-10">
          <div className="relative flex items-center justify-center">
            <RiskGauge score={result.score} level={result.level} />
            <div className="absolute flex flex-col items-center">
              <span className="font-mono text-4xl font-medium text-ink">{result.score}</span>
              <span className="font-mono text-xs text-ink-soft">/ 100</span>
            </div>
          </div>
          <div className="text-center sm:text-left">
            <p className="font-display text-2xl" style={{ color: riskColor[result.level] }}>
              {riskLabel[result.level]}
            </p>
            <p className="mt-1 text-sm text-ink-soft">
              Confiance du modèle : {(result.modelConfidence * 100).toFixed(0)}%
            </p>
          </div>
        </div>

        <hr className="my-8 border-sand-dark/60" />

        <h2 className="font-display text-lg text-pine">Facteurs contributifs</h2>
        {factors.length === 0 ? (
          <p className="mt-2 text-sm text-ink-soft">Aucun facteur de risque identifié.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {factors.map((f) => (
              <li key={f} className="rounded-lg bg-paper px-4 py-2.5 text-sm text-ink">
                {f}
              </li>
            ))}
          </ul>
        )}

        {clinicalEntities.length > 0 && (
          <>
            <hr className="my-8 border-sand-dark/60" />
            <h2 className="font-display text-lg text-pine">Éléments extraits automatiquement</h2>
            <p className="mt-1 text-sm text-ink-soft">
              Détectés par le module NLP à partir du texte libre saisi par le patient.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {clinicalEntities.map((e) => (
                <span
                  key={e.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-sand-dark bg-paper px-3 py-1.5 text-xs text-ink"
                >
                  <span className="font-medium text-brass">{entityTypeLabel[e.entityType] ?? e.entityType}</span>
                  {e.entityValue}
                </span>
              ))}
            </div>
          </>
        )}

        <p className="mt-8 border-l-2 border-brass pl-4 text-sm italic text-ink-soft">
          Ce score assiste la décision clinique mais ne remplace jamais le jugement du clinicien.
        </p>
      </div>
    </div>
  );
}