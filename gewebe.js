const tau=2*Math.PI, {sin,cos}=Math;
function surface(u,v){
 const a=u*tau, pleat=cos(6*a+.8*v);
 const r=.89+.10*v+.075*pleat+.052*cos(3*a+.5)+.045*cos(16*a)*v**5;
 return [r*cos(a),1.16*(v-.5)+.14*sin(2*a+.35)+.07*pleat+.048*cos(20*a)*(v**6+(1-v)**6),r*sin(a)];
}
export function loom(canvas,onOpen){
 const pen=canvas.getContext('2d'),tip=document.getElementById('tip');
 let yaw=.47,pitch=.47,zoom=0,paths=[],buds=[],links=[],targets=[],active=-1,drag=null,w=0,h=0,visible=true;
 let moving=!matchMedia('(prefers-reduced-motion: reduce)').matches;
 function line(group,count,fn,width,ink){
   const points=[];for(let i=0;i<=count;i++)points.push(surface(...fn(i/count)));
   group.push({points,width,ink,mid:points[Math.floor(count/2)]});
 }
 function rebuild(notes,edges){
   paths=[];buds=[];links=[];active=-1;tip.hidden=true;
   // Two strands share the vertical sides of each hexagonal opening.
   for(let col=0;col<72;col++)for(let row=0;row<10;row++){
     const u=col/72,v=row/10;
     if(v>.99)continue;
     for(const side of [-1,1])line(paths,6,t=>[u+side*Math.min(t*3,(1-t)*3,1)/144,Math.min(1,v+.1*t)],.62,'mesh');
   }
   for(const v of [.01,.028,.047,.94,.958,.978,.996])
     for(let k=0;k<32;k++)line(paths,14,t=>[(k+t)/32,v+.006*sin((k+t)*tau*2)],1.25,'cord');
   for(let k=0;k<96;k++)line(paths,10,t=>[(k+t)/96,.941-.055*sin(Math.PI*t)],.95,'cord');
   for(let k=0;k<18;k++){
     const u=k/18;
     line(paths,32,t=>[u+t/18,.48+.18*sin((k+t)*Math.PI/1.5)],1.9,'cord');
     for(const s of [-1,1])for(let j=0;j<5;j++)line(paths,16,t=>[u+.026*t+s*.0045*sin(Math.PI*t)*(j/4),.48+.18*sin(k*Math.PI/1.5)+s*.14*t+.038*sin(Math.PI*t)],.9,'cord');
   }
   for(let k=0;k<20;k++){
     const u=k/20,v=.74+.048*sin(k*1.7),sgn=k%2?1:-1;
     for(let side of [-1,1]){
       line(paths,20,t=>[u+.034*t,v+sgn*.16*t+side*.035*sin(Math.PI*t)],1.25,'cord');
       for(let j=1;j<8;j++){const start=j/10;
         line(paths,5,t=>[u+.034*(start+.12*t),v+sgn*.16*(start+.12*t)+side*.035*sin(Math.PI*(start+.12))*t],.85,'cord');
       }
     }
   }
   const rows=Math.max(2,Math.ceil(Math.sqrt(notes.length/3))), cols=Math.ceil(notes.length/rows);
   notes.forEach((note,i)=>{
     const row=Math.floor(i/cols),u=(i%cols+.29+row*.51)/cols,v=(row+.55)/rows;
     const size=Math.min(1,4/cols,2/rows);
     const bud={id:note.id,title:note.title,u,v,p:surface(u,v),petals:[]};
     for(let ring=0;ring<(notes.length>70?1:3);ring++){
       const petals=4+2*ring;
       for(let j=0;j<petals;j++)for(let stitch=0;stitch<(notes.length>40?1:3);stitch++){
         const a=tau*(j+.25*ring)/petals;
         line(bud.petals,17,t=>{
           const angle=a+(t-.5)*tau/petals*1.32,rad=(.028+ring*.032+stitch*.004+.039*sin(Math.PI*t)**.8)*size;
           return [u+cos(angle)*rad*.236,v+sin(angle)*rad*1.35];
         },1.4,'petal');
       }
     }
     buds.push(bud);
   });
   for(const [i,j] of edges){
     const a=buds[i],b=buds[j];if(!a||!b)continue;
     let du=b.u-a.u;du-=Math.round(du);
     const edge=[];line(edge,40,t=>[a.u+du*t,a.v+(b.v-a.v)*t+.035*sin(Math.PI*t)],1.1,'edge');
     links.push({a:i,b:j,line:edge[0]});
   }
   draw();
 }
 function draw(){
   if(!w)return;pen.clearRect(0,0,w,h);
   const scale=Math.min(w*.38,h*.41)*(1+.60*zoom), ca=cos(yaw),sa=sin(yaw),cp=cos(pitch),sp=sin(pitch);
   function project(p){
     const [x,y,z]=p, side=x*ca-z*sa,front=x*sa+z*ca, up=y*cp-front*sp;
     return [w*.5+scale*(side*.989-up*.148),h*.51-scale*(up*.989+side*.148),front*cp+y*sp];
   }
   function trace(line,bold=false){
     const depth=project(line.mid)[2],back=depth<0;
     pen.strokeStyle=bold?'#151515':line.ink==='mesh'?(back?'#c8c8c8':'#a2a2a2'):line.ink==='edge'?(back?'#b6b6b6':'#797979'):(back?'#aaa':'#393939');
     pen.lineWidth=line.width*Math.max(.68,scale/220)*(bold?1.3:1);
     pen.beginPath();line.points.forEach((p,i)=>{const q=project(p);if(i)pen.lineTo(q[0],q[1]);else pen.moveTo(q[0],q[1])});pen.stroke();
   }
   // Render rear threads first so the front embroidery stays legible through the openwork.
   const sorted=paths.concat(buds.flatMap(b=>b.petals)).sort((a,b)=>project(a.mid)[2]-project(b.mid)[2]);
   for(const path of sorted)trace(path);
   for(const e of links)trace(e.line,e.a===active||e.b===active);
   targets=buds.map(b=>project(b.p));
   targets.forEach(([x,y,z],i)=>{pen.beginPath();pen.arc(x,y,i===active?5:2.6,0,tau);pen.fillStyle=z>=0?'#222':'#777';pen.fill()});
   if(active>=0&&targets[active]){const [x,y]=targets[active];tip.textContent=buds[active].title;tip.hidden=false;tip.style.left=Math.max(1,Math.min(w-tip.offsetWidth,x+10))+'px';tip.style.top=Math.max(0,Math.min(h-tip.offsetHeight,y-20))+'px'}
 }
 function hit(e){const rect=canvas.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top;
   let best=-1,distance=29;targets.forEach(([px,py,z],i)=>{const d=Math.hypot(px-x,py-y)+(z<0?4:0);if(d<distance){distance=d;best=i}});return best;
 }
 function hover(i){active=i;tip.hidden=i<0;canvas.style.cursor=i<0?'grab':'pointer';draw()}
 canvas.onpointerdown=e=>{if(!e.isPrimary)return;drag={x:e.clientX,y:e.clientY,ox:yaw,oy:pitch,moved:false};canvas.setPointerCapture(e.pointerId)};
 canvas.onpointermove=e=>{
  if(!drag){hover(hit(e));return}const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>4)drag.moved=true;
  if(drag.moved){yaw=drag.ox-dx*.009;pitch=Math.max(-1.3,Math.min(1.3,drag.oy+dy*.009));hover(-1)}
 };
 canvas.onpointerup=e=>{if(!drag)return;const i=hit(e),click=!drag.moved;drag=null;if(click&&i>=0){hover(-1);onOpen(buds[i].id)}};
 canvas.onlostpointercapture=()=>drag=null;canvas.onpointerleave=()=>{if(!drag)hover(-1)};
 canvas.onkeydown=e=>{if(!e.key.startsWith('Arrow'))return;e.preventDefault();yaw+=({ArrowLeft:-.1,ArrowRight:.1}[e.key]||0);pitch=Math.max(-1.3,Math.min(1.3,pitch+({ArrowUp:.1,ArrowDown:-.1}[e.key]||0)));draw()};
 new ResizeObserver(()=>{w=canvas.clientWidth;h=canvas.clientHeight;const d=Math.min(2,devicePixelRatio);canvas.width=w*d;canvas.height=h*d;pen.setTransform(d,0,0,d,0,0);draw()}).observe(canvas);
 new IntersectionObserver(([e])=>visible=e.isIntersecting).observe(canvas);
 let last=0;function frame(t){if(visible&&moving&&!drag&&active<0&&!document.querySelector('dialog[open]')&&t-last>=45){yaw+=Math.min(60,t-last)*.00004;draw();last=t}requestAnimationFrame(frame)}requestAnimationFrame(frame);
 const motion=document.getElementById('motion');function label(){motion.textContent=moving?'Ⅱ Pause':'▷ Rotate'}label();motion.onclick=()=>{moving=!moving;label()};
 document.getElementById('zoom').oninput=e=>{zoom=e.target.value/100;draw()};return rebuild;
}
