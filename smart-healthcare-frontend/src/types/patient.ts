export interface PatientIntakeForm {
  reasonForVisit: string;
  symptomsText: string;
  medicalHistory: string;
  currentMedications: string;
  allergies: string;
  temperature: number | "";
  bloodPressure: string;
  heartRate: number | "";
  oxygenSaturation: number | "";
  additionalNotes: string;
}

export type Gender = "male" | "female" | "other" | "unspecified";

// Formulaire de création du profil patient — correspond à PatientCreate (backend)
export interface PatientProfileForm {
  firstName: string;
  lastName: string;
  gender: Gender;
  dateOfBirth: string; // YYYY-MM-DD
  bloodGroup: string;
  height: number | "";
  weight: number | "";
  emergencyContact: string;
  emergencyPhone: string;
}

// Correspond à la réponse PatientOut du backend
export interface PatientProfile {
  id: string;
  userId: number | null; // null = dossier "admission directe" (pas de compte)
  createdBy: number | null;
  firstName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string;
  bloodGroup: string | null;
  height: number | null;
  weight: number | null;
  emergencyContact: string | null;
  emergencyPhone: string | null;
  createdAt: string;
}

// Formulaire "Ajouter un patient" côté médecin/admin — identité + motif de
// visite en un seul écran, sans compte de connexion pour le patient.
export interface StaffPatientIntakeForm {
  firstName: string;
  lastName: string;
  gender: Gender;
  dateOfBirth: string;
  reasonForVisit: string;
  symptomsText: string;
  medicalHistory: string;
  currentMedications: string;
  allergies: string;
  temperature: number | "";
  bloodPressure: string;
  heartRate: number | "";
  oxygenSaturation: number | "";
  additionalNotes: string;
}

// Une ligne du dashboard médecin (GET /dashboard/patients)
export interface DoctorPatientRow {
  intakeId: string;
  patientId: string;
  firstName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string;
  reasonForVisit: string;
  symptomsText: string;
  createdAt: string;
  riskScore: number | null;
  riskLevel: RiskLevel | null;
  hasAccount: boolean;
  emergencyPhone: string | null;
}

export type RiskLevel = "low" | "medium" | "high" | "critical";

// Résultat de la soumission d'une admission — juste de quoi router vers la page de risque
export interface Patient {
  id: string; // id du PatientIntake (nécessaire pour /risk-result/:intakeId)
  patientId: string; // id du profil Patient
  reasonForVisit: string;
  symptomsText: string;
  createdAt: string;
}

// Correspond à la réponse RiskAssessmentOut du backend
export interface RiskResult {
  intakeId: string;
  score: number;
  level: RiskLevel;
  explanation: string;
  modelConfidence: number;
  reviewedBy: number | null;
  reviewedAt: string | null;
  overrideScore: number | null;
  overrideLevel: RiskLevel | null;
  overrideNote: string | null;
}

// Correspond à ExtractedEntityOut du backend
export interface ExtractedEntity {
  id: string;
  intakeId: string;
  entityType: string;
  entityValue: string;
  confidence: number | null;
  negated: boolean;
}

// Correspond à ClinicalNoteOut du backend
export interface ClinicalNote {
  id: string;
  patientId: string;
  doctorId: number | null;
  doctorName: string | null;
  note: string;
  createdAt: string;
}

// Correspond à DoctorOption du backend
export interface DoctorOption {
  id: number;
  fullName: string;
}

// Formulaire "Nouveau rendez-vous"
export interface AppointmentForm {
  patientId: string;
  doctorId: number | "";
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  notes: string; // motif
}

// Correspond à AppointmentOut du backend
export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: number | null;
  doctorName: string | null;
  appointmentDate: string;
  status: string;
  notes: string | null;
  lastRiskLevel: RiskLevel | null;
}

// Correspond à DashboardStatsOut du backend
export interface DashboardStats {
  totalPatients: number;
  totalIntakes: number;
  totalAssessments: number;
  totalUsers: number;
  doctorsCount: number;
  lowRisk: number;
  mediumRisk: number;
  highRisk: number;
  criticalRisk: number;
}

// Correspond à AuditLogEntry du backend
export interface AuditLogEntry {
  intakeId: string;
  patientName: string;
  doctorName: string | null;
  aiScore: number;
  aiLevel: RiskLevel;
  overrideScore: number | null;
  overrideLevel: RiskLevel | null;
  wasModified: boolean;
  reviewedAt: string;
}