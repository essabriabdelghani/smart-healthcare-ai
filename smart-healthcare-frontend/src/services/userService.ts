import api from "./api";
import type { User } from "../types/user";

interface UserApiResponse {
  id: number;
  full_name: string;
  email: string;
  role: User["role"];
  clinic_id: string;
  clinic_name: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
}

function toUser(u: UserApiResponse): User {
  return {
    id: String(u.id),
    full_name: u.full_name,
    email: u.email,
    role: u.role,
    clinic_id: u.clinic_id,
    clinic_name: u.clinic_name,
    phone: u.phone,
    is_active: u.is_active,
    created_at: u.created_at,
  };
}

export async function getClinicUsers(role?: User["role"]): Promise<User[]> {
  const { data } = await api.get<UserApiResponse[]>("/users", {
    params: role ? { role } : undefined,
  });
  return data.map(toUser);
}

export async function toggleUserStatus(userId: string): Promise<User> {
  const { data } = await api.patch<UserApiResponse>(`/users/${userId}/status`);
  return toUser(data);
}