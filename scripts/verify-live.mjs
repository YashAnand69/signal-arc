import assert from 'node:assert/strict';
const base=process.env.SIGNAL_ARC_URL||'https://signal-arc-yash.vercel.app';
let cookie='',otherCookie='';
async function call(path,method='GET',body,jar='main'){
 const response=await fetch(`${base}/api/${path}`,{method,headers:{'content-type':'application/json',...(jar==='main'&&cookie?{cookie}:{}),...(jar==='other'&&otherCookie?{cookie:otherCookie}:{}),...(jar==='invalid'?{Authorization:'Bearer invalid-token'}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const next=response.headers.get('set-cookie');if(next){if(jar==='main')cookie=next.split(';')[0];if(jar==='other')otherCookie=next.split(';')[0];}
 return {status:response.status,data:await response.json()};
}
const marker=`Verification ${Date.now()}`;
try{
 assert.equal((await call('health')).data.database,'connected');
 const initial=await call('bootstrap');assert.equal(initial.status,200);assert.ok(initial.data.jobs.length>=4);
 assert.equal((await call('profile','POST',{resumeText:'x'})).status,400);
 const profile=await call('profile','POST',{resumeText:'Verification Person\nSoftware engineer\nReact, TypeScript, PostgreSQL, Node.js. Built an accessible project with tests.'});assert.equal(profile.status,200);assert.ok(profile.data.profile.skills.includes('postgres'));
 const added=await call('ingest','POST',{company:marker,role:'Frontend Engineer',description:'Build accessible React and TypeScript applications with testing.',tags:['react','typescript','testing'],source_url:'https://example.com/jobs/verification'});assert.equal(added.status,200);const jobId=added.data.job.id;
 const analysis=await call('analyze','POST',{});assert.equal(analysis.status,200);assert.ok(analysis.data.analysis.find(a=>a.job_id===jobId));
 const created=await call('drafts','POST',{jobId});assert.equal(created.status,200);assert.ok(created.data.draft.body.includes('[Add one specific'));const draftId=created.data.draft.id;
 assert.equal((await call('drafts','PATCH',{id:draftId,body:created.data.draft.body,status:'reviewed'})).status,400);
 const text='Hi Verification team,\nI built a React and TypeScript project with accessible components and tests. I would like to discuss your engineering role.\nBest, Verification Person';
 assert.equal((await call('drafts','PATCH',{id:draftId,body:text,status:'reviewed'})).status,200);
 const tracked=await call('applications','POST',{job_id:jobId,stage:'interview',notes:'Prepare project walkthrough',deadline:'2026-12-01'});assert.equal(tracked.status,200);
 const reload=await call('bootstrap');assert.equal(reload.data.profile.full_name,'Verification Person');assert.equal(reload.data.drafts.find(d=>d.id===draftId).body,text);assert.equal(reload.data.applications.find(a=>a.job_id===jobId).stage,'interview');
 const other=await call('bootstrap','GET',undefined,'other');assert.ok(!other.data.jobs.some(j=>j.id===jobId));assert.ok(!other.data.drafts.some(d=>d.id===draftId));assert.ok(!other.data.profile);
 assert.equal((await call('drafts','PATCH',{id:draftId,body:text,status:'reviewed'},'other')).status,404);
 assert.equal((await call('applications','POST',{job_id:jobId,stage:'saved',notes:''},'other')).status,400);
 assert.equal((await call('roles','DELETE',{id:jobId},'other')).status,404);
 assert.equal((await call('bootstrap','GET',undefined,'invalid')).status,401);
 assert.equal((await call('export')).data.applications.length,1);
 console.log('PASS: live database, resume parsing, private role ingestion, matching, drafting, review, tracking, reload, export, and session isolation.');
}finally{
 if(cookie){const result=await call('workspace','DELETE',{});assert.equal(result.status,200,'Test workspace cleanup failed');const empty=await call('bootstrap');assert.equal(empty.data.profile,null);assert.equal(empty.data.drafts.length,0);assert.equal(empty.data.applications.length,0);assert.ok(!empty.data.jobs.some(j=>j.company===marker));}
 if(otherCookie)await call('workspace','DELETE',{},'other');
}
