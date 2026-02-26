import { NextRequest, NextResponse } from 'next/server'

// HTTP Basic Auth for password protection
export function middleware(request: NextRequest) {
  // Skip auth for static assets and API routes
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/static') ||
    request.nextUrl.pathname.startsWith('/api/') ||
    request.nextUrl.pathname.startsWith('/favicon')
  ) {
    return NextResponse.next()
  }

  const authHeader = request.headers.get('authorization')
  
  // Get credentials from env vars with fallbacks
  // Note: In Vercel, these must be set in the dashboard
  const expectedUser = process.env.AUTH_USER || 'admin'
  const expectedPass = process.env.AUTH_PASS || 'changeme'
  
  // Create expected auth string
  const expectedAuth = 'Basic ' + btoa(`${expectedUser}:${expectedPass}`)
  
  // Check auth
  if (!authHeader || authHeader !== expectedAuth) {
    return new NextResponse('Unauthorized', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="StatusClaw Dashboard"',
      },
    })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next|static|api|favicon).*)'],
}
