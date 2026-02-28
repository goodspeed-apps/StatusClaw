import { NextResponse } from 'next/server'
import { brandingStore } from '@/lib/branding-store'
import { withPermission, AuthenticatedRequest } from '@/lib/permissions'
import { sanitizeBrandingConfig, parseBrandingConfig } from '@/lib/theme-config'
import type { AuthSuccess } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

// GET /api/branding - Public readable branding config
export async function GET() {
  try {
    const config = brandingStore.getConfig()
    const sanitized = sanitizeBrandingConfig(config)
    
    return NextResponse.json({
      branding: sanitized,
      success: true,
    })
  } catch (error) {
    console.error('Failed to fetch branding:', error)
    return NextResponse.json(
      { error: 'Failed to fetch branding configuration' },
      { status: 500 }
    )
  }
}

// POST /api/branding - Update branding (admin only)
async function handlePOST(req: AuthenticatedRequest, auth: AuthSuccess) {
  try {
    const body = await req.json()
    
    // Parse and validate the update
    const validated = parseBrandingConfig({
      ...brandingStore.getConfig(),
      ...body,
    })
    
    // Update the branding
    const updated = brandingStore.updateConfig(validated)
    const sanitized = sanitizeBrandingConfig(updated)
    
    return NextResponse.json({
      branding: sanitized,
      success: true,
      updatedAt: updated.updatedAt,
    })
  } catch (error) {
    console.error('Failed to update branding:', error)
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid branding configuration', details: error },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to update branding configuration' },
      { status: 500 }
    )
  }
}

// DELETE /api/branding - Reset to defaults (admin only)
async function handleDELETE(req: AuthenticatedRequest, auth: AuthSuccess) {
  try {
    const reset = brandingStore.resetToDefaults()
    const sanitized = sanitizeBrandingConfig(reset)
    
    return NextResponse.json({
      branding: sanitized,
      success: true,
      message: 'Branding reset to defaults',
    })
  } catch (error) {
    console.error('Failed to reset branding:', error)
    return NextResponse.json(
      { error: 'Failed to reset branding configuration' },
      { status: 500 }
    )
  }
}

// Wrap with admin permission check
export const POST = withPermission(handlePOST, 'settings:update')
export const DELETE = withPermission(handleDELETE, 'settings:update')
