/**
 * Server-side RBAC helpers
 * 
 * Database integration and API route helpers for RBAC
 */

import { prisma } from "@/lib/prisma"
import type { TeamRole, PermissionAction } from "./index"
import { hasPermission, assertPermission, PermissionError, isValidTeamRole } from "./index"
import type { UserRoleType } from "@prisma/client"

/**
 * Cookie name for team session
 */
export const TEAM_SESSION_COOKIE = "sc_team_session"

/**
 * Interface for team membership
 */
export interface TeamMembership {
  userId: string
  workspaceId: string
  role: TeamRole
}

/**
 * Convert TeamRole (lowercase) to UserRoleType (uppercase enum)
 */
function teamRoleToUserRoleType(role: TeamRole): UserRoleType {
  switch (role) {
    case "admin":
      return "ADMIN"
    case "editor":
      return "EDITOR"
    case "viewer":
      return "VIEWER"
    default:
      throw new Error(`Invalid team role: ${role}`)
  }
}

/**
 * Convert UserRoleType (uppercase enum) to TeamRole (lowercase)
 */
function userRoleTypeToTeamRole(role: UserRoleType): TeamRole {
  switch (role) {
    case "ADMIN":
      return "admin"
    case "EDITOR":
      return "editor"
    case "VIEWER":
      return "viewer"
    default:
      return "viewer"
  }
}

/**
 * Get the current user's team role for a workspace
 * Falls back to workspace membership role if no explicit team role
 */
export async function getUserTeamRole(
  userId: string,
  workspaceId: string
): Promise<TeamRole | null> {
  // First check for explicit team role
  const teamMember = await prisma.userRole.findUnique({
    where: {
      userId_workspaceId: {
        userId,
        workspaceId,
      },
    },
  })

  if (teamMember?.role) {
    return userRoleTypeToTeamRole(teamMember.role)
  }

  // Fallback to workspace membership
  const membership = await prisma.workspaceMembership.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId,
      },
    },
  })

  if (membership?.role) {
    return mapWorkspaceRoleToTeamRole(membership.role)
  }

  return null
}

/**
 * Map workspace role to team role
 * OWNER/ADMIN -> admin
 * MEMBER -> editor
 * VIEWER -> viewer
 */
function mapWorkspaceRoleToTeamRole(workspaceRole: string): TeamRole | null {
  switch (workspaceRole) {
    case "OWNER":
    case "ADMIN":
      return "admin"
    case "MEMBER":
      return "editor"
    case "VIEWER":
      return "viewer"
    default:
      if (isValidTeamRole(workspaceRole)) {
        return workspaceRole
      }
      return null
  }
}

/**
 * Map team role to workspace role for compatibility
 */
function teamRoleToWorkspaceRole(teamRole: TeamRole): "ADMIN" | "MEMBER" | "VIEWER" {
  switch (teamRole) {
    case "admin":
      return "ADMIN"
    case "editor":
      return "MEMBER"
    case "viewer":
      return "VIEWER"
    default:
      return "VIEWER"
  }
}

/**
 * Check if user has a specific permission in a workspace
 */
export async function checkUserPermission(
  userId: string,
  workspaceId: string,
  action: PermissionAction
): Promise<boolean> {
  const role = await getUserTeamRole(userId, workspaceId)
  if (!role) return false
  return hasPermission(role, action)
}

/**
 * Require user to have a specific permission
 * Throws PermissionError if not
 */
export async function requirePermission(
  userId: string,
  workspaceId: string,
  action: PermissionAction
): Promise<void> {
  const role = await getUserTeamRole(userId, workspaceId)
  if (!role) {
    throw new PermissionError("User is not a member of this workspace")
  }
  assertPermission(role, action)
}

/**
 * Update a user's team role
 * Only admins can do this
 */
