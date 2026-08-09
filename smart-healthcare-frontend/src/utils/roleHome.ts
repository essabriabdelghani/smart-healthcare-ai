import type { UserRole } from "../types/user";

export function roleHome(role: UserRole): string {
  switch (role) {
    case "doctor":
    case "admin":
      return "/doctor/dashboard";
    case "patient":
    default:
      return "/dashboard";
  }
}