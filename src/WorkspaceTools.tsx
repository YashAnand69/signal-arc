import { useEffect, useRef, useState } from 'react';
import { Plus, Bookmark, Download, LogIn, X, LoaderCircle } from 'lucide-react';
import { api, authClient, downloadText } from './client';
export type Application = {job_id:string;stage:string;notes:string;deadline:string|null;updated_at:string};
type Role={id:string;company:string;role:string;source_url?:string};
export function useDialog(open:boolean,onClose:()=>void,selector='.account-dialog'){
 const closeRef=useRef(onClose);closeRef.current=onClose;
 useEffect(()=>{
  if(!open)return;
  const previous=document.activeElement as HTMLElement|null;
  const dialog=document.querySelector<HTMLElement>(selector);
  if(!dialog)return;
  const previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
  const focusable=()=>Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex]:not([tabindex="-1"])')).filter(el=>el.getClientRects().length>0);
  dialog.tabIndex=-1;(focusable()[0]||dialog).focus();
  const key=(event:KeyboardEvent)=>{
   if(event.key==='Escape'){event.preventDefault();closeRef.current();return;}
   if(event.key!=='Tab')return;
   const list=focusable(),first=list[0],last=list[list.length-1];
   if(!first){event.preventDefault();dialog.focus();return;}
   if(!dialog.contains(document.activeElement)){event.preventDefault();(event.shiftKey?last:first).focus();}
   else if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  };
  document.addEventListener('keydown',key);
  return()=>{document.removeEventListener('keydown',key);document.body.style.overflow=previousOverflow;if(previous?.isConnected)previous.focus();};
 },[open,selector]);
}
type TrackerEdit={stage:string;notes:string;deadline:string};
const trackerEdits=new Map<string,TrackerEdit>();
const warnUnsaved=(event:BeforeUnloadEvent)=>{if(trackerEdits.size){event.preventDefault();event.returnValue='';}};
function syncUnloadWarning(){window.removeEventListener('beforeunload',warnUnsaved);if(trackerEdits.size)window.addEventListener('beforeunload',warnUnsaved);}
export function clearTrackerEdits(){trackerEdits.clear();syncUnloadWarning();}
function deadlineLabel(deadline:string,stage:string){
 if(!deadline||stage==='closed'||stage==='offer')return '';
 const today=new Date();today.setHours(0,0,0,0);const due=new Date(deadline+'T00:00:00');const days=Math.round((due.getTime()-today.getTime())/86400000);
 if(!Number.isFinite(days))return '';
 return days<0?`Deadline passed ${Math.abs(days)} day${days===-1?'':'s'} ago`:days===0?'Due today':days===1?'Due tomorrow':`Due in ${days} days`;
}
function csvCell(value:unknown){let text=String(value||'');if(/^[=+@\-\t\r]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';}
export function Account({email,onSignedIn,onError}:{email?:string;onSignedIn:()=>Promise<void>;onError:(message:string)=>void}) {
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false);
 useDialog(open,()=>setOpen(false));
 async function run(action:()=>Promise<void>){setBusy(true);try{await action();}catch(e){onError((e as Error).message);}finally{setBusy(false);}}
 return <><button className="outline account-button" onClick={()=>setOpen(true)}><LogIn size={15}/>{email?'Account':'Sign in'}</button>{open&&<div className="drawer-backdrop" onClick={()=>setOpen(false)}><section className="account-dialog" role="dialog" aria-modal="true" aria-label="Your account" onClick={e=>e.stopPropagation()}><button className="close" aria-label="Close account" onClick={()=>setOpen(false)}><X size={18}/></button><span className="eyebrow">YOUR WORKSPACE / SYNC</span><h2>{email?'Your account':'Keep your next move.'}</h2>{email?<><p>Signed in as {email}. Your workspace is available across devices.</p><button className="outline" disabled={busy} onClick={()=>run(async()=>{await (await authClient()).auth.signOut();await onSignedIn();setOpen(false);})}>Sign out</button></>:<><p>Sign in to sync your roles, resume, drafts, and application history. Guest work is carried into your account.</p><button className="outline full" disabled={busy} onClick={()=>run(async()=>{const {error}=await (await authClient()).auth.signInWithOAuth({provider:'google',options:{redirectTo:window.location.origin+'/'}});if(error)throw error;})}>Continue with Google</button></>}</section></div>}</>;
}
export function AddRole({onAdded,onError}:{onAdded:(job:any)=>void;onError:(text:string)=>void}) {
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[values,setValues]=useState({company:'',role:'',description:'',location:'',salary:'',source_url:'',tags:''});
 useDialog(open,()=>setOpen(false));
 return <><button className="outline" onClick={()=>setOpen(true)}><Plus size={16}/> Add a role</button>{open&&<div className="drawer-backdrop" onClick={()=>setOpen(false)}><section className="account-dialog role-dialog" role="dialog" aria-modal="true" aria-label="Add a role" onClick={e=>e.stopPropagation()}><button className="close" aria-label="Close role form" onClick={()=>setOpen(false)}><X size={18}/></button><span className="eyebrow">REAL ROLES / YOUR SEARCH</span><h2>Add your next opportunity.</h2><p>Paste the description from a real listing. Only your workspace can see it.</p><form onSubmit={async e=>{e.preventDefault();setBusy(true);try{const d=await api('ingest',{method:'POST',body:JSON.stringify({...values,tags:values.tags.split(',').map(x=>x.trim()).filter(Boolean)})});onAdded(d.job);setOpen(false);setValues({company:'',role:'',description:'',location:'',salary:'',source_url:'',tags:''});}catch(error){onError((error as Error).message);}finally{setBusy(false);}}}>{(['company','role','location','salary','source_url','tags'] as const).map(field=><label key={field}>{({company:'Company',role:'Role title',location:'Location (optional)',salary:'Salary (optional)',source_url:'Original HTTPS listing (optional)',tags:'Additional skills, separated by commas (optional)'})[field]}<input type={field==='source_url'?'url':'text'} required={field==='company'||field==='role'} maxLength={field==='source_url'?2000:200} value={values[field]} onChange={e=>setValues({...values,[field]:e.target.value})}/></label>)}<label>Job description<textarea required minLength={20} maxLength={20000} value={values.description} onChange={e=>setValues({...values,description:e.target.value})}/></label><button className="primary full" disabled={busy}>{busy?<LoaderCircle size={16} className="spin"/>:<Plus size={16}/>}Save role</button></form></section></div>}</>;
}
export function Tracker({jobs,applications,onSave,onRemove,busy,onOpenRole,workspaceKey='guest'}:{jobs:Role[];applications:Application[];onSave:(value:Application)=>Promise<unknown>;onRemove:(id:string)=>Promise<unknown>;busy:string;onOpenRole?:(jobId:string)=>void;workspaceKey?:string}) {
 const stages=['saved','applied','interview','offer','closed'];
 const [search,setSearch]=useState(''),[stageFilter,setStageFilter]=useState('all');
 useEffect(()=>{const valid=new Set(applications.map(a=>`${workspaceKey}:${a.job_id}`));for(const key of trackerEdits.keys())if(key.startsWith(workspaceKey+':')&&!valid.has(key))trackerEdits.delete(key);syncUnloadWarning();},[applications,workspaceKey]);
 const visible=applications.filter(a=>{const j=jobs.find(x=>x.id===a.job_id);return(stageFilter==='all'||a.stage===stageFilter)&&`${j?.company||''} ${j?.role||''} ${a.notes}`.toLowerCase().includes(search.toLowerCase());});
 return <div className="panel-stack"><div className="surface-head"><div><span className="eyebrow">APPLICATIONS / YOUR PROGRESS</span><h2>A search with direction.</h2><p>Track the real steps you take. Stage changes never submit an application.</p></div><button className="outline" onClick={()=>downloadText('signal-arc-applications.csv',['Company,Role,Stage,Deadline,Notes',...applications.map(a=>{const j=jobs.find(x=>x.id===a.job_id);return[j?.company,j?.role,a.stage,a.deadline,a.notes].map(csvCell).join(',');})].join('\n'),'text/csv')}><Download size={16}/>Export CSV</button></div><div className="stage-summary">{stages.map(stage=><div key={stage}><strong>{applications.filter(a=>a.stage===stage).length}</strong><span>{stage}</span></div>)}</div>{applications.length>0&&<div className="tracker-filters"><label>Search applications<input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Company, role, or saved notes…"/></label><label>Stage<select value={stageFilter} onChange={e=>setStageFilter(e.target.value)}><option value="all">All stages</option>{stages.map(stage=><option key={stage} value={stage}>{stage}</option>)}</select></label></div>}{visible.length?<div className="tracking-list">{visible.map(a=><TrackingItem key={`${workspaceKey}:${a.job_id}`} bufferKey={`${workspaceKey}:${a.job_id}`} value={a} job={jobs.find(j=>j.id===a.job_id)} onSave={onSave} onRemove={onRemove} onOpenRole={onOpenRole} busy={busy===`application-${a.job_id}`}/>)}</div>:<div className="empty large"><Bookmark size={28}/><p>{applications.length?'No applications match these filters.':'Open a role and choose “Track application” to start your search history.'}</p>{applications.length>0&&<button className="text-button" onClick={()=>{setSearch('');setStageFilter('all');}}>Clear filters</button>}</div>}</div>;
}
function TrackingItem({value,job,onSave,onRemove,busy,onOpenRole,bufferKey}:{value:Application;job?:Role;onSave:(value:Application)=>Promise<unknown>;onRemove:(id:string)=>Promise<unknown>;busy:boolean;onOpenRole?:(id:string)=>void;bufferKey:string}) {
 const [edit,setEdit]=useState<TrackerEdit>(()=>trackerEdits.get(bufferKey)||{stage:value.stage,notes:value.notes,deadline:value.deadline||''});
 const {stage,notes,deadline}=edit;
 const dirty=stage!==value.stage||notes!==value.notes||deadline!==(value.deadline||'');
 useEffect(()=>{if(dirty)trackerEdits.set(bufferKey,edit);else trackerEdits.delete(bufferKey);syncUnloadWarning();},[bufferKey,edit,dirty]);
 const urgency=deadlineLabel(deadline,stage);
 return <article className="tracking-item"><div><span className="eyebrow">{job?.company}</span><h3>{job?.role}</h3>{urgency&&<p className={`deadline-note ${urgency.startsWith('Deadline passed')?'overdue':''}`} role="status">{urgency}</p>}<div className="tracking-role-actions">{onOpenRole&&<button className="text-button" onClick={()=>onOpenRole(value.job_id)}>Open role workspace →</button>}{job?.source_url&&<a href={job.source_url} target="_blank" rel="noreferrer">View original listing ↗</a>}</div></div><div className="tracking-fields"><label>Stage<select value={stage} onChange={e=>setEdit({...edit,stage:e.target.value})}>{['saved','applied','interview','offer','closed'].map(s=><option key={s}>{s}</option>)}</select></label><label>Deadline<input type="date" value={deadline} onChange={e=>setEdit({...edit,deadline:e.target.value})}/></label><label className="tracking-notes">Private notes<textarea maxLength={5000} value={notes} onChange={e=>setEdit({...edit,notes:e.target.value})} placeholder="Next steps, interview notes, contact details…"/></label></div><div className="tracking-actions"><small>{dirty?'Unsaved changes · kept while you navigate':`Saved ${new Date(value.updated_at).toLocaleDateString()}`}</small>{dirty&&<button className="text-button" disabled={busy} onClick={()=>setEdit({stage:value.stage,notes:value.notes,deadline:value.deadline||''})}>Discard edits</button>}<button className="outline" disabled={busy} onClick={()=>{if(dirty&&!window.confirm('Untrack this application and discard your unsaved edits?'))return;onRemove(value.job_id).then(result=>{if(result!==false){trackerEdits.delete(bufferKey);syncUnloadWarning();}});}}>Untrack</button><button className="primary" disabled={busy||!dirty} onClick={()=>onSave({...value,stage,notes,deadline:deadline||null})}>{busy?'Saving…':'Save progress'}</button></div></article>;
}
export async function importResume(file: File) {
 if(file.size>8*1024*1024)throw new Error('Use a resume smaller than 8 MB.');const extension=file.name.split('.').pop()?.toLowerCase();
 if(extension==='txt'||extension==='md')return file.text();
 if(extension==='docx'){const mammoth=await import('mammoth');const result=await mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()});return result.value;}
 if(extension==='pdf'){const pdf=await import('pdfjs-dist');pdf.GlobalWorkerOptions.workerSrc=new URL('pdfjs-dist/build/pdf.worker.min.mjs',import.meta.url).href;const doc=await pdf.getDocument({data:await file.arrayBuffer()}).promise;try{if(doc.numPages>30)throw new Error('Use a resume with at most 30 pages.');const pages=[];for(let i=1;i<=doc.numPages;i++){const text=await(await doc.getPage(i)).getTextContent();pages.push(text.items.map(item=>'str'in item?item.str+('hasEOL'in item&&item.hasEOL?'\n':' '):'').join(''));}const result=pages.join('\n');if(result.trim().length<20)throw new Error('This PDF contains no readable text. Paste the text from your resume instead.');return result;}finally{await doc.destroy();}}
 throw new Error('Choose a PDF, DOCX, TXT, or Markdown file.');
}
