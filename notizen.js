import {loom} from './gewebe.js';
import {openArchive,titleOf,target,pattern,safePath,normalize} from './archiv.js';
const el=id=>document.getElementById(id),panel=el('panel'),exchange=el('exchange');
const rebuild=loom(el('art'),read);
let db,notes=[],selected=null,editing=null,edges=[];
const channel=typeof BroadcastChannel==='function'?new BroadcastChannel('fadennetz'):null;
function btn(text,fn){const b=document.createElement('button');b.type='button';b.textContent=text;b.onclick=fn;return b}
function splitLinks(note){return [...note.body.matchAll(pattern)].map(m=>target(m[1],notes,note)).filter(Boolean)}
async function refresh(){notes=await db.list();const indices=new Map(notes.map((n,i)=>[n.id,i]));const pairs=new Set();edges=[];
 notes.forEach((n,i)=>{for(const dest of splitLinks(n)){const j=indices.get(dest.id),key=[Math.min(i,j),Math.max(i,j)].join(':');if(i!==j&&!pairs.has(key)){edges.push([i,j]);pairs.add(key)}}});
 rebuild(notes,edges);list();el('count').textContent=notes.length+' notes · '+edges.length+' links';
}
async function commit(put,remove){await db.save(put,remove);await refresh();channel?.postMessage('update')}
function list(){
 const query=normalize(el('search').value.trim()),display=notes.filter(n=>normalize(n.path+' '+n.body).includes(query));const root=el('list');root.replaceChildren();
 for(const n of display){const b=btn('',()=>read(n.id));b.className='entry';const label=document.createElement('strong'),count=document.createElement('span');label.textContent=n.path.includes('/')?n.path.replace(/\.(md|markdown)$/i,''):n.title;const i=notes.indexOf(n);count.textContent=edges.filter(pair=>pair.includes(i)).length+' ↗';b.append(label,count);root.append(b)}
 if(!display.length)root.textContent=query?'No matching notes.':'Create your first note.';
}
el('search').oninput=list;
function openPanel(){if(!panel.open)panel.showModal()}
function read(id){
 const n=notes.find(n=>n.id===id);if(!n)return;
 selected=id;editing=null;el('reader').hidden=false;el('editor').hidden=true;el('mode').textContent='Note';el('readtitle').textContent=n.title;
 const body=el('readbody');body.replaceChildren();let at=0;
 for(const m of n.body.matchAll(pattern)){body.append(n.body.slice(at,m.index));const dest=target(m[1],notes,n);const label=m[1].split('|')[1]||m[1].split('|')[0];if(dest)body.append(btn(label,()=>read(dest.id)));else body.append(m[0]);at=m.index+m[0].length}body.append(n.body.slice(at));
 const incoming=notes.filter(other=>other.id!==id&&splitLinks(other).some(d=>d.id===id));const back=el('backlinks');back.replaceChildren();back.hidden=!incoming.length;
 if(incoming.length){const h=document.createElement('h3');h.textContent='Links to this thought';back.append(h,...incoming.map(n=>btn(n.title,()=>read(n.id))))}
 openPanel();panel.scrollTop=0;
}
function edit(n){editing=n?{...n}:null;selected=n?.id||null;el('editmsg').textContent='';el('mode').textContent=n?'Edit note':'New note';el('reader').hidden=true;el('editor').hidden=false;el('title').value=n?.title||'';el('body').value=n?.body||'';const select=el('linkselect');select.length=1;
 for(const other of notes.filter(x=>x.id!==n?.id))select.add(new Option(other.path.replace(/\.(md|markdown)$/i,''),other.path.replace(/\.(md|markdown)$/i,'')));
 openPanel();el('title').focus()}
