import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { createMyProfile, getMyProfile, submitIntakeForm } from "../services/patientService";
import type { PatientIntakeForm, PatientProfileForm } from "../types/patient";

const emptyIntake: PatientIntakeForm = {
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

const emptyProfile: PatientProfileForm = {
  firstName: "",
  lastName: "",
  gender: "unspecified",
  dateOfBirth: "",
  bloodGroup: "",
  height: "",
  weight: "",
  emergencyContact: "",
  emergencyPhone: "",
};

const fieldClass =
  "mt-1.5 w-full rounded-lg border border-sand-dark bg-paper px-3.5 py-2.5 text-ink outline-none transition-all placeholder:text-ink-soft/60 focus:border-pine focus:ring-2 focus:ring-pine/10";

const labelClass = "text-xs font-medium uppercase tracking-wide text-ink-soft";

function StepBadge({ n }: { n: string }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-brass/40 bg-brass/10 text-[11px] font-semibold text-brass">
      {n}
    </span>
  );
}

function StepHeader({ n, title, desc }: { n: string; title: string; desc: string }) {
  return (
    <div className="mb-6 flex items-start gap-4">
      <StepBadge n={n} />
      <div>
        <h2 className="font-display text-xl text-pine">{title}</h2>
        <p className="mt-1 text-sm text-ink-soft">{desc}</p>
      </div>
    </div>
  );
}

