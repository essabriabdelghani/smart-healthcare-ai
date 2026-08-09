import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { submitStaffIntakeForm } from "../services/patientService";
import type { StaffPatientIntakeForm } from "../types/patient";

const emptyForm: StaffPatientIntakeForm = {
  firstName: "",
  lastName: "",
  gender: "unspecified",
  dateOfBirth: "",
  reasonForVisit: "",
  symptomsText: "",
  medicalHistory: "",
  currentMedications: "",
  allergies: "",
  temperature: "",
  bloodPressure: "",
  heartRate: "",
  oxygenSaturation: "",
  additionalNotes: "",
};

const fieldClass =
  "mt-1.5 w-full rounded-lg border border-sand-dark bg-paper px-3.5 py-2.5 text-ink outline-none transition-all placeholder:text-ink-soft/60 focus:border-pine focus:ring-2 focus:ring-pine/10";

const labelClass = "text-xs font-medium uppercase tracking-wide text-ink-soft";

function StepHeader({ n, title, desc }: { n: string; title: string; desc: string }) {
  return (
    <div className="mb-6 flex items-start gap-4">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-brass/40 bg-brass/10 text-[11px] font-semibold text-brass">
        {n}
      </span>
      <div>
        <h2 className="font-display text-xl text-pine">{title}</h2>
        <p className="mt-1 text-sm text-ink-soft">{desc}</p>
      </div>
    </div>
  );
}