el('linkselect').onchange=e=>{const t=el('body'),v=e.target.value;if(v)t.setRangeText('[['+v+']]',t.selectionStart,t.selectionEnd,'end');e.target.value='';t.focus()};
el('new').onclick=()=>edit(null);el('edit').onclick=()=>edit(notes.find(n=>n.id===selected));el('cancel').onclick=()=>selected?read(selected):panel.close();
el('editor').onsubmit=async e=>{e.preventDefault();const title=el('title').value.trim(),body=el('body').value;
 if(!title||/[\\/|#\[\]:*?"<>]/.test(title)||title==='.'||title==='..'){el('editmsg').textContent='Choose a title without path or link characters.';return}
 const original=editing;const current=original&&notes.find(n=>n.id===original.id);
 if(original&&(!current||current.body!==original.body||current.path!==original.path)){el('editmsg').textContent='This note changed in another tab. Copy your text and open the latest version.';return}
 const path=(original?.path.split('/').slice(0,-1)||[]).concat(title+'.md').join('/');
 if(notes.some(n=>n.id!==original?.id&&normalize(n.path)===normalize(path))){el('editmsg').textContent='A note with this title already exists in this folder.';return}
 const n={id:original?.id||crypto.randomUUID(),title,path,body,origin:original?.origin||'own'};const changed=[n];
 if(original&&title!==original.title){for(const other of notes){const content=other.id===n.id?n.body:other.body;const updated=content.replace(pattern,(all,raw)=>{if(target(raw,notes,other)?.id!==n.id)return all;const suffix=raw.search(/[#|]/);return '[['+path.slice(0,-3)+(suffix<0?'':raw.slice(suffix))+']]'});if(updated!==content){if(other.id===n.id)n.body=updated;else changed.push({...other,body:updated})}}}
 try{await commit(changed);if(panel.open)read(n.id)}catch{el('editmsg').textContent='Save failed. Your text is still in the editor.'}
};
function download(file,blob){const a=document.createElement('a'),u=URL.createObjectURL(blob);a.href=u;a.download=file;a.click();setTimeout(()=>URL.revokeObjectURL(u),3000)}
el('download').onclick=()=>{const n=notes.find(n=>n.id===selected);download(n.path.split('/').at(-1),new Blob([n.body],{type:'text/markdown;charset=utf-8'}))};
el('transfer').onclick=()=>{el('importmsg').textContent='';exchange.showModal()};
document.querySelectorAll('.close').forEach(b=>b.onclick=()=>b.closest('dialog').close());
el('export').onclick=()=>{const files=Object.create(null);for(const n of notes)files[n.path]=fflate.strToU8(n.body);download('Fadennetz.zip',new Blob([fflate.zipSync(files)],{type:'application/zip'}))};
el('files').onchange=async e=>{
 const result=el('importmsg');const seen=new Set(notes.map(n=>normalize(n.path)));let skipped=0;const add=[];
 function accept(path,body){path=safePath(path);if(!/\.(md|markdown)$/i.test(path)||path.split('/').some(s=>s.startsWith('.')||s==='__MACOSX'))return;
 if(seen.has(normalize(path))){skipped++;return}seen.add(normalize(path));add.push({id:crypto.randomUUID(),path,title:titleOf(path),body})}
 try{for(const f of e.target.files){if(/\.zip$/i.test(f.name)){const content=fflate.unzipSync(new Uint8Array(await f.arrayBuffer()),{filter:e=>/\.(md|markdown)$/i.test(e.name)});for(const [path,bytes] of Object.entries(content))accept(path,fflate.strFromU8(bytes))}else accept(f.name,await f.text())}
 await commit(add);result.textContent=add.length+' imported. '+skipped+' existing files skipped.'}catch{result.textContent='Import failed. Check the Markdown files or ZIP.'}e.target.value='';
};
try{db=await openArchive();await refresh();if(channel)channel.onmessage=async()=>{await refresh();if(panel.open&&!el('reader').hidden&&selected)read(selected)}}catch{el('list').textContent='Local storage is blocked. Open the page in a browser with site storage enabled.';el('new').disabled=el('transfer').disabled=true;}
