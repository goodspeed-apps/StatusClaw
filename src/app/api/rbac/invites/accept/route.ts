/**
 * Accept Team Invite API
 * POST /api/rbac/invites/accept
 * 
 * Accepts a team invite using a token.
 * Requires authentication.
 * 
 * Issue #45 - Team roles + permissions
 */

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { acceptTeamInvite } from "@/lib/rbac/server"

/**
 * POST /api/rbac/invites/accept
 * Accept a team invite
 * Body: { token: string }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { token } = body

    if (!token) {
      return NextResponse.json(
        { error: "token is required" },
        { status: 400 }
      )
    }

    await acceptTeamInvite(token, session.user.id)

    return NextResponse.json({
      success: true,
      message: "Invite accepted successfully",
    })
  } catch (error) {
    console.error("[Invites Accept POST] Error:", error)
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
