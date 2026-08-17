import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import {
  createClinicalNote,
  getClinicalNotes,
  getIntakeEntities,
  getPatientIntake,
  getRiskResult,
  reviewRiskAssessment,
} from "../services/patientService";
import { useAuth } from "../contexts/AuthContext";
import type { ClinicalNote, ExtractedEntity, RiskLevel, RiskResult } from "../types/patient";

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

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Mêmes seuils que score_to_level() côté backend (risk_scoring.py) —
// pour calculer le niveau correspondant au score ajusté par le médecin.
function scoreToLevel(score: number): RiskLevel {
  if (score >= 70) return "critical";
  if (score >= 40) return "high";
  if (score >= 15) return "medium";
  return "low";
}

export default function RiskResultPage() {
  const { intakeId } = useParams<{ intakeId: string }>();
  const { user } = useAuth();
  const canWriteNotes = user?.role === "doctor" || user?.role === "admin";

  const [result, setResult] = useState<RiskResult | null>(null);
  const [entities, setEntities] = useState<ExtractedEntity[]>([]);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [notes, setNotes] = useState<ClinicalNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [showAdjustForm, setShowAdjustForm] = useState(false);
  const [adjustScore, setAdjustScore] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  useEffect(() => {
    if (!intakeId) return;
    getRiskResult(intakeId)
      .then(setResult)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));

    getIntakeEntities(intakeId)
      .then(setEntities)
      .catch(() => setEntities([]));

    getPatientIntake(intakeId)
      .then((intake) => setPatientId(intake.patientId))
      .catch(() => setPatientId(null));
  }, [intakeId]);

  useEffect(() => {
    if (!patientId) {
      setNotesLoading(false);
      return;
    }
    getClinicalNotes(patientId)
      .then(setNotes)
      .catch(() => setNotes([]))
      .finally(() => setNotesLoading(false));
  }, [patientId]);

  async function handleAddNote(e: FormEvent) {
    e.preventDefault();
    if (!patientId) return;
    setSavingNote(true);
    setNoteError(null);
    try {
      const created = await createClinicalNote(patientId, newNote);
      setNotes((prev) => [created, ...prev]);
      setNewNote("");
    } catch (err: unknown) {
      const apiMessage = (err as { response?: { data?: { detail?: unknown } } })?.response?.data
        ?.detail;
      setNoteError(
        typeof apiMessage === "string"
          ? apiMessage
          : err instanceof Error
            ? err.message
            : "Impossible d'enregistrer la note."
      );
    } finally {
      setSavingNote(false);
    }
  }

  async function handleConfirmScore() {
    if (!intakeId) return;
    setReviewSubmitting(true);
    setReviewError(null);
    try {
      const updated = await reviewRiskAssessment(intakeId, { score: null, level: null, note: "" });
      setResult(updated);
    } catch (err: unknown) {
      setReviewError(err instanceof Error ? err.message : "Impossible de confirmer le score.");
    } finally {
      setReviewSubmitting(false);
    }
  }

  async function handleAdjustSubmit(e: FormEvent) {
    e.preventDefault();
    if (!intakeId) return;
    const score = Number(adjustScore);
    if (Number.isNaN(score) || score < 0 || score > 100) {
      setReviewError("Le score doit être un nombre entre 0 et 100.");
      return;
    }
    setReviewSubmitting(true);
    setReviewError(null);
    try {
      const updated = await reviewRiskAssessment(intakeId, {
        score,
        level: scoreToLevel(score),
        note: adjustNote,
      });
      setResult(updated);
      setShowAdjustForm(false);
      setAdjustScore("");
      setAdjustNote("");
    } catch (err: unknown) {
      setReviewError(err instanceof Error ? err.message : "Impossible d'ajuster le score.");
    } finally {
      setReviewSubmitting(false);
    }
  }

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
  const clinicalEntities = entities.filter((e) => !e.entityType.startsWith("generic:"));
  const presentEntities = clinicalEntities.filter((e) => !e.negated);
  const negatedEntities = clinicalEntities.filter((e) => e.negated);

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

        {presentEntities.length > 0 && (
          <>
            <hr className="my-8 border-sand-dark/60" />
            <h2 className="font-display text-lg text-pine">Éléments extraits automatiquement</h2>
            <p className="mt-1 text-sm text-ink-soft">
              Détectés par le module NLP à partir du texte libre saisi par le patient.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {presentEntities.map((e) => (
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

        {negatedEntities.length > 0 && (
          <>
            <p className="mb-2 mt-6 text-xs font-medium uppercase tracking-wide text-ink-soft">
              Explicitement niés par le patient (exclus du score)
            </p>
            <div className="flex flex-wrap gap-2">
              {negatedEntities.map((e) => (
                <span
                  key={e.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-sand-dark/40 bg-paper px-3 py-1.5 text-xs text-ink-soft line-through decoration-ink-soft/50"
                >
                  <span className="font-medium">{entityTypeLabel[e.entityType] ?? e.entityType}</span>
                  {e.entityValue}
                </span>
              ))}
            </div>
          </>
        )}

        <p className="mt-8 border-l-2 border-brass pl-4 text-sm italic text-ink-soft">
          Ce score assiste la décision clinique mais ne remplace jamais le jugement du clinicien.
        </p>

        <hr className="my-8 border-sand-dark/60" />

        <h2 className="font-display text-lg text-pine">Revue clinique</h2>

        {result.reviewedAt ? (
          <div className="mt-3 rounded-lg bg-paper px-4 py-3 text-sm">
            {result.overrideScore !== null ? (
              <p className="text-ink">
                Score ajusté par le médecin : <span className="font-mono font-medium">{result.overrideScore}</span>
                {result.overrideLevel && <> ({riskLabel[result.overrideLevel]})</>}
              </p>
            ) : (
              <p className="text-ink">Score IA confirmé sans modification.</p>
            )}
            {result.overrideNote && <p className="mt-1 text-ink-soft">{result.overrideNote}</p>}
            <p className="mt-1 text-xs text-ink-soft">Revu le {formatDateTime(result.reviewedAt)}</p>
          </div>
        ) : canWriteNotes ? (
          <p className="mt-1 text-sm text-ink-soft">Ce score n'a pas encore été revu par un clinicien.</p>
        ) : null}

        {canWriteNotes && (
          <div className="mt-4">
            {!showAdjustForm ? (
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleConfirmScore}
                  disabled={reviewSubmitting}
                  className="rounded-lg bg-pine px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-pine-dark disabled:opacity-60"
                >
                  {reviewSubmitting ? "..." : "Confirmer le score"}
                </button>
                <button
                  onClick={() => setShowAdjustForm(true)}
                  className="rounded-lg border border-sand-dark px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:border-pine hover:text-pine"
                >
                  Ajuster le score
                </button>
              </div>
            ) : (
              <form onSubmit={handleAdjustSubmit} className="space-y-3">
                <div className="flex items-end gap-3">
                  <label className="block">
                    <span className="text-xs font-medium uppercase tracking-wide text-ink-soft">
                      Nouveau score (0-100)
                    </span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={adjustScore}
                      onChange={(e) => setAdjustScore(e.target.value)}
                      required
                      className="mt-1.5 w-28 rounded-lg border border-sand-dark bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-pine"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAdjustForm(false)}
                    className="pb-2 text-sm text-ink-soft hover:text-ink"
                  >
                    Annuler
                  </button>
                </div>
                <label className="block">
                  <span className="text-xs font-medium uppercase tracking-wide text-ink-soft">
                    Justification (optionnel)
                  </span>
                  <textarea
                    value={adjustNote}
                    onChange={(e) => setAdjustNote(e.target.value)}
                    rows={2}
                    placeholder="Raison de l'ajustement..."
                    className="mt-1.5 w-full rounded-lg border border-sand-dark bg-paper px-3.5 py-2.5 text-sm text-ink outline-none focus:border-pine"
                  />
                </label>
                <button
                  type="submit"
                  disabled={reviewSubmitting}
                  className="rounded-lg bg-pine px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-pine-dark disabled:opacity-60"
                >
                  {reviewSubmitting ? "Enregistrement..." : "Enregistrer l'ajustement"}
                </button>
              </form>
            )}
            {reviewError && <p className="mt-2 text-sm text-risk-high">{reviewError}</p>}
          </div>
        )}
      </div>

      {patientId && (
        <div className="mt-6 rounded-2xl border border-sand-dark/60 bg-paper-raised p-8 shadow-sm">
          <h2 className="font-display text-lg text-pine">Notes cliniques</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Observations du médecin sur ce patient, visibles à chaque consultation.
          </p>

          {canWriteNotes && (
            <form onSubmit={handleAddNote} className="mt-5 space-y-3">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows={3}
                placeholder="Observation, décision clinique, suivi recommandé..."
                required
                className="w-full rounded-lg border border-sand-dark bg-paper px-3.5 py-2.5 text-sm text-ink outline-none transition-all placeholder:text-ink-soft/60 focus:border-pine focus:ring-2 focus:ring-pine/10"
              />
              {noteError && <p className="text-sm text-risk-high">{noteError}</p>}
              <button
                type="submit"
                disabled={savingNote || !newNote.trim()}
                className="rounded-lg bg-pine px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-pine-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingNote ? "Enregistrement..." : "Ajouter la note"}
              </button>
            </form>
          )}

          <hr className="my-6 border-sand-dark/60" />

          {notesLoading ? (
            <p className="text-sm text-ink-soft">Chargement des notes...</p>
          ) : notes.length === 0 ? (
            <p className="text-sm text-ink-soft">Aucune note clinique pour ce patient.</p>
          ) : (
            <ul className="space-y-4">
              {notes.map((n) => (
                <li key={n.id} className="rounded-lg bg-paper px-4 py-3">
                  <p className="whitespace-pre-wrap text-sm text-ink">{n.note}</p>
                  <p className="mt-2 text-xs text-ink-soft">
                    {n.doctorName ?? "Médecin"} · {formatDateTime(n.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}