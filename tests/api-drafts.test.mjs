import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../api/[...path].ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { default: handler } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('draft edits persist only within the current session', async () => {
  const oldFetch = globalThis.fetch;
  const oldUrl = process.env.SUPABASE_URL;
  const oldKey = process.env.SUPABASE_SECRET_KEY;
  process.env.SUPABASE_URL = 'https://database.example';
  process.env.SUPABASE_SECRET_KEY = 'test-key';
  const sessionId = '11111111-1111-4111-8111-111111111111';
  const draftId = '22222222-2222-4222-8222-222222222222';
  const updatedText = 'A revised letter with enough detail to save safely.';
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), method: init.method || 'GET', body: init.body });
    if (String(url).includes('/signal_sessions')) return init.method === 'POST' ? new Response('', { status: 201 }) : Response.json([{user_id:null}]);
    if (String(url).includes('/signal_usage')) return init.method === 'POST' ? new Response('', {status:201}) : Response.json([]);
    if (String(url).includes('/signal_jobs')) return Response.json([{ id: '33333333-3333-4333-8333-333333333333', slug: 'sample', company: 'Example', role: 'Engineer', location: 'Remote', kind: 'Full-time', salary: 'Not listed', description: 'Sample role', tags: [], accent: '#d5ff55' }]);
    if (String(url).includes('/signal_drafts') && init.method === 'PATCH') return Response.json([{ id: draftId, session_id: sessionId, job_id: '33333333-3333-4333-8333-333333333333', body: updatedText, status: 'reviewed' }]);
    throw new Error(`Unexpected database call: ${url}`);
  };

  try {
    const result = { statusCode: 200, headers: {}, setHeader(name, value) { this.headers[name] = value; }, end(value) { this.body = value; } };
    await handler({ method: 'PATCH', url: '/api/drafts', headers: { host: 'signal-arc.test', cookie: `signal_session=${sessionId}` }, body: { id: draftId, body: updatedText, status: 'reviewed' } }, result);
    assert.equal(result.statusCode, 200);
    assert.equal(JSON.parse(result.body).draft.status, 'reviewed');
    const patch = calls.find((call) => call.method === 'PATCH');
    assert.ok(patch.url.includes(`id=eq.${draftId}&session_id=eq.${sessionId}`));
    assert.equal(JSON.parse(patch.body).body, updatedText);
  } finally {
    globalThis.fetch = oldFetch;
    if (oldUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = oldUrl;
    if (oldKey === undefined) delete process.env.SUPABASE_SECRET_KEY; else process.env.SUPABASE_SECRET_KEY = oldKey;
  }
});

test('regeneration creates a fresh revision while default requests preserve existing drafts', async()=>{
 const oldFetch=globalThis.fetch, oldUrl=process.env.SUPABASE_URL, oldKey=process.env.SUPABASE_SECRET_KEY;
 process.env.SUPABASE_URL='https://database.example';process.env.SUPABASE_SECRET_KEY='test-key';
 const sessionId='11111111-1111-4111-8111-111111111111',jobId='33333333-3333-4333-8333-333333333333';
 const previous={id:'22222222-2222-4222-8222-222222222222',session_id:sessionId,job_id:jobId,body:'A carefully edited older application letter.',status:'reviewed'};
 const calls=[];
 globalThis.fetch=async(url,init={})=>{
  calls.push({url:String(url),method:init.method||'GET',body:init.body});
  if(String(url).includes('/signal_sessions'))return init.method==='POST'?new Response('',{status:201}):Response.json([{user_id:null}]);
  if(String(url).includes('/signal_usage'))return init.method==='POST'?new Response('',{status:201}):Response.json([]);
  if(String(url).includes('/signal_jobs'))return Response.json([{id:jobId,company:'Example',role:'Engineer',description:'Build React applications',tags:['react']}]);
  if(String(url).includes('/signal_profiles'))return Response.json([{full_name:'Updated Name',skills:['react'],resume_text:'Updated Name\nEngineer\nReact projects'}]);
  if(String(url).includes('/signal_drafts'))return init.method==='POST'?new Response('',{status:201}):Response.json([previous]);
  throw new Error(`Unexpected database call: ${url}`);
 };
 const request=async(regenerate)=>{const result={statusCode:200,headers:{},setHeader(name,value){this.headers[name]=value;},end(value){this.body=value;}};await handler({method:'POST',url:'/api/drafts',headers:{host:'signal-arc.test',cookie:`signal_session=${sessionId}`},body:{jobId,...(regenerate?{regenerate:true}:{})}},result);assert.equal(result.statusCode,200);return JSON.parse(result.body).draft;};
 try{
  assert.equal((await request(false)).id,previous.id);
  assert.equal(calls.filter(call=>call.url.includes('/signal_drafts')&&call.method==='POST').length,0);
  const revision=await request(true);assert.notEqual(revision.id,previous.id);assert.equal(revision.status,'review');assert.ok(revision.body.includes('Updated Name'));
  const writes=calls.filter(call=>call.url.includes('/signal_drafts')&&call.method==='POST');assert.equal(writes.length,1);assert.equal(JSON.parse(writes[0].body).session_id,sessionId);
  assert.equal(calls.filter(call=>call.url.includes('/signal_drafts')&&['PATCH','DELETE'].includes(call.method)).length,0);
 }finally{globalThis.fetch=oldFetch;if(oldUrl===undefined)delete process.env.SUPABASE_URL;else process.env.SUPABASE_URL=oldUrl;if(oldKey===undefined)delete process.env.SUPABASE_SECRET_KEY;else process.env.SUPABASE_SECRET_KEY=oldKey;}
});