export async function updateUserTeamRole(
  workspaceId: string,
  userId: string,
  newRole: TeamRole,
  updatedByUserId: string
): Promise<void> {
  // Verify updater has permission
  await requirePermission(updatedByUserId, workspaceId, "team.update_role")

  // Check user is a member
  const membership = await prisma.workspaceMembership.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId,
      },
    },
  })

  if (!membership) {
    throw new Error("User is not a member of this workspace")
  }

  // Update role using UserRole model
  await prisma.userRole.upsert({
    where: {
      userId_workspaceId: {
        userId,
        workspaceId,
      },
    },
    update: {
      role: teamRoleToUserRoleType(newRole),
    },
    create: {
      userId,
      workspaceId,
      role: teamRoleToUserRoleType(newRole),
    },
  })

  // Create audit log
  await prisma.auditLog.create({
    data: {
      workspaceId,
      actorUserId: updatedByUserId,
      action: "team.role_updated",
      entityType: "user",
      entityId: userId,
      metadataJson: {
        newRole,
        previousRole: membership.role,
      },
    },
  })
}

/**
 * List all team members with their roles
 */
export async function listTeamMembers(
  workspaceId: string
): Promise<Array<{
  id: string
  name: string | null
  email: string | null
  image: string | null
  role: TeamRole
  joinedAt: Date
}>> {
  const members = await prisma.workspaceMembership.findMany({
    where: { workspaceId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  })

  // Get explicit team roles
  const teamRoles = await prisma.userRole.findMany({
    where: { workspaceId },
  })
  const teamRoleMap = new Map(teamRoles.map(tr => [tr.userId, userRoleTypeToTeamRole(tr.role)]))

  return members.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    email: m.user.email,
    image: m.user.image,
    role: teamRoleMap.get(m.user.id) || mapWorkspaceRoleToTeamRole(m.role) || "viewer",
    joinedAt: m.createdAt,
  }))
}

/**
 * Team invite creation
 */
export async function createTeamInvite(
  workspaceId: string,
  email: string,
  role: TeamRole,
  invitedByUserId: string
): Promise<{ token: string; expiresAt: Date }> {
  // Verify inviter has permission
  await requirePermission(invitedByUserId, workspaceId, "team.invite")

  // Check if invite already exists
  const existing = await prisma.workspaceInvite.findFirst({
    where: {
      workspaceId,
      email: email.toLowerCase(),
      status: "PENDING",
    },
  })

  if (existing) {
    throw new Error("An invite is already pending for this email")
  }

  // Generate token
  const token = crypto.randomUUID()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7) // 7 days

  // Create invite
  await prisma.workspaceInvite.create({
    data: {
      workspaceId,
      email: email.toLowerCase(),
      role: teamRoleToWorkspaceRole(role),
      tokenHash: token, // Use UUID directly as hash for simplicity
      invitedByUserId,
      expiresAt,
      status: "PENDING",
    },
  })

  // Create audit log
  await prisma.auditLog.create({
    data: {
      workspaceId,
      actorUserId: invitedByUserId,
      action: "team.invite_created",
      entityType: "workspace_invite",
      entityId: token,
      metadataJson: {
        email: email.toLowerCase(),
        role,
        expiresAt: expiresAt.toISOString(),
      },
    },
  })

  return { token, expiresAt }
}

/**
 * Validate invite token
 */
export async function validateInviteToken(
  token: string
): Promise<{
  workspaceId: string
  email: string
  role: TeamRole
} | null> {
  const invite = await prisma.workspaceInvite.findUnique({
    where: { tokenHash: token },
  })

  if (!invite) return null
  if (invite.status !== "PENDING") return null
  if (invite.expiresAt < new Date()) {
    // Mark as expired
    await prisma.workspaceInvite.update({
      where: { id: invite.id },
      data: { status: "EXPIRED" },
    })
    return null
  }

  const mappedRole = mapWorkspaceRoleToTeamRole(invite.role)
  if (!mappedRole) return null

  return {
    workspaceId: invite.workspaceId,
    email: invite.email,
    role: mappedRole,
  }
}

/**
 * Accept team invite
 */
