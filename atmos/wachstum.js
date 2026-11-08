import {sectionPoint} from './membran.js';
const tau=2*Math.PI,golden=Math.PI*(3-Math.sqrt(5));
export const keys=['sessions','goals','notes','streak'];
const names=['◉ Sessions','◎ Goals','✳ Notes','↗ Streak'];
const effects=['Each completed session traces another orbit.','Each goal opens an inner loop at the junction.','Each note adds a fine branch to the field.','Your longest study streak leaves a lasting arc.'];
export function record(s,notes){
 const days=new Set(s.sessions.map(v=>{const d=new Date(v.ended);return Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())/86400000}));
 let best=0,run=0,prev=-2;for(const d of [...days].sort((a,b)=>a-b)){run=d===prev+1?run+1:1;best=Math.max(best,run);prev=d}
 return {days:days.size,sessions:s.sessions.length,goals:s.projects.reduce((t,p)=>t+p.goals.filter(g=>g.done).length,0),notes,streak:best};
}
function fibonacci(n){
 let previous=1,next=2,layers=n>0?1:0;
 while(next<=n){[previous,next]=[next,previous+next];layers++}
 return {layers,next:n===0?1:next};
}
const curve=(n,f)=>Array.from({length:n+1},(_,i)=>f(i/n));
function stroke(ctx,points,alpha,width){ctx.beginPath();for(const [i,[x,y]] of points.entries()){if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y)}ctx.lineWidth=width;ctx.strokeStyle='rgba(20,20,20,'+alpha+')';ctx.stroke()}
function sample(canvas,kind,count,bias){
 const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;
 const d=Math.min(2,devicePixelRatio);canvas.width=w*d;canvas.height=h*d;const c=canvas.getContext('2d');c.scale(d,d);
 const growth=Math.log1p(count),n=22+Math.min(18,Math.floor(growth*3)),sweep=.17*bias+.035*growth;
 const project=(t,v)=>{
   const [x,y,z]=sectionPoint(kind,t,v),u=(x-.32)*Math.cos(sweep)+z*Math.sin(sweep);
   return [u,y+.24*z*Math.cos(sweep)];
 };
 const grid=[];let xmin=Infinity,xmax=-Infinity,ymin=Infinity,ymax=-Infinity;
 for(let j=0;j<n;j++){
   const row=curve(96,t=>project(t,2*j/(n-1)-1));grid.push(row);
   for(const [x,y] of row){xmin=Math.min(xmin,x);xmax=Math.max(xmax,x);ymin=Math.min(ymin,y);ymax=Math.max(ymax,y)}
 }
 const sx=w*.83/Math.max(.1,xmax-xmin),sy=h*.77/Math.max(.1,ymax-ymin);
 const center=(p)=>[w*.5+(p[0]-(xmin+xmax)*.5)*sx,h*.5-(p[1]-(ymin+ymax)*.5)*sy];
 grid.forEach((r,i)=>stroke(c,r.map(center),i===0||i===n-1?.67:.17,.63));
 for(let j=0;j<Math.min(20,2+count);j++)stroke(c,curve(32,v=>center(project((.19+j*.382)%1,v*2-1))),.26,.5);

}
export function specimens(){
 const all=[...document.querySelectorAll('[data-study]')];let counts={};
 for(const c of all){let bias=0;const draw=()=>sample(c,c.dataset.study,counts[c.dataset.study]||0,bias);
 new ResizeObserver(draw).observe(c);const parent=c.parentElement;
 parent.addEventListener('pointermove',e=>{bias=(e.clientX-c.getBoundingClientRect().left)/c.clientWidth*2;draw()});parent.addEventListener('pointerleave',()=>{bias=0;draw()});
 }
 return m=>{counts=m;all.forEach(c=>sample(c,c.dataset.study,m[c.dataset.study],0))};
}
export function rewardPanel(preview){
 const root=document.querySelector('#imprints'),hint=document.querySelector('#imprintHint');
 let selected=null,last={};
 keys.forEach((key,i)=>{const b=document.createElement('button');b.innerHTML='<canvas data-study="'+key+'" aria-hidden="true"></canvas><span>'+names[i]+'</span><output></output>';b.type='button';b.onclick=()=>{selected=selected===key?null:key;display();preview(selected)};root.append(b)});
 function display(){
  [...root.children].forEach((b,i)=>{b.setAttribute('aria-pressed',String(selected===keys[i]));b.querySelector('output').textContent=last[keys[i]]??0});
  hint.textContent=selected?'Preview +1 · '+effects[keys.indexOf(selected)]:'Next layer at '+fibonacci(last.sessions||0).next+' '+(fibonacci(last.sessions||0).next===1?'session.':'sessions.')+' Select a trace to preview it.';
 }
 return data=>{last=data;display()};
}
