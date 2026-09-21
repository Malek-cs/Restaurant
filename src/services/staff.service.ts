import "server-only";
import { db } from "@/database/client";
import { conflict, forbidden, notFound } from "@/lib/api/errors";
import { hashPassword } from "@/lib/auth/password";
import { ROLE_DEFS, type RoleKey } from "@/lib/auth/permissions";
import type { AuthUser } from "@/types/auth";
import type { StaffCreateInput, StaffUpdateInput } from "@/lib/validation/admin";
import { normalizePhone } from "@/utils/phone";

function assertCanAssign(actor: AuthUser, roleKey: RoleKey) {
  const targetRank = ROLE_DEFS[roleKey].rank;
  if (actor.role.key === "SUPER_ADMIN") return;
  if (targetRank >= actor.role.rank) throw forbidden("You can only manage roles below your own.");
}

async function activeSuperAdmins(excludeUserId?: string) {
  return db.user.count({ where: { isActive: true, role: { key: "SUPER_ADMIN" }, ...(excludeUserId ? { id: { not: excludeUserId } } : {}) } });
}

export async function listStaff() {
  const users = await db.user.findMany({
    orderBy: [{ role: { rank: "desc" } }, { name: "asc" }],
    include: { role: true, staff: true },
  });
  return users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    isActive: u.isActive,
    lastLoginAt: u.lastLoginAt,
    createdAt: u.createdAt,
    roleKey: u.role.key as RoleKey,
    roleName: u.role.name,
    rank: u.role.rank,
    phone: u.staff?.phone ?? null,
    position: u.staff?.position ?? null,
  }));
}

export async function createStaff(input: StaffCreateInput, actor: AuthUser) {
  assertCanAssign(actor, input.roleKey);
  const role = await db.role.findUnique({ where: { key: input.roleKey } });
  if (!role) throw notFound("Role");
  const user = await db.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash: await hashPassword(input.password),
      roleId: role.id,
      isActive: input.isActive,
      staff: { create: { phone: input.phone ? normalizePhone(input.phone) : null, position: input.position || null, hiredAt: new Date() } },
    },
  });
  return user;
}

export async function updateStaff(id: string, input: StaffUpdateInput, actor: AuthUser) {
  const target = await db.user.findUnique({ where: { id }, include: { role: true } });
  if (!target) throw notFound("Staff member");
  if (actor.role.key !== "SUPER_ADMIN" && target.role.rank >= actor.role.rank && target.id !== actor.id) {
    throw forbidden("You can't edit someone at or above your own level.");
  }
  if (target.id === actor.id) {
    if (input.roleKey !== target.role.key) throw forbidden("You can't change your own role.");
    if (!input.isActive) throw forbidden("You can't deactivate your own account.");
  } else {
    assertCanAssign(actor, input.roleKey);
  }
  if (target.role.key === "SUPER_ADMIN" && (input.roleKey !== "SUPER_ADMIN" || !input.isActive) && (await activeSuperAdmins(id)) === 0) {
    throw conflict("There must be at least one active super admin.");
  }
  const role = await db.role.findUniqueOrThrow({ where: { key: input.roleKey } });
  const passwordChanged = !!input.password;
  const user = await db.user.update({
    where: { id },
    data: {
      name: input.name,
      email: input.email,
      roleId: role.id,
      isActive: input.isActive,
      ...(passwordChanged ? { passwordHash: await hashPassword(input.password!), failedLoginCount: 0, lockedUntil: null } : {}),
      staff: {
        upsert: {
          create: { phone: input.phone ? normalizePhone(input.phone) : null, position: input.position || null },
          update: { phone: input.phone ? normalizePhone(input.phone) : null, position: input.position || null },
        },
      },
    },
  });
  // Deactivation, role change or password reset ends existing sessions.
  if (!input.isActive || passwordChanged || role.key !== target.role.key) {
    await db.session.updateMany({ where: { userId: id, revokedAt: null, ...(id === actor.id ? { id: { not: actor.sessionId } } : {}) }, data: { revokedAt: new Date() } });
  }
  return { user, previousRole: target.role.key, passwordChanged };
}

export async function deleteStaff(id: string, actor: AuthUser) {
  const target = await db.user.findUnique({ where: { id }, include: { role: true } });
  if (!target) throw notFound("Staff member");
  if (target.id === actor.id) throw forbidden("You can't delete your own account.");
  if (actor.role.key !== "SUPER_ADMIN" && target.role.rank >= actor.role.rank) throw forbidden("You can't delete someone at or above your own level.");
  if (target.role.key === "SUPER_ADMIN" && (await activeSuperAdmins(id)) === 0) throw conflict("There must be at least one active super admin.");
  await db.user.delete({ where: { id } });
  return target;
}

export async function getRoleMatrix() {
  const roles = await db.role.findMany({ orderBy: { rank: "desc" }, include: { permissions: { include: { permission: true } } } });
  const permissions = await db.permission.findMany({ orderBy: [{ group: "asc" }, { key: "asc" }] });
  return {
    roles: roles.map((r) => ({ key: r.key, name: r.name, description: r.description, rank: r.rank, permissions: r.permissions.map((p) => p.permission.key) })),
    permissions: permissions.map((p) => ({ key: p.key, group: p.group, description: p.description })),
  };
}
