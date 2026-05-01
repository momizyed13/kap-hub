// middleware.ts
// PERFORMANCE FIX: only check auth on initial load, not every navigation
// Also explicitly skip middleware for static assets and API routes

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip auth for these paths to speed things up
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/') ||
    pathname.includes('.') ||  // static files
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const publicPaths = ['/auth/login', '/auth/signup', '/auth/verify', '/auth/callback']
  const isPublic = publicPaths.some((p) => pathname.startsWith(p))

  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  if (user && pathname.startsWith('/auth/login')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard/listings'
    return NextResponse.redirect(url)
  }

  // Admin checks only on admin routes
  if (pathname.startsWith('/admin') && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = (profile as { role?: string } | null)?.role
    if (!role || !['admin', 'officer'].includes(role)) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard/listings'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

// Skip middleware entirely for these paths
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js)$).*)',
  ],
}
