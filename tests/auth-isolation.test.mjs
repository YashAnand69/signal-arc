import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
const source=await readFile(new URL('../api/[...path].ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {default:handler}=await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const account='11111111-1111-4111-8111-111111111111',guest='22222222-2222-4222-8222-222222222222';
async function request(headers={}) {const result={headers:{},setHeader(n,v){this.headers[n]=v;},end(body){this.body=JSON.parse(body);}};await handler({method:'GET',url:'/api/bootstrap',headers:{host:'signal-arc.test',...headers}},result);return result;}
async function mock(callback,run){const oldFetch=globalThis.fetch,oldUrl=process.env.SUPABASE_URL,oldKey=process.env.SUPABASE_SECRET_KEY;process.env.SUPABASE_URL='https://database.example';process.env.SUPABASE_SECRET_KEY='test-key';globalThis.fetch=callback;try{await run();}finally{globalThis.fetch=oldFetch;if(oldUrl===undefined)delete process.env.SUPABASE_URL;else process.env.SUPABASE_URL=oldUrl;if(oldKey===undefined)delete process.env.SUPABASE_SECRET_KEY;else process.env.SUPABASE_SECRET_KEY=oldKey;}}
test('invalid account tokens are rejected before reading workspace data',async()=>{
 const calls=[];await mock(async(url)=>{calls.push(String(url));return Response.json({error:'invalid'},{status:401});},async()=>{const result=await request({authorization:'Bearer invalid'});assert.equal(result.statusCode,401);assert.equal(calls.length,1);assert.ok(calls[0].endsWith('/auth/v1/user'));});
});
test('authenticated ownership comes from verified user, not a supplied cookie',async()=>{
 const calls=[];await mock(async(url,init={})=>{calls.push({url:String(url),init});if(String(url).endsWith('/auth/v1/user'))return Response.json({id:account,email:'test@example.com'});if(init.method==='POST')return new Response('',{status:201});return Response.json([]);},async()=>{const result=await request({authorization:'Bearer verified-test-token',cookie:`signal_session=${guest}`});assert.equal(result.statusCode,200);assert.equal(result.body.user.id,account);for(const call of calls.filter(c=>/signal_(profiles|drafts|analysis|usage|applications)/.test(c.url)))assert.ok(call.url.includes(`session_id=eq.${account}`));assert.ok(!calls.some(c=>c.url.includes(`session_id=eq.${guest}`)));});
});
test('an account UUID in a guest cookie cannot read that account workspace',async()=>{
 const calls=[];await mock(async(url,init={})=>{calls.push({url:String(url),init});if(String(url).includes('/signal_sessions?'))return Response.json([{user_id:account}]);if(init.method==='POST')return new Response('',{status:201});return Response.json([]);},async()=>{const result=await request({cookie:`signal_session=${account}`});assert.equal(result.statusCode,200);assert.equal(result.body.user,null);const next=result.headers['set-cookie'];assert.ok(next.includes('HttpOnly'));assert.ok(!next.includes(account));for(const call of calls.filter(c=>/signal_(profiles|drafts|analysis|usage|applications)/.test(c.url)))assert.ok(!call.url.includes(`session_id=eq.${account}`));});
});
