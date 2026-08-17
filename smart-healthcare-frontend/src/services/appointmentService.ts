import api from "./api";
import type { Appointment, AppointmentForm, DoctorOption, PatientProfile, RiskLevel } from "../types/patient";

/* =========================================================
   API TYPES
========================================================= */

interface AppointmentApiResponse {
  id: string;
  patient_id: string;
  patient_name: string;
  doctor_id: number | null;
  doctor_name: string | null;
  appointment_date: string;
  status: string;
  notes: string | null;
  last_risk_level: RiskLevel | null;
}

interface DoctorOptionApiResponse {
  id: number;
  full_name: string;
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

/* =========================================================
   MAPPING
========================================================= */

function toAppointment(a: AppointmentApiResponse): Appointment {
  return {
    id: a.id,
    patientId: a.patient_id,
    patientName: a.patient_name,
    doctorId: a.doctor_id,
    doctorName: a.doctor_name,
    appointmentDate: a.appointment_date,
    status: a.status,
    notes: a.notes,
    lastRiskLevel: a.last_risk_level,
  };
}

function toDoctorOption(d: DoctorOptionApiResponse): DoctorOption {
  return { id: d.id, fullName: d.full_name };
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

/* =========================================================
   API
========================================================= */

export async function getUpcomingAppointments(): Promise<Appointment[]> {
  const { data } = await api.get<AppointmentApiResponse[]>("/appointments/upcoming");
  return data.map(toAppointment);
}

export async function getTodayAppointments(): Promise<Appointment[]> {
  const { data } = await api.get<AppointmentApiResponse[]>("/appointments/today");
  return data.map(toAppointment);
}

export async function getAllAppointments(): Promise<Appointment[]> {
  const { data } = await api.get<AppointmentApiResponse[]>("/appointments/all");
  return data.map(toAppointment);
}

export async function getClinicDoctors(): Promise<DoctorOption[]> {
  const { data } = await api.get<DoctorOptionApiResponse[]>("/appointments/doctors");
  return data.map(toDoctorOption);
}

// Patients de la clinique (identité), pour le menu déroulant du formulaire.
export async function getClinicPatients(): Promise<PatientProfile[]> {
  const { data } = await api.get<PatientProfileApiResponse[]>("/patients");
  return data.map(toPatientProfile);
}

export async function createAppointment(form: AppointmentForm): Promise<Appointment> {
  if (!form.patientId) throw new Error("Veuillez choisir un patient.");
  if (!form.doctorId) throw new Error("Veuillez choisir un médecin.");
  if (!form.date || !form.time) throw new Error("Veuillez indiquer une date et une heure.");

  const body = {
    patient_id: form.patientId,
    doctor_id: Number(form.doctorId),
    appointment_date: `${form.date}T${form.time}:00`,
    notes: form.notes.trim(),
  };

  const { data } = await api.post<AppointmentApiResponse>("/appointments", body);
  return toAppointment(data);
}