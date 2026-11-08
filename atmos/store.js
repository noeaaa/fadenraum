export const validMinutes=m=>Number.isInteger(m)&&m>=1&&m<=240;
export const remaining=(a,now=Date.now())=>Math.max(0,Math.min(a.duration,a.end===null?a.left:a.end-now));
export function finish(s,now,automatic=false){
 const a=s.active;if(!a)return;
 const ended=automatic?a.end:now;
 s.sessions.push({id:a.id,project:a.project,goal:a.goal,ended,ms:a.duration-remaining(a,now)});
 s.active=null;
}
const fresh=()=>({version:1,projects:[{id:'systems',name:'Systems Engineering',goals:[]}],sessions:[],active:null,selected:'systems',minutes:25,still:matchMedia('(prefers-reduced-motion: reduce)').matches});
export function valid(s){
 const num=n=>Number.isSafeInteger(n)&&n>=0, text=v=>typeof v==='string', unique=a=>new Set(a).size===a.length;
 if(!s||s.version!==1||!Array.isArray(s.projects)||!Array.isArray(s.sessions)||!validMinutes(s.minutes)||typeof s.still!=='boolean')return false;
 if(!s.projects.every(p=>p&&text(p.id)&&text(p.name)&&p.name.trim()&&Array.isArray(p.goals)&&p.goals.every(g=>g&&text(g.id)&&text(g.name)&&typeof g.done==='boolean')&&unique(p.goals.map(g=>g.id)))||!unique(s.projects.map(p=>p.id)))return false;
 const has=(id,goal)=>s.projects.some(p=>p.id===id&&(goal===null||p.goals.some(g=>g.id===goal)));
 const selected=s.projects.length?has(s.selected,null):s.selected===null;
 const historyProject=v=>has(v.project,v.goal)||(v.project===null&&v.goal===null&&text(v.formerProject));
 if(!selected||!s.sessions.every(v=>v&&text(v.id)&&historyProject(v)&&num(v.ms)&&v.ms<=240*60000&&num(v.ended)&&v.ended<8640000000000000)||!unique(s.sessions.map(v=>v.id)))return false;
 const a=s.active;return a===null||!!(a&&text(a.id)&&!s.sessions.some(v=>v.id===a.id)&&has(a.project,a.goal)&&validMinutes(a.duration/60000)&&num(a.left)&&a.left<=a.duration&&(a.end===null||num(a.end)&&a.end<=Date.now()+a.duration+10000));
}
export async function storage(){
 const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('fadenraum-atmos',1);r.onupgradeneeded=()=>r.result.createObjectStore('archive').put(fresh(),'state');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
 return fn=>new Promise((resolve,reject)=>{
   const tx=db.transaction('archive','readwrite'),store=tx.objectStore('archive'),r=store.get('state');let state,err;
   r.onsuccess=()=>{try{state=r.result;const due=state.active?.end!=null&&state.active.end<=Date.now();if(due)finish(state,Date.now(),true);
     if(fn)fn(state);if(fn||due)store.put(state,'state');
   }catch(e){err=e;tx.abort()}};
   tx.oncomplete=()=>resolve(state);tx.onabort=()=>reject(err||tx.error);tx.onerror=()=>reject(tx.error);
 });
}
