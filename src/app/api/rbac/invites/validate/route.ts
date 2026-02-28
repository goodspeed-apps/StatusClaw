/**
 * Validate Team Invite API
 * GET /api/rbac/invites/validate?token=xxx
 * 
 * Public endpoint to validate an invite token.
 * Returns invite details if valid.
 * 
 * Issue #45 - Team roles + permissions
 */

import { NextRequest, NextResponse } from "next/server"
import { validateInviteToken } from "@/lib/rbac/server"

/**
 * GET /api/rbac/invites/validate
 * Validate an invite token
 * Query params: token
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")

    if (!token) {
      return NextResponse.json(
        { error: "token is required" },
        { status: 400 }
      )
    }

    const invite = await validateInviteToken(token)

    if (!invite) {
      return NextResponse.json(
        { error: "Invalid or expired invite" },
        { status: 400 }
      )
    }

    return NextResponse.json({
      valid: true,
      workspaceId: invite.workspaceId,
      email: invite.email,
      role: invite.role,
    })
  } catch (error) {
    console.error("[Invites Validate GET] Error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
