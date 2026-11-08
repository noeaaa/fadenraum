import {openArchive,ownNote} from '../archiv.js';
import {record,rewardPanel,specimens} from './wachstum.js';
import {storage,remaining,finish,valid,validMinutes} from './store.js';
import {formation} from './feld.js';
import {sound} from './klang.js';
const $=id=>document.getElementById(id),pages=['fokus','archiv','fortschritt','einstellungen'];
const field=formation();sound();
const store=await storage().catch(()=>null);
if(!store){$('report').textContent='Local storage is blocked. Allow site storage and reload.';$('start').disabled=true;throw Error('IndexedDB unavailable')}
const bus=typeof BroadcastChannel==='function'?new BroadcastChannel('atmos-focus'):null;
let state,chosenGoal=null,loading=false,confirmAction=null;
const duration=ms=>{const seconds=Math.floor(ms/1000);if(!seconds)return '0 min';if(seconds<60)return seconds+' s';return Math.floor(seconds/60)+' min'};
const clock=ms=>{const sec=Math.ceil(ms/1000);return Math.floor(sec/60).toString().padStart(2,'0')+':'+(sec%60).toString().padStart(2,'0')};
function node(tag,text){const e=document.createElement(tag);e.textContent=text;return e}
function button(text,click){const b=node('button',text);b.type='button';b.onclick=click;return b}
let rewardTimer;
function rewardNotice(count){
 clearTimeout(rewardTimer);$('fokus').dataset.focus='reward';$('fieldState').textContent='✦ '+String(count).padStart(2,'0');
 rewardTimer=setTimeout(()=>{if(!state.active){$('fokus').dataset.focus='idle';$('fieldState').textContent='Focus'}},5200);
}
function notify(text){$('report').textContent=text}
async function update(fn){
 try{const old=state;state=await store(fn);const completed=old?.active&&!state.active&&state.sessions.some(v=>v.id===old.active.id);if(completed)notify('Session saved. A new layer is woven into your field.');
 if(fn)bus?.postMessage('changed');render();if(completed)rewardNotice(state.sessions.length);else if(old?.active&&!state.active)field.cinema(false);return true}catch{notify('Could not save the change. Please check your browser storage.');return false}
}
function confirm(title,text,fn){$('question').textContent=title;$('explain').textContent=text;confirmAction=fn;$('confirm').showModal()}
$('yes').onclick=()=>{const fn=confirmAction;$('confirm').close();fn?.()};$('no').onclick=()=>$('confirm').close();
function highlightNav(){
 const section=pages.filter(id=>$(id).getBoundingClientRect().top<innerHeight*.38).at(-1)||'fokus';
 const view=innerHeight+scrollY>=document.documentElement.scrollHeight-3?'einstellungen':section;
 document.querySelectorAll('nav a').forEach(a=>a.setAttribute('aria-current',a.hash==='#'+view?'page':'false'));
}
window.addEventListener('scroll',highlightNav,{passive:true});highlightNav();
function row(host,title,value){const div=node('div','');div.className='statrow';div.append(node('span',title),node('strong',value));host.append(div)}
function setElapsed(a){
 if(a){
   const left=remaining(a);
   const seconds=(a.duration-left)/1000;
  $('hand').style.transform='rotate('+(seconds*6)+'deg)';
  $('hand').parentElement.style.setProperty('--sweep',(seconds%60)/60*100+'%');
   const value=clock(left);
   if($('heroClock').textContent!==value){$('heroClock').textContent=value;
    if(!state.still&&!matchMedia('(prefers-reduced-motion: reduce)').matches)$('heroClock').animate([{opacity:.72},{opacity:1}],{duration:260});
   }
 }
$('elapsed').style.width=(a?100*(1-remaining(a)/a.duration):0)+'%'}
function renderChart(sessions){
 const root=$('chart');root.replaceChildren();
 const days=Array.from({length:7},(_,i)=>{const day=new Date();day.setHours(0,0,0,0);day.setDate(day.getDate()-6+i);const end=new Date(day);end.setDate(end.getDate()+1);return {day,ms:sessions.filter(s=>s.ended>=day&&s.ended<end).reduce((n,v)=>n+v.ms,0)}});
 const peak=Math.max(60000,...days.map(d=>d.ms));
 for(const {day,ms} of days){const col=node('div','');col.className='day';col.style.setProperty('--height',ms/peak*100+'%');col.append(node('span',duration(ms)),node('i',''),node('small',day.toLocaleDateString('en-GB',{weekday:'short',day:'2-digit'})));root.append(col)}
}
function renderStats(){
 const root=$('stats');root.replaceChildren();const midnight=new Date();midnight.setHours(0,0,0,0);const week=new Date(midnight);week.setDate(week.getDate()-6);
 const sum=list=>list.reduce((n,v)=>n+v.ms,0),sessions=state.sessions;
 renderChart(sessions);
 for(const [name,value] of [['Completed today',duration(sum(sessions.filter(v=>v.ended>=midnight)))],['Last seven days',duration(sum(sessions.filter(v=>v.ended>=week)))],['Completed sessions',sessions.length],['Goals reached',state.projects.reduce((n,p)=>n+p.goals.filter(g=>g.done).length,0)]])row(root,name,value);
 root.append(node('h2','Time by subject'));for(const p of state.projects)row(root,p.name,duration(sum(sessions.filter(v=>v.project===p.id))));
 const earlier=sessions.filter(v=>v.project===null);
 if(earlier.length)row(root,'Deleted projects',duration(sum(earlier)));
 if(sessions.length){root.append(node('h2','Session history'));for(const v of [...sessions].sort((a,b)=>b.ended-a.ended)){const day=new Date(v.ended).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});row(root,day+' · '+(state.projects.find(p=>p.id===v.project)?.name||v.formerProject),duration(v.ms))}}
}
let renameTarget=null;
function renameItem(project,goal=null){
 const item=goal||project;
 renameTarget={projectId:project.id,goalId:goal?.id};
 $('renameHeading').textContent=goal?'Rename goal':'Rename project';
 const input=$('renameName');input.setCustomValidity('');input.maxLength=goal?180:100;input.value=item.name;
 $('renameDialog').showModal();input.select();
}
$('renameCancel').onclick=()=>$('renameDialog').close();
$('renameName').oninput=e=>e.target.setCustomValidity('');
$('renameForm').onsubmit=async e=>{
 e.preventDefault();const input=$('renameName'),name=input.value.trim(),{projectId,goalId}=renameTarget;
 if(!name){input.setCustomValidity('Enter a name.');input.reportValidity();return}
 let issue='';
 const ok=await update(s=>{
  const project=s.projects.find(p=>p.id===projectId),item=goalId?project?.goals.find(g=>g.id===goalId):project;
  if(!item){issue='This item has already been deleted.';return}
  if(!goalId&&s.projects.some(p=>p.id!==projectId&&p.name.toLowerCase()===name.toLowerCase())){issue='A project with this name already exists.';return}
  item.name=name;
 });
 if(issue){input.setCustomValidity(issue);input.reportValidity()}else if(ok)$('renameDialog').close();
};
function deleteItem(project,goal=null){
 const title=goal?'Delete goal?':'Delete project?';
 const explanation=goal?'Remove “'+goal.name+'” from this project?':'Remove “'+project.name+'” and its goals? Your logged sessions and focus time will stay in Progress.';
 confirm(title,explanation,()=>update(s=>{
  const item=s.projects.find(p=>p.id===project.id);if(!item)return;
  if(goal){
   item.goals=item.goals.filter(g=>g.id!==goal.id);
   for(const v of s.sessions)if(v.project===item.id&&v.goal===goal.id)v.goal=null;
   if(s.active?.project===item.id&&s.active.goal===goal.id)s.active.goal=null;
  }else{
   if(s.active?.project===item.id){notify('Finish or reset this session before deleting its project.');return}
   for(const v of s.sessions)if(v.project===item.id){v.formerProject=item.name;v.project=null;v.goal=null}
   s.projects=s.projects.filter(p=>p.id!==item.id);
   if(s.selected===item.id)s.selected=s.projects[0]?.id??null;
  }
 }));
}
function goalRow(project,goal){
 const li=node('li',''),label=node('label',''),box=node('input','');label.className='check';
 box.type='checkbox';box.checked=goal.done;box.onchange=()=>update(s=>{
  const target=s.projects.find(p=>p.id===project.id)?.goals.find(g=>g.id===goal.id);if(target)target.done=box.checked;
 });
 label.append(box,document.createTextNode(' '+goal.name));li.append(label,button('Rename',()=>renameItem(project,goal)),button('Delete',()=>deleteItem(project,goal)));return li;
}
function renderArchive(){
 const host=$('projects');host.replaceChildren();
 for(const p of state.projects){
 const area=node('article','');area.className='project';
 const head=node('div','');head.className='projectHead';const erase=button('Delete',()=>deleteItem(p));
 if(state.active?.project===p.id){erase.disabled=true;erase.title='Finish or reset the active session first.'}
 head.append(node('h2',p.name),button('Rename',()=>renameItem(p)),erase);area.append(head);
 const done=p.goals.filter(g=>g.done);area.append(node('small',done.length+' / '+p.goals.length+' goals reached'));
 const ul=node('ul','');ul.append(...p.goals.filter(g=>!g.done).map(g=>goalRow(p,g)));area.append(ul);
 if(done.length){const details=node('details',''),list=node('ul','');list.append(...done.map(g=>goalRow(p,g)));details.append(node('summary','Completed ('+done.length+')'),list);area.append(details)}
 const sessions=state.sessions.filter(v=>v.project===p.id);area.append(node('p',sessions.length+' sessions · '+duration(sessions.reduce((sum,v)=>sum+v.ms,0))));
 const f=node('form',''),label=node('label','Learning goal'),input=node('input','');input.required=true;input.maxLength=180;input.placeholder='What would you like to understand?';label.append(input);const save=node('button','Add goal');f.append(label,save);f.onsubmit=e=>{e.preventDefault();const name=input.value.trim();if(name)update(s=>{s.projects.find(q=>q.id===p.id).goals.push({id:crypto.randomUUID(),name,done:false})})};area.append(f);
 if(!state.active)area.append(button('Focus here →',async()=>{await update(s=>{if(!s.active)s.selected=p.id});location.hash='fokus';$('fokus').scrollIntoView()}));host.append(area)
 }}
