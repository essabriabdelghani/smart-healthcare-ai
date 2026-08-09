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
}

// Correspond à ExtractedEntityOut du backend
export interface ExtractedEntity {
  id: string;
  intakeId: string;
  entityType: string;
  entityValue: string;
  confidence: number | null;
}