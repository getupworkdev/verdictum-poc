// Demo password gate. The cookie holds a hash of the password, so changing
// DEMO_PASSWORD signs everyone out of the gate.

export const GATE_COOKIE = 'verdictum_demo_gate';

export async function gateToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(`verdictum-poc:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}
