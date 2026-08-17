import api from "./api";
import type { AuditLogEntry, DashboardStats } from "../types/patient";

interface DashboardStatsApiResponse {
  total_patients: number;
  total_intakes: number;
  total_assessments: number;
  total_users: number;
  doctors_count: number;
  low_risk: number;
  medium_risk: number;
  high_risk: number;
  critical_risk: number;
}

interface AuditLogEntryApiResponse {
  intake_id: string;
  patient_name: string;
  doctor_name: string | null;
  ai_score: number;
  ai_level: AuditLogEntry["aiLevel"];
  override_score: number | null;
  override_level: AuditLogEntry["overrideLevel"];
  was_modified: boolean;
  reviewed_at: string;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const { data } = await api.get<DashboardStatsApiResponse>("/dashboard/stats");
  return {
    totalPatients: data.total_patients,
    totalIntakes: data.total_intakes,
    totalAssessments: data.total_assessments,
    totalUsers: data.total_users,
    doctorsCount: data.doctors_count,
    lowRisk: data.low_risk,
    mediumRisk: data.medium_risk,
    highRisk: data.high_risk,
    criticalRisk: data.critical_risk,
  };
}

export async function getAuditLog(): Promise<AuditLogEntry[]> {
  const { data } = await api.get<AuditLogEntryApiResponse[]>("/dashboard/audit-log");
  return data.map((e) => ({
    intakeId: e.intake_id,
    patientName: e.patient_name,
    doctorName: e.doctor_name,
    aiScore: e.ai_score,
    aiLevel: e.ai_level,
    overrideScore: e.override_score,
    overrideLevel: e.override_level,
    wasModified: e.was_modified,
    reviewedAt: e.reviewed_at,
  }));
}