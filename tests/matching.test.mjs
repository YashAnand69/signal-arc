import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
const source = await readFile(new URL('../api/[...path].ts', import.meta.url), 'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {parseResume,analyze,draft,normalizeSkills,isValidDate}=await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
test('skill extraction recognizes aliases without matching substrings',()=>{
 const profile=parseResume('Test Person\nEngineer\nReact.js, PostgreSQL, Node.js. I use TypeScript and Three.js.');
 assert.deepEqual(profile.skills,['react','typescript','postgres','three.js','node']);
 assert.equal(parseResume('Another Person\nEngineer\nMy reaction to products matters.').skills.includes('react'),false);
});
test('coverage is zero when evidence is absent and describes missing skills',()=>{
 const result=analyze({skills:[]},{tags:['react','typescript'],description:'Build interfaces'});
 assert.equal(result.score,0);assert.ok(result.reasons.some(reason=>reason.includes('Not found')));
 const partial=analyze({skills:['react']},{tags:['react','typescript'],description:'Build interfaces'});
 assert.equal(partial.score,50);
});
test('draft does not invent achievements or experience',()=>{
 const body=draft({full_name:'Test Person',headline:'Student',skills:['react']},{company:'Example',role:'Engineer',tags:['react']});
 assert.ok(body.includes('[Add one specific'));assert.ok(body.includes('My profile includes react'));
 assert.ok(!body.includes('built end-to-end'));assert.ok(!body.includes('reliable APIs'));
});

test('manual aliases and description aliases count as one requirement',()=>{
 assert.deepEqual(normalizeSkills(['React.js','react','ReactJS','Node.js','node']),['react','node']);
 const profile=parseResume('Test Person\nEngineer\nBuilt a React.js application with Node.js.');
 const result=analyze({...profile,resume_text:'Test Person\nEngineer\nBuilt a React.js application with Node.js.'},{tags:['React.js','ReactJS','Node.js'],description:'Use React and Node.js'});
 assert.equal(result.score,100);
 assert.match(result.reasons[0],/2 of 2/);
 assert.ok(result.reasons.some(reason=>reason.includes('Resume evidence: “Built a React.js application with Node.js.')));
});
test('evidence is an exact bounded resume passage and limitations remain explicit',()=>{
 const resume='Test Person\nEngineer\n'+('Earlier experience '.repeat(30))+'React.js prototype '+('with collaborators '.repeat(30));
 const result=analyze({...parseResume(resume),resume_text:resume},{tags:['react'],description:'Build interfaces'});
 const reason=result.reasons.find(reason=>reason.includes('Resume evidence'));
 assert.ok(reason.includes('React.js'));assert.ok(reason.length<280);
 assert.ok(result.reasons.some(reason=>reason.includes('do not establish proficiency')));
 const empty=analyze({...parseResume(resume),resume_text:resume},{tags:[],description:'An opportunity with broad responsibilities.'});
 assert.equal(empty.score,0);assert.match(empty.reasons[0],/insufficient information/);
});
test('deadline validation rejects impossible dates and accepts leap days',()=>{
 assert.equal(isValidDate('2026-02-29'),false);
 assert.equal(isValidDate('2026-04-31'),false);
 assert.equal(isValidDate('2028-02-29'),true);
 assert.equal(isValidDate('2026-10-05'),true);
 assert.equal(isValidDate('10/05/2026'),false);
 assert.equal(isValidDate(null),false);
});

test('custom role skills match exact bounded resume mentions',()=>{
 const profile={...parseResume('Test Person\nEngineer\nBuilt with Svelte and Terraform.'),resume_text:'Test Person\nEngineer\nBuilt with Svelte and Terraform.'};
 const result=analyze(profile,{tags:['svelte','terraform','form'],description:'Build a platform'});
 assert.equal(result.score,67);
 assert.ok(result.reasons.some(reason=>reason.includes('Matched: svelte. Resume evidence')));
 assert.ok(result.reasons.some(reason=>reason.includes('Not found in your profile: form')));
});
