type Job = { id: string; slug: string; company: string; role: string; location: string; kind: string; salary: string; description: string; tags: string[]; accent: string };
type Profile = { session_id: string; resume_text: string; full_name: string; headline: string; skills: string[] };
type Analysis = { session_id: string; job_id: string; score: number; reasons: string[]; updated_at: string };
type Draft = { id: string; session_id: string; job_id: string; body: string; status: string; created_at: string; updated_at: string };

const cookieName = 'signal_session';
const headers = { 'content-type': 'application/json', 'cache-control': 'no-store' };
const seedJobs = [
  { slug: 'lattice-frontend', company: 'Lattice Systems', role: 'Senior Frontend Engineer', location: 'Remote · EU / India', kind: 'Full-time', salary: '$145k — $180k', description: 'Own the interface layer for a developer platform used by teams shipping critical infrastructure. Shape a component system, partner with product, and turn complex state into calm experiences.', tags: ['react', 'typescript', 'design systems', 'systems'], accent: '#d5ff55' },
  { slug: 'northstar-product', company: 'Northstar Labs', role: 'Product Engineer', location: 'Bengaluru · Hybrid', kind: 'Full-time', salary: '₹36L — ₹52L', description: 'Build fast experiments from customer insight to production. The team values product sense, clear writing, and engineers who can move between interface, data, and APIs.', tags: ['react', 'product', 'api', 'python'], accent: '#ff8d66' },
  { slug: 'atlas-ai', company: 'Atlas AI', role: 'AI Platform Engineer', location: 'New York · Remote', kind: 'Full-time', salary: '$155k — $210k', description: 'Design reliable evaluation and observability loops for AI products. Make model behavior legible through structured data, instrumentation, and thoughtful tooling.', tags: ['python', 'llm', 'postgres', 'observability'], accent: '#9b8cff' },
  { slug: 'morrow-studio', company: 'Morrow Studio', role: 'Creative Technologist', location: 'London · Hybrid', kind: 'Contract', salary: '£500 — £700 / day', description: 'Create expressive digital tools and prototypes that feel as good as they function. Strong visual taste and a willingness to work across code, motion, and narrative are essential.', tags: ['three.js', 'motion', 'react', 'prototyping'], accent: '#65d8ff' },
];

function config() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error('The database is not configured yet.');
  return { url, key };
}

async function db(table: string, init: RequestInit = {}) {
  const { url, key } = config();
  const response = await fetch(`${url}/rest/v1/${table}`, {
    ...init,
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...init.headers },
  });
  const text = await response.text();
  let data: unknown = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) throw new Error(typeof data === 'object' && data && 'message' in data ? String((data as { message: string }).message) : `Database request failed (${response.status}).`);
  return data;
}

