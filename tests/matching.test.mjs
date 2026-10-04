import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
const source = await readFile(new URL('../api/[...path].ts', import.meta.url), 'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {parseResume,analyze,draft}=await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
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
