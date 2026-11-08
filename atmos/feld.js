import {membrane} from './membran.js';
// Periodic cubic space curves. The overview is an orthographic projection onto XY.
const TAU=2*Math.PI, GOLD=Math.PI*(3-Math.sqrt(5));
const lobes=[
 [[.34,.02,.04],[.64,.46,-.08],[.50,.78,-.12],[.12,.87,-.09],[-.28,.72,.03],[-.49,.38,.24],[-.45,-.04,.31],[-.17,-.35,.22],[.19,-.48,.06],[.40,-.40,-.04]],
 [[.32,.015,.04],[-.08,.12,.15],[-.66,.17,.05],[-1.01,.12,-.11],[-1.05,.04,-.21],[-.76,-.015,-.18],[-.30,.05,-.08],[.02,.10,.05]],
 [[.31,.015,.02],[.08,.11,.14],[-.33,.015,.28],[-.75,-.20,.11],[-.76,-.35,-.05],[-.54,-.38,-.19],[-.22,-.21,-.15],[-.06,.055,-.02]],
 [[.30,.005,.02],[.43,-.18,.12],[.78,-.40,.20],[.99,-.54,.06],[.92,-.59,-.12],[.67,-.46,-.24],[.42,-.25,-.18]]
];
function spline(keys,u,k){
 const index=(u%1)*keys.length,i=Math.floor(index),f=index-i,n=keys.length;
 const a=keys[(i+n-1)%n][k],b=keys[i][k],c=keys[(i+1)%n][k],d=keys[(i+2)%n][k];
 return b+.5*f*(c-a+f*(2*a-5*b+4*c-d+f*(3*b-a-3*c+d)));
}
function path(keys,layer=0,span=1,factor=1,phase=0){
 const samples=240,points=new Float32Array((samples+1)*3);
 for(let j=0;j<=samples;j++){
  const u=(j/samples*span+phase)%1,a=u*TAU,envelope=Math.sin(a*.5)**2;
  const x=spline(keys,u,0),y=spline(keys,u,1),z=spline(keys,u,2);
  points[j*3]=.32+(x-.32)*factor+layer*envelope*(.09*Math.cos(a*2)-.025)+layer*.026*Math.cos(3*a);
  points[j*3+1]=(y*factor)+layer*envelope*.092*Math.sin(a+.8)+layer*.045*Math.sin(2*a+.8);
  points[j*3+2]=z*factor+layer*(.16*Math.sin(a)+.07*Math.sin(2*a));
 }
 return points;
}
export function fieldGeometry(m){
 const paths=[];
 const add=(k,l,span,f,p,width,alpha,dots=false)=>paths.push({points:path(lobes[k],l,span,f,p),width,alpha,dots});
 lobes.forEach((_,i)=>{add(i,0,1,1,0,.72,.34);add(i,-.20,.76,.99,.10,.48,.33,true)});
 // Fractional coverage lets the time-lapse actually draw the next line into space.
 const families=[
  [m.sessions,52,(i,t)=>add(i%4,.35*Math.sin(i*GOLD)+.19, t,1.022+.046*Math.sin(i*1.7),0,.66,.44)],
  [m.notes,46,(i,t)=>add((i+1)%4,-.55+.34*Math.cos(i*GOLD),t,.75+.16*Math.sin(i*1.9),0,.74,.59,i%3===1)],
  [m.goals,32,(i,t)=>add(i%4,.8*Math.sin(i*GOLD+.9),t,.48+.25*Math.cos(i*GOLD),0,1.02,.81)],
  [m.streak,28,(i,t)=>add(i%4,-.31+.22*Math.sin(i*GOLD),t,.91+.03*Math.cos(i),0,.6,.35)],
  [m.days||0,32,(i,t)=>add((i+2)%4,.43*Math.cos(i*GOLD),t,.61+.13*Math.cos(i),0,.56,.42,true)]
 ];
 const sessionBands=Math.min(24,Math.ceil(m.sessions));
 for(let j=0;j<sessionBands;j++){
   const sequence=j+Math.max(0,Math.floor(m.sessions)-24),k=sequence%4;
   for(let f=0;f<5;f++){
     add(k,.43*Math.sin(sequence*GOLD)+f*.062,Math.min(1,m.sessions-j),.71+.1*Math.cos(sequence*GOLD)+f*.008,0,.71,.48);
     paths.at(-1).session=sequence+1;
   }
 }
 for(const [count,limit,make] of families){
   const n=Math.min(count,limit);for(let i=0;i<Math.ceil(n);i++)make(i+Math.max(0,Math.floor(count-limit)),Math.min(1,n-i));
 }
 // Short cross-sections make the separation between neighboring orbits readable.
 let f=1,next=2,netLayers=0;
 while(f<=m.sessions){netLayers++;[f,next]=[next,f+next]}
 const bridges=Math.min(48,netLayers*2+Math.floor(m.goals*.9+m.streak*.4));
 for(let i=0;i<bridges;i++){
   const k=i%4,u=.08+((i*.381966)%1)*.77,points=new Float32Array(33*3);
   for(let j=0;j<=32;j++){
     const t=j/32,at=u+.025*Math.sin(Math.PI*t),x=spline(lobes[k],at,0),y=spline(lobes[k],at,1),z=spline(lobes[k],at,2);
     points[j*3]=.32+(x-.32)*(.76+.24*t);points[j*3+1]=y*(.76+.24*t);points[j*3+2]=z+.028*Math.sin(Math.PI*t);
   }
   paths.push({points,width:.52,alpha:.25,dots:i%2===0});
 }
 // Later sessions assemble a second family of inclined orbits around the knot.
 // The new arcs unfold continuously as the 30-day preview advances.
 const cycles=Math.min(9,m.sessions/3);
 for(let i=0;i<Math.ceil(cycles);i++){
   const coverage=Math.min(1,cycles-i),angle=i*GOLD+.22,radius=.17+i*.053;
   for(let strand=0;strand<4;strand++){
     const pts=new Float32Array(169*3);
     for(let j=0;j<=168;j++){
       const t=j/168*TAU*coverage,rad=radius*(1+.09*Math.sin(3*t+i))+strand*.004;
       const x=rad*Math.cos(t),y=rad*.61*Math.sin(t);
       pts[3*j]=.32+x*Math.cos(angle)-y*Math.sin(angle);
       pts[3*j+1]=.035+x*Math.sin(angle)+y*Math.cos(angle);
       pts[3*j+2]=rad*.69*Math.sin(t+i*.72);
     }
     paths.push({points:pts,width:strand===0?.94:.45,alpha:strand===0?.72:.26,dots:strand===3});
   }
 }
 // A new inclined fan opens through each week of study. Neighboring filaments
 // share their origin and separate gradually into a distinct orbital plane.
 const weeks=Math.min(5,(m.days||0)/7);
 for(let i=0;i<Math.ceil(weeks);i++){
   const span=Math.min(1,weeks-i),a=i*GOLD-.38;
   for(let strand=0;strand<15;strand++){
     const v=strand/14,pts=new Float32Array(137*3);
     for(let j=0;j<=136;j++){
       const t=j/136*TAU*span,r=(1-Math.cos(t))*(.25+.055*i),side=Math.sin(t)*(.19+.12*v);
       pts[j*3]=.32+r*Math.cos(a)-side*Math.sin(a);
       pts[j*3+1]=.035+r*Math.sin(a)+side*Math.cos(a);
       pts[j*3+2]=.09*Math.sin(t*2)+r*(v-.5)*.96;
     }
     paths.push({points:pts,width:strand%7===0?.9:.52,alpha:strand%7===0?.66:.31,dots:strand%5===1});
   }
 }
 return paths;
}
export function formation(){
 const canvas=document.querySelector('#traces'),ctx=canvas.getContext('2d'),art=canvas.parentElement,stage=art.closest('.installation');
 const proof=document.querySelector('#proof'),copy=proof.getContext('2d'),quality=document.querySelector('#quality');
 let yaw=.045,elevation=.08,zoom=1,quiet=true,cinema=false,quality4k=false,dirty=true,drag=null,phase=0,visible=true,proofVisible=false;
 let marks={sessions:0,notes:0,goals:0,streak:0,days:0},geometry=fieldGeometry(marks),lastKey='',size=1;
 const cloth=membrane();
 let activeId=null,mode='idle',sessionCount=null,impulse=-Infinity,reward=-Infinity;
 function frame(capture=false){
  const w=art.clientWidth,h=art.clientHeight;if(!w||!h)return;
  const d=Math.min(devicePixelRatio||1,quality4k?2:1.25),cw=quality4k?3840:Math.round(w*d),ch=quality4k?2160:Math.round(h*d);
  if(canvas.width!==cw||canvas.height!==ch){canvas.width=cw;canvas.height=ch}
  ctx.setTransform(cw/w,0,0,ch/h,0,0);ctx.clearRect(0,0,w,h);
  const az=yaw,ca=Math.cos(az),sa=Math.sin(az),ce=Math.cos(elevation),se=Math.sin(elevation);
  const scale=Math.min(w*.438,h*.50)*zoom*size*(cinema?.90:1);
  const now=performance.now(),startT=(now-impulse)/1450,rewardT=(now-reward)/2750;
  const pull=mode==='active'&&!quiet&&startT>=0&&startT<1?Math.sin(Math.PI*startT)**1.3:0;
  const breath=mode==='active'&&!quiet?Math.sin(phase*2.4):0;
  const pressure=(mode==='active'?.34:mode==='paused'?.19:0)+.98*pull+.060*breath;
  const wave=.65*pull+.07*breath;
  const reveal=quiet?1:Math.max(0,Math.min(1,rewardT));
  const anchor=Math.max(0,1-1/zoom);
  const project=(x,y,z)=>{x-=.32*anchor;y+=.065*anchor;z-=.04*anchor;const rx=x*ca+z*sa,rz=z*ca-x*sa;return [w*.46+scale*rx,h*.51-scale*((y-.10)*ce-rz*se)]};
  function deformTo(x,y,z,out,i){
   if(pressure||wave){
    const dx=x-.32,dy=y-.035,r=Math.hypot(dx,dy,z),amount=pressure;
    const p=amount*(.1+.14*Math.exp(-r*r*2.6)),turn=wave*(.12+.18*Math.exp(-r*r*2)),c=Math.cos(turn),s=Math.sin(turn);
    x=.32+(dx*c-dy*s)*(1-p);
    y=.035+(dx*s+dy*c)*(1-p);
    z=z*(1-.48*p)+.028*wave*Math.sin(dx*4+dy*3);
   }
   x-=.32*anchor;y+=.065*anchor;z-=.04*anchor;
   const rx=x*ca+z*sa,rz=z*ca-x*sa;
   out[i]=w*.46+scale*rx;out[i+1]=h*.51-scale*((y-.10)*ce-rz*se);
  }
  const elements=[],specks=[];
  function stroke(points,width,alpha,dots=false,depth=0,dark=false,count=points.length){
   const light=Math.max(0,Math.min(1,(depth+.62)/1.24)),tone=Math.round(dark?76+light*38:126+light*32);
   const color='rgb('+tone+','+tone+','+(tone-2)+')';
   const buffered=points instanceof Float32Array;
   if(capture){const projected=buffered?Array.from({length:count/2},(_,i)=>[points[i*2],points[i*2+1]]):points;elements.push({points:projected,width,alpha,dots,color})}
   ctx.beginPath();
   if(buffered){for(let i=0;i<count;i+=2)i?ctx.lineTo(points[i],points[i+1]):ctx.moveTo(points[i],points[i+1])}
   else points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
   ctx.lineCap='round';ctx.lineJoin='round';ctx.setLineDash(dots?[.75,2.2]:[]);
   if(!dots){ctx.save();ctx.globalAlpha=alpha*.16;ctx.lineWidth=width;ctx.strokeStyle=color;ctx.shadowColor='rgba(30,28,25,.035)';ctx.shadowBlur=.35;ctx.shadowOffsetY=.4;ctx.stroke();ctx.restore()}
   ctx.lineWidth=width;ctx.strokeStyle=color;ctx.globalAlpha=alpha;ctx.stroke();ctx.globalAlpha=1;
   if(!dots&&light>.2){ctx.save();ctx.lineWidth=Math.max(.3,width*.28);ctx.strokeStyle='rgba(255,255,255,'+(alpha*light*.15)+')';ctx.stroke();ctx.restore()}
  }
  const labels=[];
  stroke([project(-1.22,.035,0),project(1.22,.035,0)],.48,.24);
  stroke([project(.32,-1.08,0),project(.32,1.08,0)],.48,.24);
  for(let n=-2;n<=2;n++){
   if(!n)continue;
   const value=n*.5,[x,y]=project(.32+value,.035,0);
   stroke([project(.32+value,.025,0),project(.32+value,.045,0)],.48,.28);
   if(n%2===0)labels.push([value.toFixed(1),x+3,y+11]);
   const [,yy]=project(.32,.035+value,0);
   stroke([project(.31,.035+value,0),project(.33,.035+value,0)],.48,.28);
   if(n%2===0)labels.push([value.toFixed(1),w*.46+4,yy+3]);
  }
  labels.push(['x',w*.46+scale*1.22+3,h*.51+4],['y',w*.46+4,h*.51-scale*1.08-3]);
  // Stipple stays fixed on the sheets, including while rotating and contracting.
  for(const band of cloth.dust){
   const radius=Math.max(.59,Math.min(1.24,scale*.0024));
   ctx.fillStyle='rgba(58,56,53,'+band.alpha+')';
   const positions=capture?[]:null;
   band.screen??=new Float32Array(band.points.length/3*2);
   ctx.beginPath();
   for(let i=0;i<band.points.length;i+=3){
    const index=i/3*2;
    deformTo(band.points[i],band.points[i+1],band.points[i+2],band.screen,index);
    const x=band.screen[index],y=band.screen[index+1];
    ctx.rect(x,y,radius,radius);if(positions)positions.push([x,y]);
   }
   ctx.fill();
   if(positions)specks.push({positions,radius,alpha:band.alpha});
  }
  for(const line of [...cloth.lines,...geometry]){
   const newest=line.session===sessionCount&&reveal<1;
   const end=newest?Math.max(6,Math.floor(line.points.length/3*reveal)*3):line.points.length;
   line.screen??=new Float32Array(line.points.length/3*2);
   let depth=0,depthPoints=0;
   for(let j=0;j<end;j+=3){
    const x=line.points[j],y=line.points[j+1],z=line.points[j+2];
    deformTo(x,y,z,line.screen,j/3*2);depth+=(y-.1)*se+(z*ca-x*sa)*ce;depthPoints++;
   }
   stroke(line.screen,line.width+(newest?.65*(1-reveal):0),newest?.8:line.alpha,line.dots,depth/(depthPoints||1),line.dark,end/3*2);
  }
  const [holeX,holeY]=project(.32,.035,0),holeRadius=Math.max(16,Math.min(40,scale*.074));
  const feeling=quiet?0:Math.sin(phase*1.15)*.5+.5,haloRadius=holeRadius*(2.45+.12*feeling);
  const glow=ctx.createRadialGradient(holeX,holeY,holeRadius*.72,holeX,holeY,haloRadius);
  glow.addColorStop(0,'rgba(183,180,172,.32)');
  glow.addColorStop(.3,'rgba(198,195,187,.25)');
  glow.addColorStop(.68,'rgba(216,213,206,.13)');
  glow.addColorStop(1,'rgba(232,230,225,0)');
  ctx.fillStyle=glow;ctx.beginPath();ctx.arc(holeX,holeY,haloRadius,0,TAU);ctx.fill();
  const core=ctx.createRadialGradient(holeX-holeRadius*.3,holeY-holeRadius*.32,holeRadius*.05,holeX,holeY,holeRadius*1.08);
  core.addColorStop(0,'rgba(174,172,168,.88)');core.addColorStop(.72,'rgba(157,155,151,.84)');core.addColorStop(1,'rgba(133,131,127,.78)');
  ctx.beginPath();ctx.arc(holeX,holeY,holeRadius,0,TAU);ctx.fillStyle=core;ctx.fill();
  ctx.setLineDash([]);ctx.font='9px monospace';ctx.fillStyle='#777';for(const [t,x,y] of labels)ctx.fillText(t,x,y);
  document.querySelector('#angle').textContent=((az*180/Math.PI+360)%360).toFixed(1)+'°';
  if(proofVisible){const pw=Math.max(1,Math.round(proof.clientWidth*d)),ph=Math.max(1,Math.round(proof.clientHeight*d));if(proof.width!==pw||proof.height!==ph){proof.width=pw;proof.height=ph}copy.fillStyle='#efefed';copy.fillRect(0,0,pw,ph);const r=Math.min(pw/w,ph/h);copy.drawImage(canvas,(pw-w*r)/2,(ph-h*r)/2,w*r,h*r)}
  dirty=false;return {w,h,elements,labels,specks,hole:{x:holeX,y:holeY,r:holeRadius,halo:haloRadius}};
 }
 const actions=document.querySelector('.actions'),desk=actions.parentElement,sessionControls=document.querySelector('#sessionControls');
 let raf=0,last=0;
 function invalidate(){dirty=true;if(!raf&&!document.hidden)raf=requestAnimationFrame(loop)}
 function syncQuality(){quality.setAttribute('aria-pressed',String(quality4k));quality.textContent=quality4k?'Exit 4K':'4K'}
 let speed=1;
 const slider=document.querySelector('#speed'),rate=document.querySelector('#rate');
 try{const saved=localStorage.getItem('atmos-orbit-speed');if(saved!==null&&Number.isFinite(+saved))speed=Math.min(3,Math.max(0,+saved))}catch{}
 function showSpeed(){slider.value=speed;rate.textContent=speed+'×';slider.setAttribute('aria-valuetext',speed+' times normal speed')}
 slider.oninput=()=>{speed=slider.valueAsNumber;showSpeed();try{localStorage.setItem('atmos-orbit-speed',speed)}catch{}};
 showSpeed();
 function setCinema(on,native=false,request4k=false){
  cinema=on;quality4k=on&&request4k;stage.classList.toggle('cinema',on);syncQuality();
  if(on){sessionControls.append(actions);if(native&&!document.fullscreenElement)document.documentElement.requestFullscreen?.().catch(()=>{})}
  else{desk.append(actions);if(document.fullscreenElement)document.exitFullscreen().catch(()=>{})}
  invalidate();
 }
 document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement&&cinema)setCinema(false)});
 quality.disabled=false;quality.onclick=()=>{
  if(cinema&&!quality4k){quality4k=true;syncQuality();invalidate()}
  else setCinema(!cinema,!cinema,!cinema);
 };
 window.addEventListener('keydown',e=>{if(e.key==='Escape'&&cinema&&!document.querySelector('dialog[open]'))setCinema(false)});
 function rotate(dx,dy){yaw+=dx;elevation+=dy;invalidate()}
 function magnify(by){zoom=Math.min(10,Math.max(.55,zoom*by));document.querySelector('#near').title='Zoom in · '+zoom.toFixed(1)+'×';invalidate()}
 document.querySelector('#near').onclick=()=>magnify(1.15);document.querySelector('#far').onclick=()=>magnify(1/1.15);
 canvas.onpointerdown=e=>{if(!e.isPrimary)return;canvas.setPointerCapture(e.pointerId);drag=[e.clientX,e.clientY]};
 canvas.onpointermove=e=>{if(!drag||!e.isPrimary)return;rotate((e.clientX-drag[0])*.007,(e.clientY-drag[1])*.007);drag=[e.clientX,e.clientY]};
 canvas.onlostpointercapture=()=>drag=null;
 canvas.onwheel=e=>{if(!e.ctrlKey&&!e.metaKey)return;e.preventDefault();magnify(Math.exp(-e.deltaY*.012))};
 canvas.onkeydown=e=>{const keys={ArrowLeft:[-.09,0],ArrowRight:[.09,0],ArrowUp:[0,.09],ArrowDown:[0,-.09]};if(keys[e.key]){e.preventDefault();rotate(...keys[e.key])}else if(e.key==='+'||e.key==='=')magnify(1.1);else if(e.key==='-')magnify(1/1.1)};
 document.querySelector('#collect').onclick=()=>{
  const {w,h,elements,labels,specks,hole}=frame(true);const xml=['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+w+' '+h+'"><defs><radialGradient id="holeGlow"><stop offset="0%" stop-color="#b7b4ac" stop-opacity=".32"/><stop offset="30%" stop-color="#c6c3bb" stop-opacity=".25"/><stop offset="68%" stop-color="#d8d5ce" stop-opacity=".13"/><stop offset="100%" stop-color="#e8e6e1" stop-opacity="0"/></radialGradient><radialGradient id="horizon" cx="25%" cy="20%"><stop offset="0%" stop-color="#aeaca8" stop-opacity=".88"/><stop offset="72%" stop-color="#9d9b97" stop-opacity=".84"/><stop offset="100%" stop-color="#85837f" stop-opacity=".78"/></radialGradient></defs><rect width="100%" height="100%" fill="#f4f4f1"/>'];
  for(const {positions,radius,alpha} of specks){
    const dots=positions.map(([x,y])=>'M'+x.toFixed(2)+' '+y.toFixed(2)+'h'+radius.toFixed(2)).join('');
    xml.push('<path d="'+dots+'" stroke="#3a3835" stroke-width="'+radius.toFixed(2)+'" opacity="'+alpha+'"/>');
  }
  for(const {points,width,alpha,dots,color='#181818',dark=false} of elements){const coordinates=points.map(pt=>pt.map(v=>v.toFixed(2)).join(',')).join(' ');if(!dots)xml.push('<polyline fill="none" stroke="#1e1c19" stroke-width="'+(width+.45)+'" opacity="'+(alpha*.07)+'" transform="translate(0 .55)" points="'+coordinates+'"/>');xml.push('<polyline fill="none" stroke="'+color+'" stroke-width="'+width+'" opacity="'+alpha+'" stroke-linecap="round" stroke-linejoin="round" '+(dots?'stroke-dasharray=".75 2.2"':'')+' points="'+coordinates+'"/>');if(!dots)xml.push('<polyline fill="none" stroke="#fff" stroke-width="'+Math.max(.3,width*.28)+'" opacity="'+(alpha*.06)+'" transform="translate(0 -.22)" points="'+coordinates+'"/>')}
  xml.push('<circle cx="'+hole.x+'" cy="'+hole.y+'" r="'+hole.halo+'" fill="url(#holeGlow)"/><circle cx="'+hole.x+'" cy="'+hole.y+'" r="'+hole.r+'" fill="url(#horizon)"/>');
  for(const [t,x,y] of labels)xml.push('<text x="'+x+'" y="'+y+'" font-family="monospace" font-size="9" fill="#777">'+t+'</text>');
  xml.push('</svg>');const url=URL.createObjectURL(new Blob(xml,{type:'image/svg+xml'})),a=document.createElement('a');a.href=url;a.download='Fadenraum-Field-'+new Date().toISOString().slice(0,10)+'.svg';a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);
 };
 new ResizeObserver(invalidate).observe(art);new ResizeObserver(invalidate).observe(proof);
 new IntersectionObserver(([e])=>{visible=e.isIntersecting;invalidate()}).observe(art);new IntersectionObserver(([e])=>{proofVisible=e.isIntersecting;invalidate()}).observe(proof);
 function loop(t){
  raf=0;
  if(!document.hidden&&(visible||proofVisible)){
   const animate=!quiet&&mode==='active',interval=1000/12;
   if(dirty||(animate&&t-last>=interval)){
    if(animate&&!drag){const dt=last?Math.min(t-last,150):interval;phase+=dt*.00019;yaw+=dt*.000082*speed;}
    frame();last=t;
   }
  }
  if(!quiet&&mode==='active'&&!document.hidden&&(visible||proofVisible))raf=requestAnimationFrame(loop);
 }
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)invalidate()});
 invalidate();
 const updateField=(state,project,next)=>{
   quiet=state.still||matchMedia('(prefers-reduced-motion: reduce)').matches;
   const id=state.active?.id||null;
   if(id&&activeId!==id&&sessionCount!==null)impulse=performance.now();
   if(activeId&&!id&&state.sessions.some(v=>v.id===activeId)){reward=performance.now()}
   activeId=id;mode=id?(state.active.end===null?'paused':'active'):'idle';sessionCount=state.sessions.length;
   marks=next;
   const key=Object.values(marks).map(n=>Math.round(n*16)).join(',');
   if(key!==lastKey){lastKey=key;geometry=fieldGeometry(marks)}
   const total=marks.sessions+marks.days+marks.notes*.65+marks.goals*1.6+marks.streak*.65;
   size=.94+.22*(1-Math.exp(-total/32))+.012*Math.log1p(total);invalidate();
 };
 updateField.cinema=setCinema;
 return updateField;
}
