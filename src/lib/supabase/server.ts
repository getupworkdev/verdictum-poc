import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { env } from '@/lib/env';

// Acts as the signed-in user: every query goes through RLS.
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(env.supabaseUrl(), env.supabaseAnonKey(), {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component; the proxy refreshes the session.
        }
      },
    },
  });
}

// Bypasses RLS. Only used for rate limiting and for showing the isolation demo
// which id it is trying (and failing) to read. Never sent to the browser.
export function createAdminClient() {
  return createSupabaseClient(env.supabaseUrl(), env.serviceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type Profile = { id: string; firmId: string; firmName: string; fullName: string; email: string };

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('users')
    .select('id, full_name, firm_id, firms(name)')
    .eq('id', user.id)
    .single();
  if (!data) return null;

  const firm = data.firms as unknown as { name: string } | null;
  return {
    id: data.id,
    firmId: data.firm_id,
    firmName: firm?.name ?? '',
    fullName: data.full_name,
    email: user.email ?? '',
  };
}
