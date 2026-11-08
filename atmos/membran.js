// Fine swept sheets meet at the center and open into overlapping orbital petals.
const sheets=[
  [0,1.05,1.02,.16,.15], [.79,.94,-1.16,.22,-.20],
  [1.57,1.12,1.12,.13,.24], [2.35,.96,-1.24,.24,-.18],
  [3.14,1.10,1.04,.18,.22], [3.93,.98,-1.18,.25,-.16],
  [4.71,1.08,1.22,.14,.19], [5.50,.95,-1.12,.22,-.23],
];
const tau=2*Math.PI;
function point(sheet,t,v){
 const [bearing,reach,sweep,lift,curl]=sheet,a=tau*t,petal=Math.sin(Math.PI*t)**.82;
 const angle=bearing+sweep*(t-.5)+v*(.31+.12*Math.sin(Math.PI*t))+curl*Math.sin(a+v*1.1);
 const radius=reach*petal*(1+.20*v+.065*Math.sin(2*a+v*2));
 const x=radius*Math.cos(angle),y=radius*Math.sin(angle);
 const z=lift*Math.sin(a+v*.45)+v*.16*petal+.055*Math.sin(2*a+v*2)*petal;
 return [.32+x,.035+y,z];
}
function random(seed){return ()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296}}
export function membrane(){
 const lines=[],dust=[],rng=random(9148);
 let strandIndex=0;
 sheets.forEach((sheet,k)=>{
  for(let j=0;j<43;j++){
   const v=j/21-1,points=new Float32Array(169*3);
   for(let i=0;i<=168;i++)points.set(point(sheet,i/168,v),3*i);
   const edge=j===0||j===42;
   lines.push({points,width:edge?.68:.43,alpha:edge?.2:.095+.018*Math.cos(v*4),dots:false,dark:strandIndex++%20<7});
  }
  // Close-running filaments trace the main fold, thick at its throat and
  // visibly separated again along the exposed rim.
  for(let j=0;j<16;j++){
    const points=new Float32Array(134*3);
    for(let i=0;i<134;i++){
      const t=i/133*.81, v=.29+.22*Math.sin(6*t+k*.8)+(j/15-.5)*(.08+.27*Math.sin(Math.PI*t)**2);
      points.set(point(sheet,t,v),3*i);
    }
    lines.push({points,width:.45,alpha:k===0?.16:.105,dots:false,dark:strandIndex++%20<7});
  }
  const n=1800,points=new Float32Array(n*3);
  for(let i=0;i<n;i++){
    const t=rng(),v=2*rng()-1,p=point(sheet,t,v);
    const jitter=.009*Math.sin(t*Math.PI);
    for(let j=0;j<3;j++)points[i*3+j]=p[j]+(rng()-.5)*jitter;
  }
  dust.push({points,alpha:.085});
 });
 return {lines,dust};
}
export function focusDeformation(x,y,z,amount,wave){
 const cx=.32,cy=.035,dx=x-cx,dy=y-cy,r=Math.hypot(dx,dy,z);
 const pressure=amount*(.1+.14*Math.exp(-r*r*2.6));
 const turn=wave*(.12+.18*Math.exp(-r*r*2)),c=Math.cos(turn),s=Math.sin(turn);
 return [cx+(dx*c-dy*s)*(1-pressure),cy+(dx*s+dy*c)*(1-pressure),z*(1-.48*pressure)+.028*wave*Math.sin(dx*4+dy*3)];
}
export function sectionPoint(kind,t,v){
 const i={sessions:0,goals:1,notes:4,streak:3,days:2}[kind]??0;
 return point(sheets[i],t,v);
}
