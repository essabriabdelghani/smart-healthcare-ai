import { useEffect, useState, type FormEvent } from "react";
import {
  createAppointment,
  getClinicDoctors,
  getClinicPatients,
  getUpcomingAppointments,
} from "../services/appointmentService";
import { useToast } from "../contexts/ToastContext";
import { useAuth } from "../contexts/AuthContext";
import type { Appointment, AppointmentForm, DoctorOption, PatientProfile, RiskLevel } from "../types/patient";

const emptyForm: AppointmentForm = {
  patientId: "",
  doctorId: "",
  date: "",
  time: "",
  notes: "",
};

const fieldClass =
  "mt-1.5 w-full rounded-lg border border-sand-dark bg-paper px-3.5 py-2.5 text-sm text-ink outline-none transition-all focus:border-pine focus:ring-2 focus:ring-pine/10";

const labelClass = "text-xs font-medium uppercase tracking-wide text-ink-soft";

// Même code couleur que le niveau de risque, pour repérer d'un coup d'œil
// les rendez-vous prioritaires sans rouvrir le dossier complet.
const borderByRisk: Record<RiskLevel | "none", string> = {
  critical: "border-l-4 border-risk-critical",
  high: "border-l-4 border-risk-high",
  medium: "border-l-4 border-risk-medium",
  low: "border-l-4 border-risk-low",
  none: "border-l-4 border-sand-dark",
};

function formatAppointmentDate(iso: string): { day: string; time: string } {
  const d = new Date(iso);
  return {
    day: d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
    time: d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
  };
}

export default function AppointmentsPage() {
  const { user } = useAuth();
  const { notify } = useToast();

  const [form, setForm] = useState<AppointmentForm>(emptyForm);
  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getClinicPatients().then(setPatients).catch(() => setPatients([]));
    getClinicDoctors().then((docs) => {
      setDoctors(docs);
      // Un médecin planifie généralement pour lui-même : pré-sélectionné,
      // mais reste modifiable (utile pour un admin ou un secrétariat).
      if (user?.role === "doctor") {
        const self = docs.find((d) => d.fullName === user.full_name);
        if (self) setForm((prev) => ({ ...prev, doctorId: self.id }));
      }
    }).catch(() => setDoctors([]));
    refreshAppointments();
  }, [user]);

  function refreshAppointments() {
    setLoadingList(true);
    getUpcomingAppointments()
      .then(setAppointments)
      .catch(() => setAppointments([]))
      .finally(() => setLoadingList(false));
  }

  function update<K extends keyof AppointmentForm>(key: K, value: AppointmentForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const created = await createAppointment(form);
      const { day, time } = formatAppointmentDate(created.appointmentDate);

      // Notification automatique : le médecin sait immédiatement que le
      // rendez-vous est confirmé, avec le nom du patient et le créneau.
      notify("Rendez-vous confirmé", `${created.patientName} — ${day} à ${time}`);

      setForm((prev) => ({ ...emptyForm, doctorId: prev.doctorId }));
      refreshAppointments();
    } catch (err: unknown) {
      const apiMessage = (err as { response?: { data?: { detail?: unknown } } })?.response?.data
        ?.detail;
      setError(
        typeof apiMessage === "string"
          ? apiMessage
          : err instanceof Error
            ? err.message
            : "Impossible de planifier le rendez-vous."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <span className="text-xs font-medium uppercase tracking-widest text-brass">Planning</span>
        <h1 className="font-display text-4xl text-pine">Rendez-vous</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* Formulaire */}
        <div className="rounded-2xl border border-sand-dark/60 bg-paper-raised p-6 shadow-sm">
          <h2 className="font-display text-lg text-pine">Nouveau rendez-vous</h2>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <label className="block">
              <span className={labelClass}>Patient</span>
              <select
                value={form.patientId}
                onChange={(e) => update("patientId", e.target.value)}
                required
                className={fieldClass}
              >
                <option value="">Sélectionner un patient</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.firstName} {p.lastName}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className={labelClass}>Médecin</span>
              <select
                value={form.doctorId}
                onChange={(e) => update("doctorId", e.target.value === "" ? "" : Number(e.target.value))}
                required
                className={fieldClass}
              >
                <option value="">Sélectionner un médecin</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    Dr. {d.fullName}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className={labelClass}>Date</span>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => update("date", e.target.value)}
                  required
                  className={fieldClass}
                />
              </label>
              <label className="block">
                <span className={labelClass}>Heure</span>
                <input
                  type="time"
                  value={form.time}
                  onChange={(e) => update("time", e.target.value)}
                  required
                  className={fieldClass}
                />
              </label>
            </div>

            <label className="block">
              <span className={labelClass}>Motif</span>
              <input
                type="text"
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                placeholder="Ex. Contrôle post-consultation cardiologie"
                className={fieldClass}
              />
            </label>

            {error && <p className="text-sm text-risk-high">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-pine px-4 py-3 text-sm font-medium text-paper transition-colors hover:bg-pine-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Planification..." : "Planifier le rendez-vous"}
            </button>
          </form>
        </div>

        {/* Liste des prochains rendez-vous */}
        <div>
          <h2 className="mb-3 text-sm font-medium text-ink-soft">Prochains rendez-vous</h2>

          {loadingList ? (
            <p className="text-sm text-ink-soft">Chargement...</p>
          ) : appointments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-sand-dark bg-paper-raised px-6 py-10 text-center">
              <p className="text-sm text-ink-soft">Aucun rendez-vous à venir.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {appointments.map((a) => {
                const { day, time } = formatAppointmentDate(a.appointmentDate);
                return (
                  <div
                    key={a.id}
                    className={`flex items-center justify-between rounded-xl border border-sand-dark/60 bg-paper-raised px-5 py-4 shadow-sm ${
                      borderByRisk[a.lastRiskLevel ?? "none"]
                    }`}
                  >
                    <div>
                      <p className="font-medium text-ink">{a.patientName}</p>
                      <p className="text-sm text-ink-soft">{a.notes || "Consultation"}</p>
                    </div>
                    <div className="text-right font-mono text-sm text-ink-soft">
                      <p>{day}</p>
                      <p>{time}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}