import type { Permission, RoleKey } from "@/lib/auth/permissions";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: { key: RoleKey; name: string; rank: number };
  permissions: Permission[];
  twoFactorEnabled: boolean;
  sessionId: string;
}