export default function PatientFormPage() {
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);

  const [profile, setProfile] = useState<PatientProfileForm>(emptyProfile);
  const [intake, setIntake] = useState<PatientIntakeForm>(emptyIntake);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    getMyProfile()
      .then((p) => setHasProfile(p !== null))
      .catch(() => setHasProfile(false))
      .finally(() => setCheckingProfile(false));
  }, []);

  function updateProfile<K extends keyof PatientProfileForm>(key: K, value: PatientProfileForm[K]) {
    setProfile((prev) => ({ ...prev, [key]: value }));
  }

  function updateIntake<K extends keyof PatientIntakeForm>(key: K, value: PatientIntakeForm[K]) {
    setIntake((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (!hasProfile) {
        await createMyProfile(profile);
      }
      const created = await submitIntakeForm(intake);
      navigate(`/risk-result/${created.id}`);
    } catch (err: unknown) {
      const apiMessage = (err as { response?: { data?: { detail?: unknown } } })?.response?.data
        ?.detail;
      const clientMessage = err instanceof Error ? err.message : null;
      setError(
        typeof apiMessage === "string"
          ? apiMessage
          : clientMessage ?? "Unable to submit patient record. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (checkingProfile) {
    return <p className="text-ink-soft">Loading...</p>;
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <div className="mb-3 flex items-center gap-3">
          <div className="h-8 w-1 rounded-full bg-pine" />
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft">
            Clinical record
          </span>
        </div>
        <h1 className="font-display text-3xl text-pine sm:text-4xl">Patient admission</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-soft">
          {hasProfile
            ? "Describe the reason for the visit to initiate the risk assessment."
            : "First complete your profile, then describe the reason for the visit."}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="overflow-hidden rounded-2xl border border-sand-dark/60 bg-paper-raised shadow-sm"
      >
        {/* 00. Patient profile — only if not yet created */}
        {!hasProfile && (
          <>
            <section className="p-6 sm:p-8">
              <StepHeader
                n="0"
                title="Patient profile"
                desc="This information is only requested once."
              />

              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block">
                  <span className={labelClass}>First name</span>
                  <input
                    type="text"
                    value={profile.firstName}
                    onChange={(e) => updateProfile("firstName", e.target.value)}
                    required
                    className={fieldClass}
                  />
                </label>

                <label className="block">
                  <span className={labelClass}>Last name</span>
                  <input
                    type="text"
                    value={profile.lastName}
                    onChange={(e) => updateProfile("lastName", e.target.value)}
                    required
                    className={fieldClass}
                  />
                </label>

                <label className="block">
                  <span className={labelClass}>Date of birth</span>
                  <input
                    type="date"
                    value={profile.dateOfBirth}
                    onChange={(e) => updateProfile("dateOfBirth", e.target.value)}
                    required
                    max={new Date().toISOString().split("T")[0]}
                    className={fieldClass}
                  />
                </label>

                <label className="block">
                  <span className={labelClass}>Gender</span>
                  <select
                    value={profile.gender}
                    onChange={(e) =>
                      updateProfile("gender", e.target.value as PatientProfileForm["gender"])
                    }
                    className={fieldClass}
                  >
                    <option value="unspecified">Prefer not to say</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="other">Other</option>
                  </select>
                </label>

                <label className="block">
                  <span className={labelClass}>Blood group</span>
                  <select
                    value={profile.bloodGroup}
                    onChange={(e) => updateProfile("bloodGroup", e.target.value)}
                    className={fieldClass}
                  >
                    <option value="">Unknown</option>
                    {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                      <option key={bg} value={bg}>
                        {bg}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid grid-cols-2 gap-5">
                  <label className="block">
                    <span className={labelClass}>Height (cm)</span>
                    <input
                      type="number"
                      min="0"
                      max="300"
                      value={profile.height}
                      onChange={(e) =>
                        updateProfile("height", e.target.value === "" ? "" : Number(e.target.value))
                      }
                      placeholder="170"
                      className={fieldClass}
                    />
                  </label>
                  <label className="block">
                    <span className={labelClass}>Weight (kg)</span>
                    <input
                      type="number"
                      min="0"
                      max="500"
                      value={profile.weight}
                      onChange={(e) =>
                        updateProfile("weight", e.target.value === "" ? "" : Number(e.target.value))
                      }
                      placeholder="68"
                      className={fieldClass}
                    />
                  </label>
                </div>

                <label className="block">
                  <span className={labelClass}>Emergency contact</span>
                  <input
                    type="text"
                    value={profile.emergencyContact}
                    onChange={(e) => updateProfile("emergencyContact", e.target.value)}
                    placeholder="Contact name"
                    className={fieldClass}
                  />
                </label>

                <label className="block">
                  <span className={labelClass}>Emergency phone</span>
                  <input
                    type="tel"
                    value={profile.emergencyPhone}
                    onChange={(e) => updateProfile("emergencyPhone", e.target.value)}
                    placeholder="+212 6XX XXX XXX"
                    className={fieldClass}
                  />
                </label>
              </div>
            </section>

            <div className="border-t border-sand-dark/60" />
          </>
        )}

        {/* 01. Consultation */}
        <section className="p-6 sm:p-8">
          <StepHeader
            n="1"
            title="Reason for consultation"
            desc="Describe the main reason for the consultation."
          />

          <div className="space-y-5">
            <label className="block">
              <span className={labelClass}>Reason for visit</span>
              <input
                type="text"
                value={intake.reasonForVisit}
                onChange={(e) => updateIntake("reasonForVisit", e.target.value)}
                placeholder="E.g. Abdominal pain"
                required
                className={fieldClass}
              />
            </label>

            <label className="block">
              <span className={labelClass}>Current symptoms</span>
              <textarea
                value={intake.symptomsText}
                onChange={(e) => updateIntake("symptomsText", e.target.value)}
                rows={5}
                placeholder="Describe the symptoms, duration, progression and intensity..."
                required
                className={`${fieldClass} resize-y`}
              />
            </label>
          </div>
        </section>

        <div className="border-t border-sand-dark/60" />

        {/* 02. Medical history */}
        <section className="p-6 sm:p-8">
          <StepHeader
            n="2"
            title="Medical history and treatments"
            desc="Relevant medical information for the assessment."
          />

          <div className="space-y-5">
            <label className="block">
              <span className={labelClass}>Medical history</span>
              <textarea
                value={intake.medicalHistory}
                onChange={(e) => updateIntake("medicalHistory", e.target.value)}
                rows={4}
                placeholder="Chronic conditions, surgeries, hospitalizations..."
                className={`${fieldClass} resize-y`}
              />
            </label>

            <label className="block">
              <span className={labelClass}>Current medications</span>
              <textarea
                value={intake.currentMedications}
                onChange={(e) => updateIntake("currentMedications", e.target.value)}
                rows={3}
                placeholder="Medication names and dosage if known..."
                className={`${fieldClass} resize-y`}
              />
            </label>

            <label className="block">
              <span className={labelClass}>Allergies</span>
              <input
                type="text"
                value={intake.allergies}
                onChange={(e) => updateIntake("allergies", e.target.value)}
                placeholder="Medication, food or other allergies..."
                className={fieldClass}
              />
            </label>
          </div>
        </section>

        <div className="border-t border-sand-dark/60" />

        {/* 03. Vital signs */}
        <section className="p-6 sm:p-8">
          <StepHeader
            n="3"
            title="Vital signs"
            desc="Measurements taken upon admission, if available."
          />

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block">
              <span className={labelClass}>Temperature</span>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="30"
                  max="45"
                  value={intake.temperature}
                  onChange={(e) =>
                    updateIntake("temperature", e.target.value === "" ? "" : Number(e.target.value))
                  }
                  placeholder="37.0"
                  className={`${fieldClass} pr-12`}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-soft">
                  °C
                </span>
              </div>
            </label>

            <label className="block">
              <span className={labelClass}>Blood pressure</span>
              <input
                type="text"
                value={intake.bloodPressure}
                onChange={(e) => updateIntake("bloodPressure", e.target.value)}
                placeholder="120/80"
                className={fieldClass}
              />
            </label>

            <label className="block">
              <span className={labelClass}>Heart rate</span>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="300"
                  value={intake.heartRate}
                  onChange={(e) =>
                    updateIntake("heartRate", e.target.value === "" ? "" : Number(e.target.value))
                  }
                  placeholder="72"
                  className={`${fieldClass} pr-14`}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-soft">
                  bpm
                </span>
              </div>
            </label>

            <label className="block">
              <span className={labelClass}>O₂ saturation</span>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={intake.oxygenSaturation}
                  onChange={(e) =>
                    updateIntake(
                      "oxygenSaturation",
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
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

        <div className="border-t border-sand-dark/60" />

        {/* 04. Notes */}
        <section className="p-6 sm:p-8">
          <StepHeader n="4" title="Additional information" desc="Anything else useful for the clinician." />

          <label className="block">
            <span className={labelClass}>Additional notes</span>
            <textarea
              value={intake.additionalNotes}
              onChange={(e) => updateIntake("additionalNotes", e.target.value)}
              rows={4}
              placeholder="Any additional information useful for the healthcare professional..."
              className={`${fieldClass} resize-y`}
            />
          </label>
        </section>

        {error && (
          <div className="mx-6 mb-6 rounded-lg border border-risk-high/20 bg-risk-high/5 px-4 py-3 sm:mx-8">
            <p className="text-sm text-risk-high">{error}</p>
          </div>
        )}

        <div className="flex flex-col gap-4 border-t border-sand-dark/60 bg-paper px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p className="text-xs leading-5 text-ink-soft">
            The information entered will be used to prepare the clinical assessment.
          </p>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-pine px-6 py-3 text-sm font-medium text-paper transition-all hover:bg-pine-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Assessing..." : "Submit record"}
          </button>
        </div>
      </form>
    </div>
  );
}