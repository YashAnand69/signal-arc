import { createClient, type SupabaseClient } from '@supabase/supabase-js';
let client: SupabaseClient | null = null;
export async function authClient() {
  if (!client) { const response = await fetch('/api/auth-config'); if (!response.ok) throw new Error('Login is temporarily unavailable.'); const config = await response.json(); client = createClient(config.url, config.key, { auth: { flowType: 'pkce', storageKey: 'signal-arc-auth' } }); }
  return client;
}
export async function api(path: string, init?: RequestInit) {
  let token: string | undefined;
  if (client) { const { data } = await client.auth.getSession(); token = data.session?.access_token; }
  const response = await fetch(`/api/${path}`, { ...init, headers: { 'content-type':'application/json', ...(token ? {Authorization:`Bearer ${token}`} : {}), ...init?.headers } });
  const data = await response.json().catch(() => ({error:'The server returned an unexpected response. Please retry.'}));
  if (!response.ok) throw new Error(data.error || 'Something went wrong.'); return data;
}
export function downloadText(name: string, body: string, type='text/plain') { const url=URL.createObjectURL(new Blob([body],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000); }
