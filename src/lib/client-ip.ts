import 'server-only';
import { headers } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/server';

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown';
}

// true when the request is allowed. Fails closed if the limiter is unavailable.
export async function allowRequest(bucket: string, max: number, windowSeconds: number): Promise<boolean> {
  const ip = await clientIp();
  const { data, error } = await createAdminClient().rpc('hit_rate_limit', {
    p_key: `${bucket}:${ip}`,
    p_max: max,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error('rate limit check failed', error);
    return false;
  }
  return data === true;
}
