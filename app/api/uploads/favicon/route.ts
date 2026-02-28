import { NextResponse } from 'next/server'
import { brandingStore } from '@/lib/branding-store'
import { withPermission, AuthenticatedRequest } from '@/lib/permissions'
import type { AuthSuccess } from '@/lib/permissions'
import { validateFaviconUpload, MAX_UPLOAD_SIZE } from '@/lib/theme-config'
import { writeFileSync } from 'fs'
import { join } from 'path'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

// POST /api/uploads/favicon - Upload favicon (admin only)
async function handlePOST(req: AuthenticatedRequest, auth: AuthSuccess) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }
    
    // Validate upload
    const validation = validateFaviconUpload(file)
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }
    
    // Generate unique filename
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
    const hash = crypto.randomBytes(8).toString('hex')
    const filename = `favicon-${hash}.${ext}`
    const filepath = join(brandingStore.getUploadsDir(), filename)
    
    // Convert File to Buffer and save
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    writeFileSync(filepath, buffer)
    
    // Update branding config with new favicon path
    const publicPath = brandingStore.getUploadPublicPath(filename)
    brandingStore.updateConfig({
      favicon: {
        path: publicPath,
      },
    })
    
    return NextResponse.json({
      success: true,
      path: publicPath,
      filename,
      message: 'Favicon uploaded successfully',
    })
  } catch (error) {
    console.error('Failed to upload favicon:', error)
    
    if (error instanceof Error && error.message.includes('File too large')) {
      return NextResponse.json(
        { error: `File too large. Maximum size: ${MAX_UPLOAD_SIZE / 1024}KB` },
        { status: 413 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to upload favicon' },
      { status: 500 }
    )
  }
}

export const POST = withPermission(handlePOST, 'settings:update')