let ownCount=0,previewKey=null,days=0;
let filmActive=false,playing=false,elapsed=0,started=0,animation=0;
const filmDuration=45000;
let displayedMarks=null;
const rewards=rewardPanel(key=>{closeFilm(false);days=0;$('days').value=0;previewKey=key;renderWorld()});
const drawSamples=specimens();
function renderWorld(){
 if(!state)return;
 const data=record(state,ownCount),shown={...data};
 if(days){
   shown.days+=days;shown.sessions+=days;shown.notes+=Math.floor(days/2);shown.goals+=Math.floor(days/3);
   const dayNumber=d=>Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())/86400000;
   const studied=new Set(state.sessions.map(v=>dayNumber(new Date(v.ended))));
   let tail=0;while(studied.has(dayNumber(new Date())-tail))tail++;
   shown.streak=Math.max(data.streak,tail+days);
 }else if(previewKey)shown[previewKey]++;
 $('horizon').textContent=days?'In '+days+(days===1?' day':' days'):'Today';
 $('proofTitle').textContent=days?'Day '+days:previewKey?'Next trace':'Today';
 $('forecastSummary').textContent=days?'Preview · +'+days+(days===1?' session, +':' sessions, +')+Math.floor(days/2)+' notes, +'+Math.floor(days/3)+' goals.':'The preview starts from your saved progress.';
 document.querySelectorAll('[data-days]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.days===days)));
 displayedMarks=shown;rewards(data);drawSamples(shown);
 field(state,state.projects.find(p=>p.id===(state.active?.project||state.selected)),shown);
}
function paintFilm(){
 if(!playing)return;
 const time=Math.min(filmDuration,elapsed+performance.now()-started);
 const position=time/filmDuration*30,day=Math.floor(position);
 if(day!==days){days=day;$('days').value=day;renderWorld()}
 $('filmDay').textContent='Preview · day '+day+' / 30';
 if(displayedMarks)field(state,null,{...displayedMarks,sessions:displayedMarks.sessions+position-day});
 if(time>=filmDuration){playing=false;elapsed=filmDuration;$('filmToggle').textContent='↻';$('filmToggle').title='Replay preview';$('filmToggle').setAttribute('aria-label','Replay preview');return}
 animation=requestAnimationFrame(paintFilm);
}
function playFilm(){
 if(elapsed>=filmDuration){elapsed=0;days=0;$('days').value=0;renderWorld()}
 playing=true;started=performance.now();$('filmToggle').textContent='Ⅱ';$('filmToggle').title='Pause preview';$('filmToggle').setAttribute('aria-label','Pause preview');paintFilm();
}
function pauseFilm(){
 if(!playing)return;elapsed=Math.min(filmDuration,elapsed+performance.now()-started);playing=false;cancelAnimationFrame(animation);$('filmToggle').textContent='▷';$('filmToggle').title='Resume preview';$('filmToggle').setAttribute('aria-label','Resume preview');
}
function closeFilm(reset=true){
 if(!filmActive)return;pauseFilm();filmActive=false;elapsed=0;$('filmControls').hidden=true;
 if(reset){days=0;$('days').value=0;renderWorld()}
}
$('filmPlay').onclick=()=>{
 closeFilm(false);
 if(previewKey)document.querySelector('#imprints [aria-pressed=true]')?.click();
 days=0;$('days').value=0;elapsed=0;filmActive=true;renderWorld();$('filmControls').hidden=false;
 $('fokus').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
 $('filmToggle').focus({preventScroll:true});playFilm();
};
$('filmToggle').onclick=()=>playing?pauseFilm():playFilm();
$('filmExit').onclick=()=>{closeFilm();$('filmPlay').focus()};
document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseFilm()});
function forecast(value){
   closeFilm(false);
   if(previewKey)document.querySelector('#imprints [aria-pressed=true]')?.click();
   days=value;$('days').value=value;renderWorld();
}
$('days').oninput=e=>forecast(+e.target.value);
document.querySelectorAll('[data-days]').forEach(b=>b.onclick=()=>forecast(+b.dataset.days));
const noteStore=await openArchive().catch(()=>null);
async function refreshNotes(){if(!noteStore)return;ownCount=(await noteStore.list()).filter(ownNote).length;renderWorld()}
const noteBus=typeof BroadcastChannel==='function'?new BroadcastChannel('fadennetz'):null;
if(noteBus)noteBus.onmessage=refreshNotes;
window.addEventListener('pageshow',refreshNotes);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshNotes()});
await refreshNotes();
function render(){
 const a=state.active,p=state.projects.find(p=>p.id===(a?.project||state.selected));const goal=a?.goal||chosenGoal;
 $('project').replaceChildren(...state.projects.map(v=>new Option(v.name,v.id)));if(p)$('project').value=p.id;else $('project').add(new Option('Add a project in Archive',''));$('start').disabled=!p;
 const goals=(p?.goals||[]).filter(g=>!g.done||g.id===a?.goal);$('goal').replaceChildren(new Option('Open session',''),...goals.map(g=>new Option(g.name,g.id)));$('goal').value=goals.some(g=>g.id===goal)?goal:'';$('goalLabel').hidden=!goals.length;
 $('fokus').classList.toggle('running',!!a);$('phase').textContent=a?(a.end===null?'Paused':'Focus'):'Focus';$('time').textContent=clock(a?remaining(a):state.minutes*60000);
 const focus=a?(a.end===null?'paused':'active'):'idle';
 $('fokus').dataset.focus=focus;$('identity').hidden=!!a;$('heroClock').hidden=!a;
 $('heroClock').textContent=$('time').textContent;
 $('fieldState').textContent=focus==='active'?'Focus':focus==='paused'?'Paused':'Focus';
 $('objectCaption').textContent=a?p.name:'An orbital field study';$('start').hidden=!!a;for(const id of ['pause','end','abort'])$(id).hidden=!a; $('pause').textContent=a?.end===null?'▶':'Ⅱ';$('pause').title=a?.end===null?'Resume focus':'Pause focus';$('pause').setAttribute('aria-label',$('pause').title);
 document.querySelectorAll('[data-min]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.min===state.minutes)));$('customMinutes').value=state.minutes;$('quiet').checked=state.still;renderWorld();setElapsed(a);renderArchive();renderStats()
}
$('project').onchange=e=>{const id=e.target.value;chosenGoal=null;update(s=>{if(!s.active)s.selected=id})};$('goal').onchange=e=>chosenGoal=e.target.value||null;
document.querySelectorAll('[data-min]').forEach(b=>b.onclick=()=>update(s=>{if(!s.active)s.minutes=+b.dataset.min}));
$('customMinutes').oninput=e=>{if(validMinutes(e.target.valueAsNumber)&&!state.active)$('time').textContent=clock(e.target.valueAsNumber*60000)};
$('customMinutes').onchange=e=>{const value=e.target.valueAsNumber;if(validMinutes(value))update(s=>{if(!s.active)s.minutes=value});else e.target.reportValidity()};
$('start').onclick=()=>{const mins=$('customMinutes').valueAsNumber;if(!validMinutes(mins)){$('customMinutes').reportValidity();return}const project=$('project').value,goal=$('goal').value||null;forecast(0);notify('');$('fokus').scrollIntoView({behavior:'instant'});field.cinema(true,true);update(s=>{if(s.active||!s.projects.some(p=>p.id===project))return;s.minutes=mins;const total=mins*60000;s.active={id:crypto.randomUUID(),project,goal,duration:total,left:total,end:Date.now()+total}}).then(ok=>{if(!ok)field.cinema(false)})};
function changeActive(fn){const id=state.active?.id;return update(s=>{if(s.active&&s.active.id===id)fn(s,s.active)})}
$('pause').onclick=()=>changeActive((s,a)=>{if(a.end===null)a.end=Date.now()+a.left;else{a.left=remaining(a);a.end=null}});
function resolveActive(cancel){const id=state.active?.id;confirm(cancel?'Discard this session?':'Finish this session?',cancel?'The current session will be discarded.':'Time spent focusing will be added to this project.',()=>update(s=>{if(!s.active||s.active.id!==id)return;if(cancel)s.active=null;else finish(s,Date.now())}))}
$('abort').onclick=()=>resolveActive(true);$('end').onclick=()=>resolveActive(false);
$('addProject').onsubmit=async e=>{e.preventDefault();const input=e.currentTarget.elements.name,name=input.value.trim();if(!name)return;const ok=await update(s=>{const found=s.projects.find(p=>p.name.toLocaleLowerCase()===name.toLocaleLowerCase());const p=found||{id:crypto.randomUUID(),name,goals:[]};if(!found)s.projects.push(p);if(!s.active)s.selected=p.id});if(ok)input.value=''};
$('quiet').onchange=e=>{const value=e.target.checked;update(s=>s.still=value)};
$('backup').onclick=async()=>{const current=await store();const url=URL.createObjectURL(new Blob([JSON.stringify(current,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='Fadenraum-Atmos.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000)};
$('restore').onchange=async e=>{try{const data=JSON.parse(await e.target.files[0].text());if(!valid(data))throw Error();confirm('Restore backup?','This backup will replace your current Atmos projects and sessions.',async()=>{if(await update(s=>Object.assign(s,data)))$('importMsg').textContent='Backup restored.'})}catch{$('importMsg').textContent='This file is not a valid Atmos backup.'}e.target.value=''};
async function tick(){const a=state?.active;if(!a||loading)return;setElapsed(a);$('time').textContent=clock(remaining(a));$('heroClock').textContent=$('time').textContent;if(a.end!==null&&remaining(a)===0){loading=true;try{await update();bus?.postMessage('changed')}finally{loading=false}}}
const contrast=$('contrast');
function applyContrast(){document.querySelector('.art').style.setProperty('--contrast',contrast.value+'%')}
try{contrast.value=localStorage.getItem('atmos-contrast')||100}catch{}
applyContrast();contrast.oninput=()=>{applyContrast();try{localStorage.setItem('atmos-contrast',contrast.value)}catch{}};
await update();if(pages.includes(location.hash.slice(1)))$(location.hash.slice(1)).scrollIntoView();highlightNav();setInterval(tick,300);if(bus)bus.onmessage=()=>update();document.addEventListener('visibilitychange',()=>{if(!document.hidden)update()});window.addEventListener('pageshow',()=>update());
