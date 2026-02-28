/**
 * Team Invites API
 * /api/rbac/invites
 * 
 * GET - List pending invites (admin only)
 * POST - Create invite (admin only)
 * DELETE - Revoke invite (admin only)
 * 
 * Issue #45 - Team roles + permissions
 */

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import {
  getPendingInvites,
  createTeamInvite,
  revokeTeamInvite,
} from "@/lib/rbac/server"
import type { TeamRole } from "@/lib/rbac"
import { PermissionError } from "@/lib/rbac"

/**
 * GET /api/rbac/invites
 * List pending invites for a workspace
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get("workspaceId")

    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspaceId is required" },
        { status: 400 }
      )
    }

    const invites = await getPendingInvites(workspaceId, session.user.id)

    return NextResponse.json({
      invites: invites.map((i) => ({
        id: i.id,
        email: i.email,
        role: i.role.toLowerCase(),
        invitedBy: i.invitedBy,
        expiresAt: i.expiresAt,
        createdAt: i.createdAt,
      })),
    })
  } catch (error) {
    if (error instanceof PermissionError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("[Invites GET] Error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/rbac/invites
 * Create a new team invite
 * Body: { workspaceId: string, email: string, role: TeamRole }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { workspaceId, email, role } = body

    if (!workspaceId || !email || !role) {
      return NextResponse.json(
        { error: "workspaceId, email, and role are required" },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      )
    }

    const validRoles: TeamRole[] = ["admin", "editor", "viewer"]
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be admin, editor, or viewer" },
        { status: 400 }
      )
    }

    const { token, expiresAt } = await createTeamInvite(
      workspaceId,
      email,
      role,
      session.user.id
    )

    return NextResponse.json({
      success: true,
      token,
      expiresAt,
      inviteUrl: `/api/rbac/invites/accept?token=${token}`,
    })
  } catch (error) {
    if (error instanceof PermissionError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("[Invites POST] Error:", error)
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * DELETE /api/rbac/invites
 * Revoke an invite
 * Query params: workspaceId, inviteId
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get("workspaceId")
    const inviteId = searchParams.get("inviteId")

    if (!workspaceId || !inviteId) {
      return NextResponse.json(
        { error: "workspaceId and inviteId are required" },
        { status: 400 }
      )
    }

    await revokeTeamInvite(workspaceId, inviteId, session.user.id)

    return NextResponse.json({
      success: true,
      message: "Invite revoked successfully",
    })
  } catch (error) {
    if (error instanceof PermissionError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("[Invites DELETE] Error:", error)
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
