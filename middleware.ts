import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  // Skip auth for assets and API
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/static') ||
    request.nextUrl.pathname.startsWith('/api/') ||
    request.nextUrl.pathname === '/favicon.ico'
  ) {
    return NextResponse.next()
  }

  const authHeader = request.headers.get('authorization')
  
  // Read env vars with detailed fallback
  const expectedUser = process.env.AUTH_USER || 'admin'
  const expectedPass = process.env.AUTH_PASSWORD || process.env.AUTH_PASS || 'changeme'
  
  // Create expected auth
  const credentials = `${expectedUser}:${expectedPass}`
  const expectedAuth = 'Basic ' + btoa(credentials)
  
  if (authHeader !== expectedAuth) {
    return new NextResponse('Unauthorized - Check AUTH_USER and AUTH_PASS env vars', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="StatusClaw Dashboard"',
        'Content-Type': 'text/plain',
      },
    })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next|static|api|favicon).*)'],
}