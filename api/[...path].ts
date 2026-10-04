type Job = { id: string; slug: string; session_id?: string | null; company: string; role: string; location: string; kind: string; salary: string; description: string; tags: string[]; accent: string; source_url?: string };
type Profile = { session_id: string; resume_text: string; full_name: string; headline: string; skills: string[] };
type Analysis = { session_id: string; job_id: string; score: number; reasons: string[]; updated_at: string };
type Draft = { id: string; session_id: string; job_id: string; body: string; status: string; created_at: string; updated_at: string };
const cookieName = 'signal_session';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const headers = { 'content-type': 'application/json', 'cache-control': 'no-store' };
const publishableKey = 'sb_publishable_RCcRopULL7ThWuHCswvR0A_0qysCybG';
const seedJobs = [
  { slug: 'lattice-frontend', company: 'Lattice Systems', role: 'Senior Frontend Engineer', location: 'Remote · EU / India', kind: 'Full-time', salary: '$145k — $180k', description: 'Own the interface layer for a developer platform used by teams shipping critical infrastructure. Shape a component system, partner with product, and turn complex state into calm experiences.', tags: ['react', 'typescript', 'design systems', 'systems'], accent: '#d5ff55' },
  { slug: 'northstar-product', company: 'Northstar Labs', role: 'Product Engineer', location: 'Bengaluru · Hybrid', kind: 'Full-time', salary: '₹36L — ₹52L', description: 'Build fast experiments from customer insight to production. The team values product sense, clear writing, and engineers who can move between interface, data, and APIs.', tags: ['react', 'product', 'api', 'python'], accent: '#ff8d66' },
  { slug: 'atlas-ai', company: 'Atlas AI', role: 'AI Platform Engineer', location: 'New York · Remote', kind: 'Full-time', salary: '$155k — $210k', description: 'Design reliable evaluation and observability loops for AI products. Make model behavior legible through structured data, instrumentation, and thoughtful tooling.', tags: ['python', 'llm', 'postgres', 'observability'], accent: '#9b8cff' },
  { slug: 'morrow-studio', company: 'Morrow Studio', role: 'Creative Technologist', location: 'London · Hybrid', kind: 'Contract', salary: '£500 — £700 / day', description: 'Create expressive digital tools and prototypes that feel as good as they function. Strong visual taste and a willingness to work across code, motion, and narrative are essential.', tags: ['three.js', 'motion', 'react', 'prototyping'], accent: '#65d8ff' },
];

