import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  // Return env var status (without exposing actual values)
  return NextResponse.json({
    authUserSet: !!process.env.AUTH_USER,
    authPassSet: !!process.env.AUTH_PASS,
    authUserValue: process.env.AUTH_USER ? `${process.env.AUTH_USER.substring(0, 2)}...` : 'not set (using default: admin)',
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
  })
}