export default function AddPatientPage() {
  const [form, setForm] = useState<StaffPatientIntakeForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  function update<K extends keyof StaffPatientIntakeForm>(key: K, value: StaffPatientIntakeForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const created = await submitStaffIntakeForm(form);
      navigate(`/risk-result/${created.id}`);
    } catch (err: unknown) {
      const apiMessage = (err as { response?: { data?: { detail?: unknown } } })?.response?.data
        ?.detail;
      const clientMessage = err instanceof Error ? err.message : null;
      setError(
        typeof apiMessage === "string"
          ? apiMessage
          : clientMessage ?? "Impossible d'enregistrer ce patient. Veuillez réessayer."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <div className="mb-3 flex items-center gap-3">
          <div className="h-8 w-1 rounded-full bg-brass" />
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft">
            Admission directe
          </span>
        </div>
        <h1 className="font-display text-3xl text-pine sm:text-4xl">Ajouter un patient</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-soft">
          Ce dossier est créé sans compte de connexion pour le patient. Il n'a accès à aucune
          page de l'application ; seuls les médecins et administrateurs peuvent le consulter.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="overflow-hidden rounded-2xl border border-sand-dark/60 bg-paper-raised shadow-sm"
      >
        <section className="p-6 sm:p-8">
          <StepHeader n="1" title="Identité du patient" desc="Informations administratives de base." />
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className={labelClass}>Prénom</span>
              <input
                type="text"
                value={form.firstName}
                onChange={(e) => update("firstName", e.target.value)}
                required
                className={fieldClass}
              />
            </label>

            <label className="block">
              <span className={labelClass}>Nom</span>
              <input
                type="text"
                value={form.lastName}
                onChange={(e) => update("lastName", e.target.value)}
                required
                className={fieldClass}
              />
            </label>

            <label className="block">
              <span className={labelClass}>Date de naissance</span>
              <input
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => update("dateOfBirth", e.target.value)}
                required
                max={new Date().toISOString().split("T")[0]}
                className={fieldClass}
              />
            </label>

            <label className="block">
              <span className={labelClass}>Sexe</span>
              <select
                value={form.gender}
                onChange={(e) => update("gender", e.target.value as StaffPatientIntakeForm["gender"])}
                className={fieldClass}
              >
                <option value="unspecified">Non précisé</option>
                <option value="female">Féminin</option>
                <option value="male">Masculin</option>
                <option value="other">Autre</option>
              </select>
            </label>
          </div>
        </section>

        <div className="border-t border-sand-dark/60" />

        <section className="p-6 sm:p-8">
          <StepHeader n="2" title="Motif de consultation" desc="Décrivez la raison principale de la visite." />
          <div className="space-y-5">
            <label className="block">
              <span className={labelClass}>Motif de la visite</span>
              <input
                type="text"
                value={form.reasonForVisit}
                onChange={(e) => update("reasonForVisit", e.target.value)}
                placeholder="Ex. Douleurs abdominales"
                required
                className={fieldClass}
              />
            </label>

            <label className="block">
              <span className={labelClass}>Symptômes actuels</span>
              <textarea
                value={form.symptomsText}
                onChange={(e) => update("symptomsText", e.target.value)}
                rows={5}
                placeholder="Décrivez les symptômes, leur durée, leur évolution et leur intensité..."
                required
                className={`${fieldClass} resize-y`}
              />
            </label>
          </div>
        </section>

        <div className="border-t border-sand-dark/60" />

        <section className="p-6 sm:p-8">
          <StepHeader n="3" title="Antécédents et traitements" desc="Informations médicales pertinentes." />
          <div className="space-y-5">
            <label className="block">
              <span className={labelClass}>Antécédents médicaux</span>
              <textarea
                value={form.medicalHistory}
                onChange={(e) => update("medicalHistory", e.target.value)}
                rows={3}
                className={`${fieldClass} resize-y`}
              />
            </label>

            <label className="block">
              <span className={labelClass}>Médicaments actuels</span>
              <textarea
                value={form.currentMedications}
                onChange={(e) => update("currentMedications", e.target.value)}
                rows={2}
                className={`${fieldClass} resize-y`}
              />
            </label>

            <label className="block">
              <span className={labelClass}>Allergies</span>
              <input
                type="text"
                value={form.allergies}
                onChange={(e) => update("allergies", e.target.value)}
                className={fieldClass}
              />
            </label>
          </div>
        </section>

        <div className="border-t border-sand-dark/60" />

        <section className="p-6 sm:p-8">
          <StepHeader n="4" title="Constantes vitales" desc="Valeurs mesurées lors de l'admission, si disponibles." />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block">
              <span className={labelClass}>Température</span>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="30"
                  max="45"
                  value={form.temperature}
                  onChange={(e) => update("temperature", e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="37.0"
                  className={`${fieldClass} pr-12`}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-soft">
                  °C
                </span>
              </div>
            </label>

            <label className="block">
              <span className={labelClass}>Pression artérielle</span>
              <input
                type="text"
                value={form.bloodPressure}
                onChange={(e) => update("bloodPressure", e.target.value)}
                placeholder="120/80"
                className={fieldClass}
              />
            </label>

            <label className="block">
              <span className={labelClass}>Fréquence cardiaque</span>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="300"
                  value={form.heartRate}
                  onChange={(e) => update("heartRate", e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="72"
                  className={`${fieldClass} pr-14`}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-soft">
                  bpm
                </span>
              </div>
            </label>

            <label className="block">
              <span className={labelClass}>Saturation O₂</span>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={form.oxygenSaturation}
                  onChange={(e) =>
                    update("oxygenSaturation", e.target.value === "" ? "" : Number(e.target.value))
                  }
                  placeholder="98"
                  className={`${fieldClass} pr-10`}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-soft">
                  %
                </span>
              </div>
            </label>
          </div>
        </section>

        {error && (
          <div className="mx-6 mb-6 rounded-lg border border-risk-high/20 bg-risk-high/5 px-4 py-3 sm:mx-8">
            <p className="text-sm text-risk-high">{error}</p>
          </div>
        )}

        <div className="flex flex-col gap-4 border-t border-sand-dark/60 bg-paper px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p className="text-xs leading-5 text-ink-soft">
            Ce dossier sera immédiatement évalué par le moteur de risque.
          </p>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-pine px-6 py-3 text-sm font-medium text-paper transition-all hover:bg-pine-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Enregistrement..." : "Créer le dossier"}
          </button>
        </div>
      </form>
    </div>
  );
}