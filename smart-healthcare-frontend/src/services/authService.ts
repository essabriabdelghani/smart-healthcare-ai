import api from "./api";
import type { User, UserRole } from "../types/user";

/* ==========================
   Payloads
========================== */

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  full_name: string;
  email: string;
  password: string;
  role: UserRole;
}

/* ==========================
   Token
========================== */

export interface Token {
  access_token: string;
  token_type: string;
}

/* ==========================
   Login
========================== */

export async function login(
  payload: LoginPayload
): Promise<Token> {
  const { data } = await api.post<Token>(
    "/auth/login",
    payload
  );

  localStorage.setItem("access_token", data.access_token);

  return data;
}

/* ==========================
   Register
========================== */

export async function register(
  payload: RegisterPayload
): Promise<User> {
  const { data } = await api.post<User>(
    "/auth/register",
    payload
  );

  return data;
}

/* ==========================
   Current User
========================== */

export async function getMe(): Promise<User> {
  const { data } = await api.get<User>("/auth/me");

  return data;
}

/* ==========================
   Forgot Password
========================== */

export async function forgotPassword(
  email: string
): Promise<{ message: string }> {
  const { data } = await api.post(
    "/auth/forgot-password",
    {
      email,
    }
  );

  return data;
}

/* ==========================
   Logout
========================== */

export function logout(): void {
  localStorage.removeItem("access_token");
}

/* ==========================
   Check Auth
========================== */

export function isAuthenticated(): boolean {
  return !!localStorage.getItem("access_token");
}