function json(body: unknown, status = 200, extra: Record<string, string> = {}) { return new Response(JSON.stringify(body), { status, headers: { ...headers, ...extra } }); }
function sessionFrom(request: Request) { return request.headers.get('cookie')?.match(new RegExp(`${cookieName}=([^;]+)`))?.[1] || ''; }
function parseResume(text: string) { const normalized = text.replace(/\s+/g, ' ').trim(); const all = ['react', 'typescript', 'javascript', 'python', 'postgres', 'llm', 'three.js', 'design systems', 'product', 'api', 'motion', 'observability', 'node']; const skills = all.filter((skill) => normalized.toLowerCase().includes(skill)); const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean); return { full_name: lines[0]?.slice(0, 70) || 'Your name', headline: lines[1]?.slice(0, 100) || 'Product-minded builder', skills }; }
function analyze(profile: Profile, job: Job) { const hits = job.tags.filter((tag) => profile.skills.includes(tag)); const score = Math.min(96, Math.max(42, 48 + hits.length * 11 + (profile.skills.includes('product') && job.tags.includes('product') ? 9 : 0))); const reasons = hits.length ? hits.map((hit) => `Your profile signals ${hit}.`) : ['Your systems thinking can transfer here.', 'The role has room for a strong product narrative.']; return { score, reasons }; }
function draft(profile: Profile, job: Job) { const skills = profile.skills.slice(0, 4).join(', '); return `Hi ${job.company} team,\n\nI’m ${profile.full_name}, a ${profile.headline || 'product-minded builder'} who enjoys turning complex systems into clear, useful experiences. The ${job.role} role stood out because it sits at the intersection of ${skills || 'product craft and engineering'}.\n\nIn my recent work I’ve built end-to-end products, shaped reliable APIs, and cared deeply about the final interaction—not just the implementation. I’d love to bring that same mix of systems thinking and visual clarity to ${job.company}.\n\nI’d be glad to share a focused walkthrough of the work most relevant to this team.\n\nBest,\n${profile.full_name}`; }
function withCookie(sessionId: string, existing: string) { return existing ? {} : { 'set-cookie': `${cookieName}=${sessionId}; Path=/; Max-Age=31536000; SameSite=Lax; Secure` }; }
async function ensureSession(sessionId: string) { await db('signal_sessions', { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' }, body: JSON.stringify({ id: sessionId }) }); }
async function getJobs(): Promise<Job[]> { let jobs = await db('signal_jobs?select=*') as Job[]; if (!jobs.length) { jobs = await db('signal_jobs', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(seedJobs) }) as Job[]; } return jobs; }

export default async function handler(request: Request) {
  try {
    const path = new URL(request.url).pathname.replace(/^\/api\/?/, '').replace(/\/$/, '');
    const body = request.method === 'GET' ? {} : await request.json().catch(() => ({}));
    const existing = sessionFrom(request);
    const sessionId = existing || crypto.randomUUID();
    if (request.method === 'GET' && path === 'health') return json({ status: 'ok', service: 'signal-arc', database: 'supabase-postgres' });
    await ensureSession(sessionId);
    const cookie = withCookie(sessionId, existing);
    const jobs = await getJobs();
    if (request.method === 'GET' && (path === '' || path === 'bootstrap')) {
      const [profiles, analysis, drafts, usage] = await Promise.all([
        db(`signal_profiles?select=*&session_id=eq.${sessionId}&limit=1`) as Promise<Profile[]>,
        db(`signal_analysis?select=*&session_id=eq.${sessionId}`) as Promise<Analysis[]>,
        db(`signal_drafts?select=*&session_id=eq.${sessionId}&order=created_at.desc`) as Promise<Draft[]>,
        db(`signal_usage?select=units&session_id=eq.${sessionId}`) as Promise<{ units: number }[]>,
      ]);
      return json({ profile: profiles[0] || null, jobs, analysis, drafts, usageCount: usage.reduce((sum, item) => sum + item.units, 0) }, 200, cookie);
    }
    if (request.method === 'POST' && path === 'profile') {
      const resumeText = String((body as { resumeText?: string }).resumeText || '');
      const parsed = parseResume(resumeText); const profile = { session_id: sessionId, resume_text: resumeText, ...parsed };
      await db('signal_profiles', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=representation' }, body: JSON.stringify(profile) });
      await db('signal_usage', { method: 'POST', body: JSON.stringify({ session_id: sessionId, event: 'resume.parse', units: 1 }) });
      return json({ profile }, 200, cookie);
    }
    if (request.method === 'POST' && path === 'analyze') {
      const profiles = await db(`signal_profiles?select=*&session_id=eq.${sessionId}&limit=1`) as Profile[]; if (!profiles[0]) return json({ error: 'Add your resume signal first.' }, 400, cookie);
      const results = jobs.map((job) => { const result = analyze(profiles[0], job); return { session_id: sessionId, job_id: job.id, ...result, updated_at: new Date().toISOString() }; });
      await db('signal_analysis', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(results) });
      await db('signal_usage', { method: 'POST', body: JSON.stringify({ session_id: sessionId, event: 'jobs.analyze', units: jobs.length }) });
      return json({ analysis: results.map(({ job_id, score, reasons }) => ({ job_id, score, reasons })) }, 200, cookie);
    }
    if (request.method === 'POST' && path === 'drafts') {
      const profiles = await db(`signal_profiles?select=*&session_id=eq.${sessionId}&limit=1`) as Profile[]; const job = jobs.find((item) => item.id === (body as { jobId?: string }).jobId); if (!profiles[0] || !job) return json({ error: 'Choose a role and add your profile first.' }, 400, cookie);
      const now = new Date().toISOString(); const item = { id: crypto.randomUUID(), session_id: sessionId, job_id: job.id, body: draft(profiles[0], job), status: 'review', created_at: now, updated_at: now };
      await db('signal_drafts', { method: 'POST', body: JSON.stringify(item) }); await db('signal_usage', { method: 'POST', body: JSON.stringify({ session_id: sessionId, event: 'draft.create', units: 1 }) });
      return json({ draft: item }, 200, cookie);
    }
    if (request.method === 'POST' && path === 'ingest') {
      const input = body as Partial<Job>; if (!input.company || !input.role || !input.description) return json({ error: 'company, role, and description are required.' }, 400, cookie);
      const item = { id: crypto.randomUUID(), slug: `custom-${crypto.randomUUID()}`, company: input.company, role: input.role, location: input.location || 'Remote', kind: input.kind || 'Full-time', salary: input.salary || 'Not listed', description: input.description, tags: input.tags || [], accent: input.accent || '#d5ff55' };
      const created = await db('signal_jobs', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(item) }) as Job[]; return json({ job: created[0] || item }, 200, cookie);
    }
    return json({ error: 'Route not found.' }, 404, cookie);
  } catch (error) { return json({ error: error instanceof Error ? error.message : 'Unexpected error.' }, 500); }
}
