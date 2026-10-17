import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import { GATE_COOKIE, gateToken } from '@/lib/gate';

const PUBLIC_PATHS = ['/kapu'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Demo password gate in front of everything.
  if (!PUBLIC_PATHS.includes(pathname)) {
    const expected = await gateToken(process.env.DEMO_PASSWORD ?? '');
    if (!process.env.DEMO_PASSWORD || request.cookies.get(GATE_COOKIE)?.value !== expected) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'A demó jelszóval védett.' }, { status: 401 });
      }
      const url = request.nextUrl.clone();
      url.pathname = '/kapu';
      url.search = '';
      return NextResponse.redirect(url);
    }
  }

  // 2. Keep the Supabase session cookie fresh.
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 3. Everything except the gate and the login page needs a signed-in user.
  if (!user && !PUBLIC_PATHS.includes(pathname) && pathname !== '/belepes' && !pathname.startsWith('/api/')) {
    const url = request.nextUrl.clone();
    url.pathname = '/belepes';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|samples/).*)'],
};