export async function acceptTeamInvite(
  token: string,
  userId: string
): Promise<void> {
  const invite = await validateInviteToken(token)
  if (!invite) {
    throw new Error("Invalid or expired invite")
  }

  // Verify email matches
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  })

  if (!user?.email || user.email.toLowerCase() !== invite.email.toLowerCase()) {
    throw new Error("Invite email does not match your account email")
  }

  // Check if already a member
  const existing = await prisma.workspaceMembership.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: invite.workspaceId,
        userId,
      },
    },
  })

  if (!existing) {
    // Create membership
    await prisma.workspaceMembership.create({
      data: {
        workspaceId: invite.workspaceId,
        userId,
        role: teamRoleToWorkspaceRole(invite.role),
      },
    })
  }

  // Set explicit team role
  await prisma.userRole.upsert({
    where: {
      userId_workspaceId: {
        userId,
        workspaceId: invite.workspaceId,
      },
    },
    update: { role: teamRoleToUserRoleType(invite.role) },
    create: {
      userId,
      workspaceId: invite.workspaceId,
      role: teamRoleToUserRoleType(invite.role),
    },
  })

  // Mark invite as accepted
  await prisma.workspaceInvite.updateMany({
    where: { tokenHash: token },
    data: {
      status: "ACCEPTED",
      acceptedAt: new Date(),
    },
  })
}

/**
 * Revoke team invite
 */
export async function revokeTeamInvite(
  workspaceId: string,
  inviteId: string,
  revokedByUserId: string
): Promise<void> {
  await requirePermission(revokedByUserId, workspaceId, "team.invite")

  const invite = await prisma.workspaceInvite.findUnique({
    where: { id: inviteId },
  })

  if (!invite || invite.workspaceId !== workspaceId) {
    throw new Error("Invite not found")
  }

  await prisma.workspaceInvite.update({
    where: { id: inviteId },
    data: { status: "REVOKED" },
  })

  // Audit log
  await prisma.auditLog.create({
    data: {
      workspaceId,
      actorUserId: revokedByUserId,
      action: "team.invite_revoked",
      entityType: "workspace_invite",
      entityId: inviteId,
      metadataJson: {
        email: invite.email,
      },
    },
  })
}

/**
 * Get pending invites for workspace
 */
export async function getPendingInvites(
  workspaceId: string,
  userId: string
) {
  await requirePermission(userId, workspaceId, "team.view")

  return prisma.workspaceInvite.findMany({
    where: {
      workspaceId,
      status: "PENDING",
    },
    orderBy: { createdAt: "desc" },
    include: {
      invitedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  })
}

/**
 * Remove team member
 */
export async function removeTeamMember(
  workspaceId: string,
  userId: string,
  removedByUserId: string
): Promise<void> {
  await requirePermission(removedByUserId, workspaceId, "team.remove")

  // Can't remove self through this API
  if (userId === removedByUserId) {
    throw new Error("Cannot remove yourself. Please use leave workspace instead.")
  }

  // Check if target is an owner
  const membership = await prisma.workspaceMembership.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId,
      },
    },
  })

  if (!membership) {
    throw new Error("User is not a member of this workspace")
  }

  if (membership.role === "OWNER") {
    throw new Error("Cannot remove owner from workspace")
  }

  // Remove team role
  await prisma.userRole.deleteMany({
    where: {
      userId,
      workspaceId,
    },
  })

  // Remove membership
  await prisma.workspaceMembership.delete({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId,
      },
    },
  })

  // Audit log
  await prisma.auditLog.create({
    data: {
      workspaceId,
      actorUserId: removedByUserId,
      action: "team.member_removed",
      entityType: "user",
      entityId: userId,
      metadataJson: {},
    },
  })
}

/**
 * Get user's workspaces with team roles
 */
export async function getUserWorkspacesWithRoles(
  userId: string
): Promise<Array<{
  workspaceId: string
  name: string
  role: TeamRole
  joinedAt: Date
}>> {
  const memberships = await prisma.workspaceMembership.findMany({
    where: { userId },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })

  const teamRoles = await prisma.userRole.findMany({
    where: { userId },
  })
  const teamRoleMap = new Map(teamRoles.map(tr => [tr.workspaceId, userRoleTypeToTeamRole(tr.role)]))

  return memberships.map((m) => ({
    workspaceId: m.workspace.id,
    name: m.workspace.name,
    role: teamRoleMap.get(m.workspace.id) || mapWorkspaceRoleToTeamRole(m.role) || "viewer",
    joinedAt: m.createdAt,
  }))
}
