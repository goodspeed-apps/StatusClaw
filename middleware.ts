import { NextRequest, NextResponse } from 'next/server'

// HTTP Basic Auth for password protection
export function middleware(request: NextRequest) {
  // Skip auth for static assets and API routes
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/static') ||
    request.nextUrl.pathname.startsWith('/api/')
  ) {
    return NextResponse.next()
  }

  const authHeader = request.headers.get('authorization')
  const expectedUser = process.env.AUTH_USER || 'admin'
  const expectedPass = process.env.AUTH_PASS || 'changeme'
  const expectedAuth = 'Basic ' + Buffer.from(`${expectedUser}:${expectedPass}`).toString('base64')

  if (authHeader !== expectedAuth) {
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
  matcher: ['/((?!_next|static|api).*)'],
}