function config() { const url = process.env.SUPABASE_URL; const key = process.env.SUPABASE_SECRET_KEY; if (!url || !key) throw new Error('Database configuration missing'); return { url, key }; }
async function db(table: string, init: RequestInit = {}) {
  const { url, key } = config();
  const response = await fetch(`${url}/rest/v1/${table}`, { ...init, signal: AbortSignal.timeout(12000), headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...init.headers } });
  const text = await response.text(); let data: any = null; try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) throw new Error(typeof data === 'object' && data?.message ? data.message : `Database request failed (${response.status})`); return data;
}
function json(body: unknown, status = 200, extra: Record<string, string> = {}) { return new Response(JSON.stringify(body), { status, headers: { ...headers, ...extra } }); }
function sessionFrom(request: Request) { const value = request.headers.get('cookie')?.match(new RegExp(`${cookieName}=([^;]+)`))?.[1] || ''; return uuid.test(value) ? value : ''; }
const aliases: Record<string, string[]> = { react: ['react','reactjs','react.js'], typescript:['typescript'], javascript:['javascript'], python:['python'], postgres:['postgres','postgresql'], llm:['llm','large language model','generative ai'], 'three.js':['three.js','threejs'], 'design systems':['design system','design systems'], product:['product'], api:['api','apis','rest','graphql'], motion:['motion','animation'], observability:['observability','monitoring'], node:['node','node.js','nodejs'], sql:['sql'], docker:['docker'], aws:['aws'], testing:['testing','jest','playwright'], css:['css','tailwind'], java:['java'], figma:['figma'], git:['git'], leadership:['leadership','mentoring'], communication:['communication'], accessibility:['accessibility','wcag'], kubernetes:['kubernetes'], go:['golang'], rust:['rust'] };
export function extractSkills(text: string) { const value = text.toLowerCase(); return Object.entries(aliases).filter(([, names]) => names.some((name) => new RegExp(`(^|[^a-z0-9])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`, 'i').test(value))).map(([skill]) => skill); }
export function parseResume(text: string) { const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean); return { full_name: lines[0]?.slice(0, 70) || 'Your name', headline: lines[1]?.slice(0, 100) || '', skills: extractSkills(text) }; }
export function analyze(profile: Profile, job: Job) {
  const required = [...new Set([...job.tags.map((tag) => tag.toLowerCase()), ...extractSkills(job.description)])];
  const hits = required.filter((skill) => profile.skills.includes(skill)); const missing = required.filter((skill) => !profile.skills.includes(skill));
  const score = required.length ? Math.round(hits.length / required.length * 100) : 0;
  const reasons = [`${hits.length} of ${required.length} identifiable skill signals match. This is skill coverage, not a hiring prediction.`, ...hits.map((skill) => `Matched: ${skill} appears in your profile and this role.`), ...(missing.length ? [`Not found in your profile: ${missing.join(', ')}. Add evidence if you have it.`] : []), ...(!required.length ? ['No recognizable skills found in this role. Add skill tags to get a meaningful comparison.'] : [])]; return { score, reasons };
}
export function draft(profile: Profile, job: Job) { const matched = job.tags.filter((skill) => profile.skills.includes(skill)); const skills = (matched.length ? matched : profile.skills).slice(0, 4).join(', '); return `Hi ${job.company} team,\n\nI’m ${profile.full_name}, and I’m interested in the ${job.role} role at ${job.company}.\n\n${skills ? `My profile includes ${skills}. I’d welcome the opportunity to discuss how this experience relates to your team’s needs.` : 'I’d welcome the opportunity to discuss the role and share the relevant details of my experience.'}\n\n[Add one specific project or achievement from your experience, with an outcome you can substantiate.]\n\nI’d be happy to share relevant work and learn more about the team.\n\nBest,\n${profile.full_name}`; }
function withCookie(sessionId: string, existing: string): Record<string, string> { return existing === sessionId ? {} : { 'set-cookie': `${cookieName}=${sessionId}; Path=/; Max-Age=31536000; SameSite=Lax; Secure; HttpOnly` }; }
async function ensureSession(sessionId: string, userId?: string) { await db('signal_sessions', { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' }, body: JSON.stringify({ id: sessionId, ...(userId ? {user_id:userId} : {}) }) }); }
async function getJobs(sessionId: string): Promise<Job[]> { return db(`signal_jobs?select=*&or=(session_id.is.null,session_id.eq.${sessionId})&order=created_at.desc`); }
const representation = { Prefer: 'return=representation' }; const upsert = { Prefer: 'resolution=merge-duplicates,return=representation' };
async function webHandler(request: Request) {
  try {
    const path = new URL(request.url).pathname.replace(/^\/api\/?/, '').replace(/\/$/, '');
    if (path === 'auth-config' && request.method === 'GET') return json({ url: config().url, key: publishableKey });
    if (request.method === 'GET' && path === 'health') { await db('signal_sessions?select=id&limit=1'); return json({ status:'ok', database:'connected' }); }
    if (!['GET','POST','PATCH','DELETE'].includes(request.method)) return json({error:'Method not allowed'},405);
    if (Number(request.headers.get('content-length') || 0) > 250000) return json({error:'Request too large'},413);
    if (request.method !== 'GET') { const origin = request.headers.get('origin'); if (origin && origin !== new URL(request.url).origin) return json({error:'Origin not allowed'},403); }
    const body: any = request.method === 'GET' ? {} : await request.json().catch(() => ({}));
    const existing = sessionFrom(request); let sessionId = existing || crypto.randomUUID(); let user: any = null;
    const token = request.headers.get('authorization');
    if (token) { const {url} = config(); const result = await fetch(`${url}/auth/v1/user`, {headers:{apikey:publishableKey,Authorization:token},signal:AbortSignal.timeout(12000)}); if(!result.ok) return json({error:'Your login expired. Please sign in again.'},401); user = await result.json(); sessionId=user.id; }
    else if(existing) { const owners = await db(`signal_sessions?select=user_id&id=eq.${existing}`); if(owners[0]?.user_id) sessionId=crypto.randomUUID(); }
    await ensureSession(sessionId,user?.id); const cookie=withCookie(sessionId,existing);
    if (request.method === 'POST' && path === 'claim' && user && existing && existing !== sessionId) { await db('rpc/signal_claim_workspace',{method:'POST',body:JSON.stringify({guest_id:existing,account_id:sessionId})}); return json({ok:true},200,cookie); }
    const jobs = await getJobs(sessionId);
    if (request.method === 'GET' && (path === '' || path === 'bootstrap' || path === 'export')) {
      const [profiles, analysis, drafts, usage, applications] = await Promise.all([db(`signal_profiles?select=*&session_id=eq.${sessionId}&limit=1`),db(`signal_analysis?select=*&session_id=eq.${sessionId}`),db(`signal_drafts?select=*&session_id=eq.${sessionId}&order=created_at.desc`),db(`signal_usage?select=units&session_id=eq.${sessionId}`),db(`signal_applications?select=*&session_id=eq.${sessionId}&order=updated_at.desc`)]);
      return json({ profile:profiles[0]||null,jobs,analysis,drafts,applications,user:user?{email:user.email,id:user.id}:null,usageCount:usage.reduce((sum:number,item:any)=>sum+item.units,0)},200,cookie);
    }
    const recent = await db(`signal_usage?select=id&session_id=eq.${sessionId}&created_at=gte.${encodeURIComponent(new Date(Date.now()-60000).toISOString())}`);
    if(recent.length >= 30) return json({error:'Please wait a minute before making more changes.'},429,cookie);
    if(request.method !== 'GET') await db('signal_usage',{method:'POST',body:JSON.stringify({session_id:sessionId,event:path,units:1})});
    if (request.method === 'POST' && path === 'profile') {
      const resumeText = typeof body.resumeText === 'string' ? body.resumeText.trim() : ''; if(resumeText.length<20||resumeText.length>100000) return json({error:'Add a resume between 20 and 100,000 characters.'},400,cookie);
      const parsed=parseResume(resumeText); const profile={session_id:sessionId,resume_text:resumeText,...parsed,updated_at:new Date().toISOString()}; await db('signal_profiles',{method:'POST',headers:upsert,body:JSON.stringify(profile)}); await db(`signal_analysis?session_id=eq.${sessionId}`,{method:'DELETE'}); return json({profile},200,cookie);
    }
    if(request.method==='POST'&&path==='analyze') { const profiles=await db(`signal_profiles?select=*&session_id=eq.${sessionId}&limit=1`); if(!profiles[0])return json({error:'Add your resume first.'},400,cookie); const results=jobs.map(job=>({session_id:sessionId,job_id:job.id,...analyze(profiles[0],job),updated_at:new Date().toISOString()})); if(results.length)await db('signal_analysis',{method:'POST',headers:upsert,body:JSON.stringify(results)});return json({analysis:results},200,cookie); }
    if(request.method==='POST'&&path==='drafts') { const profiles=await db(`signal_profiles?select=*&session_id=eq.${sessionId}&limit=1`);const job=jobs.find(item=>item.id===body.jobId);if(!profiles[0]||!job)return json({error:'Choose a role and add your profile first.'},400,cookie);const found=await db(`signal_drafts?select=*&session_id=eq.${sessionId}&job_id=eq.${job.id}&order=created_at.desc&limit=1`);if(found.length)return json({draft:found[0]},200,cookie);const now=new Date().toISOString();const item={id:crypto.randomUUID(),session_id:sessionId,job_id:job.id,body:draft(profiles[0],job),status:'review',created_at:now,updated_at:now};await db('signal_drafts',{method:'POST',body:JSON.stringify(item)});return json({draft:item},200,cookie); }
    if(request.method==='PATCH'&&path==='drafts') { if(!uuid.test(body.id||'')||typeof body.body!=='string'||body.body.trim().length<20||body.body.length>12000||!['review','reviewed'].includes(body.status))return json({error:'Enter valid draft text and review status.'},400,cookie);if(body.status==='reviewed'&&/\[Add one specific/.test(body.body))return json({error:'Replace the achievement placeholder before marking reviewed.'},400,cookie);const updated=await db(`signal_drafts?id=eq.${body.id}&session_id=eq.${sessionId}`,{method:'PATCH',headers:representation,body:JSON.stringify({body:body.body,status:body.status,updated_at:new Date().toISOString()})});return updated.length?json({draft:updated[0]},200,cookie):json({error:'Draft not found in this workspace.'},404,cookie); }
    if(request.method==='POST'&&path==='ingest') { const company=String(body.company||'').trim(),role=String(body.role||'').trim(),description=String(body.description||'').trim();if(!company||company.length>100||!role||role.length>150||description.length<20||description.length>20000)return json({error:'Add company, role, and a description of 20–20,000 characters.'},400,cookie);let source_url='';try{if(body.source_url){const u=new URL(body.source_url);if(u.protocol!=='https:')throw new Error();source_url=u.href;}}catch{return json({error:'Use a valid HTTPS job link.'},400,cookie);}const tags=[...new Set([...extractSkills(description),...(Array.isArray(body.tags)?body.tags:[])].map((x:any)=>String(x).toLowerCase().trim()).filter(x=>x&&x.length<50))].slice(0,30);const item={id:crypto.randomUUID(),session_id:sessionId,slug:`custom-${crypto.randomUUID()}`,company,role,description,tags,location:String(body.location||'Not specified').slice(0,150),kind:String(body.kind||'Full-time').slice(0,50),salary:String(body.salary||'Not listed').slice(0,100),source_url,accent:'#b8c9aa'};const created=await db('signal_jobs',{method:'POST',headers:representation,body:JSON.stringify(item)});return json({job:created[0]},200,cookie); }
    if(request.method==='POST'&&path==='applications') { if(!jobs.some(job=>job.id===body.job_id))return json({error:'Choose a role in this workspace.'},400,cookie);const stages=['saved','applied','interview','offer','closed'];if(!stages.includes(body.stage)||typeof body.notes!=='string'||body.notes.length>5000|| (body.deadline&&!/^\d{4}-\d{2}-\d{2}$/.test(body.deadline)))return json({error:'Choose a valid stage, notes, and date.'},400,cookie);const item={session_id:sessionId,job_id:body.job_id,stage:body.stage,notes:body.notes,deadline:body.deadline||null,updated_at:new Date().toISOString()};const saved=await db('signal_applications',{method:'POST',headers:upsert,body:JSON.stringify(item)});return json({application:saved[0]},200,cookie); }
    if(request.method==='DELETE'&&path==='applications'&&uuid.test(body.job_id||'')){await db(`signal_applications?session_id=eq.${sessionId}&job_id=eq.${body.job_id}`,{method:'DELETE'});return json({ok:true},200,cookie);}
    return json({error:'Route not found.'},404,cookie);
  } catch(error) { console.error('Signal Arc API:',error instanceof Error?error.message:'Unexpected error');return json({error:'Your workspace is temporarily unavailable. Please retry shortly.'},503); }
}
// Vercel's Node runtime uses the `(req, res)` contract for TypeScript API
// functions. Keep the core request handling Web-standard so it remains easy
// to exercise locally, then bridge the response to Node here.
export default async function handler(req: any, res: any) {
  const init: RequestInit = { method: req.method, headers: req.headers };
  if (req.method !== 'GET' && req.method !== 'HEAD') init.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
  const request = new Request(`https://${req.headers.host || 'signal-arc-yash.vercel.app'}${req.url || '/'}`, init);
  const response = await webHandler(request);
  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.setHeader(key, value));
  res.end(await response.text());
}
