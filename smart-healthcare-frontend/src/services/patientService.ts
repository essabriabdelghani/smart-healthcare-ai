import api from "./api";
import type {
  Patient,
  PatientIntakeForm,
  PatientProfile,
  PatientProfileForm,
  StaffPatientIntakeForm,
  DoctorPatientRow,
  RiskResult,
  RiskLevel,
  ExtractedEntity,
} from "../types/patient";

/* =========================================================
   API TYPES — reflètent exactement les schémas backend
========================================================= */

interface PatientIntakeApiResponse {
  id: string; // = intake_id
  patient_id: string;
  reason_for_visit: string;
  symptoms_text: string;
  medical_history: string;
  current_medications: string;
  allergies: string;
  temperature: number | null;
  blood_pressure: string | null;
  heart_rate: number | null;
  oxygen_saturation: number | null;
  additional_notes: string;
  status: string;
  created_at: string;
}

interface RiskAssessmentApiResponse {
  id: string;
  intake_id: string;
  risk_score: number;
  risk_level: RiskResult["level"];
  explanation: string;
  ai_confidence: number;
  reviewed_by: number | null;
  created_at: string;
}

interface PatientProfileApiResponse {
  id: string;
  user_id: number | null;
  created_by: number | null;
  first_name: string;
  last_name: string;
  gender: string;
  date_of_birth: string;
  blood_group: string | null;
  height: number | null;
  weight: number | null;
  emergency_contact: string | null;
  emergency_phone: string | null;
  created_at: string;
}

interface DoctorPatientRowApiResponse {
  intake_id: string;
  patient_id: string;
  first_name: string;
  last_name: string;
  gender: string;
  date_of_birth: string;
  reason_for_visit: string;
  symptoms_text: string;
  created_at: string;
  risk_score: number | null;
  risk_level: RiskLevel | null;
  has_account: boolean;
  emergency_phone: string | null;
}

interface ExtractedEntityApiResponse {
  id: string;
  intake_id: string;
  entity_type: string;
  entity_value: string;
  confidence: number | null;
  negated: boolean;
}

/* =========================================================
   MAPPING
========================================================= */

function toPatient(intake: PatientIntakeApiResponse): Patient {
  return {
    id: intake.id, // id de l'INTAKE — c'est celui qu'attend /risk-result/:intakeId
    patientId: intake.patient_id,
    reasonForVisit: intake.reason_for_visit,
    symptomsText: intake.symptoms_text,
    createdAt: intake.created_at,
  };
}

function toRiskResult(r: RiskAssessmentApiResponse): RiskResult {
  return {
    intakeId: r.intake_id,
    score: Number(r.risk_score),
    level: r.risk_level,
    explanation: r.explanation,
    modelConfidence: Number(r.ai_confidence),
    reviewedBy: r.reviewed_by,
  };
}

function toPatientProfile(p: PatientProfileApiResponse): PatientProfile {
  return {
    id: p.id,
    userId: p.user_id,
    createdBy: p.created_by,
    firstName: p.first_name,
    lastName: p.last_name,
    gender: p.gender,
    dateOfBirth: p.date_of_birth,
    bloodGroup: p.blood_group,
    height: p.height,
    weight: p.weight,
    emergencyContact: p.emergency_contact,
    emergencyPhone: p.emergency_phone,
    createdAt: p.created_at,
  };
}

function toDoctorPatientRow(r: DoctorPatientRowApiResponse): DoctorPatientRow {
  return {
    intakeId: r.intake_id,
    patientId: r.patient_id,
    firstName: r.first_name,
    lastName: r.last_name,
    gender: r.gender,
    dateOfBirth: r.date_of_birth,
    reasonForVisit: r.reason_for_visit,
    symptomsText: r.symptoms_text,
    createdAt: r.created_at,
    riskScore: r.risk_score,
    riskLevel: r.risk_level,
    hasAccount: r.has_account,
    emergencyPhone: r.emergency_phone,
  };
}

function toExtractedEntity(e: ExtractedEntityApiResponse): ExtractedEntity {
  return {
    id: e.id,
    intakeId: e.intake_id,
    entityType: e.entity_type,
    entityValue: e.entity_value,
    confidence: e.confidence,
    negated: e.negated,
  };
}

/* =========================================================
   PATIENT PROFILE  (identité — POST /api/patients)
========================================================= */

export async function getMyProfile(): Promise<PatientProfile | null> {
  try {
    const { data } = await api.get<PatientProfileApiResponse>("/patients/me");
    return toPatientProfile(data);
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 404) return null; // pas encore de profil : cas normal
    throw err;
  }
}

export async function createMyProfile(form: PatientProfileForm): Promise<PatientProfile> {
  if (!form.firstName.trim()) throw new Error("Le prénom est requis.");
  if (!form.lastName.trim()) throw new Error("Le nom est requis.");
  if (!form.dateOfBirth) throw new Error("La date de naissance est requise.");

  const body = {
    first_name: form.firstName.trim(),
    last_name: form.lastName.trim(),
    gender: form.gender,
    date_of_birth: form.dateOfBirth,
    blood_group: form.bloodGroup || null,
    height: form.height !== "" ? Number(form.height) : null,
    weight: form.weight !== "" ? Number(form.weight) : null,
    emergency_contact: form.emergencyContact || null,
    emergency_phone: form.emergencyPhone || null,
  };

  const { data } = await api.post<PatientProfileApiResponse>("/patients", body);
  return toPatientProfile(data);
}

