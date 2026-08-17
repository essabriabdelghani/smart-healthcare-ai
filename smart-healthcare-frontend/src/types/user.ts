export type UserRole = "patient" | "doctor" | "admin";

export interface User {
  id: string;

  full_name: string;

  email: string;

  role: UserRole;

  clinic_id: string;

  clinic_name: string | null;

  phone: string | null;

  is_active: boolean;

  created_at: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  full_name: string;
  email: string;
  password: string;
  role: UserRole;
  clinic_name: string;
}