/* =========================================================
   CREATE PATIENT INTAKE
   POST /api/patients/intake
   Le backend résout le Patient depuis current_user (get_or_create_patient) —
   ne JAMAIS envoyer patient_id ici.
========================================================= */

export async function submitIntakeForm(form: PatientIntakeForm): Promise<Patient> {
  if (!form.reasonForVisit.trim()) throw new Error("Le motif de consultation est requis.");
  if (!form.symptomsText.trim()) throw new Error("Merci de décrire au moins un symptôme.");

  const body = {
    reason_for_visit: form.reasonForVisit.trim(),
    symptoms_text: form.symptomsText.trim(),
    medical_history: form.medicalHistory?.trim() || "",
    current_medications: form.currentMedications?.trim() || "",
    allergies: form.allergies?.trim() || "",
    temperature: form.temperature !== "" ? Number(form.temperature) : null,
    blood_pressure: form.bloodPressure?.trim() || null,
    heart_rate: form.heartRate !== "" ? Number(form.heartRate) : null,
    oxygen_saturation: form.oxygenSaturation !== "" ? Number(form.oxygenSaturation) : null,
    additional_notes: form.additionalNotes?.trim() || "",
  };

  const { data } = await api.post<PatientIntakeApiResponse>("/patients/intake", body);
  return toPatient(data);
}

/* =========================================================
   GET ALL INTAKES (pour le Dashboard)
   GET /api/patients/intake
========================================================= */

export async function getPatients(): Promise<Patient[]> {
  const { data } = await api.get<PatientIntakeApiResponse[]>("/patients/intake");
  return data.map(toPatient);
}

/* =========================================================
   DASHBOARD MÉDECIN — POST /api/patients/intake/staff (réservé doctor/admin)
   Admission directe : identité + motif de visite, sans compte de connexion.
========================================================= */

export async function submitStaffIntakeForm(form: StaffPatientIntakeForm): Promise<Patient> {
  if (!form.firstName.trim()) throw new Error("Le prénom est requis.");
  if (!form.lastName.trim()) throw new Error("Le nom est requis.");
  if (!form.dateOfBirth) throw new Error("La date de naissance est requise.");
  if (!form.reasonForVisit.trim()) throw new Error("Le motif de consultation est requis.");
  if (!form.symptomsText.trim()) throw new Error("Merci de décrire au moins un symptôme.");

  const body = {
    first_name: form.firstName.trim(),
    last_name: form.lastName.trim(),
    gender: form.gender,
    date_of_birth: form.dateOfBirth,
    reason_for_visit: form.reasonForVisit.trim(),
    symptoms_text: form.symptomsText.trim(),
    medical_history: form.medicalHistory?.trim() || "",
    current_medications: form.currentMedications?.trim() || "",
    allergies: form.allergies?.trim() || "",
    temperature: form.temperature !== "" ? Number(form.temperature) : null,
    blood_pressure: form.bloodPressure?.trim() || null,
    heart_rate: form.heartRate !== "" ? Number(form.heartRate) : null,
    oxygen_saturation: form.oxygenSaturation !== "" ? Number(form.oxygenSaturation) : null,
    additional_notes: form.additionalNotes?.trim() || "",
  };

  const { data } = await api.post<PatientIntakeApiResponse>("/patients/intake/staff", body);
  return toPatient(data);
}

/* =========================================================
   DASHBOARD MÉDECIN — GET /api/dashboard/patients (réservé doctor/admin)
   Liste enrichie : identité + admission + risque en un seul appel.
========================================================= */

export async function getDoctorPatients(): Promise<DoctorPatientRow[]> {
  const { data } = await api.get<DoctorPatientRowApiResponse[]>("/dashboard/patients");
  return data.map(toDoctorPatientRow);
}

/* =========================================================
   GET INTAKE BY ID
   GET /api/patients/intake/{intake_id}
========================================================= */

export async function getPatientIntake(intakeId: string): Promise<Patient> {
  const { data } = await api.get<PatientIntakeApiResponse>(`/patients/intake/${intakeId}`);
  return toPatient(data);
}

/* =========================================================
   GET RISK RESULT
   GET /api/risk/{intake_id}
========================================================= */

export async function getRiskResult(intakeId: string): Promise<RiskResult> {
  const { data } = await api.get<RiskAssessmentApiResponse>(`/risk/${intakeId}`);
  return toRiskResult(data);
}

/* =========================================================
   GET EXTRACTED ENTITIES (résultat NLP)
   GET /api/patients/intake/{intake_id}/entities
========================================================= */

export async function getIntakeEntities(intakeId: string): Promise<ExtractedEntity[]> {
  const { data } = await api.get<ExtractedEntityApiResponse[]>(
    `/patients/intake/${intakeId}/entities`
  );
  return data.map(toExtractedEntity);
}