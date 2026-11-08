// Three original synthetic layers. AudioContext is created only on a play gesture.
export function sound(){
 const root=document.querySelector('#sound'),layers=[['Drone',.27],['Wind',.20],['Pulse',.13]];
 let ctx,master;
 function source(index,gain){
   const sources=[];const osc=(hz,type='sine')=>{const o=ctx.createOscillator();o.type=type;o.frequency.value=hz;sources.push(o);return o};
   if(index===0){for(const hz of [73.42,110,130.81]){const o=osc(hz);o.detune.value=(hz%5)-2;o.connect(gain)}}
   if(index===1){const buffer=ctx.createBuffer(1,ctx.sampleRate*6,ctx.sampleRate),data=buffer.getChannelData(0);let last=0;for(let j=0;j<data.length;j++){last=.98*last+.045*(Math.random()*2-1);data[j]=last}const n=ctx.createBufferSource();n.buffer=buffer;n.loop=true;sources.push(n);const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=820;n.connect(f);f.connect(gain)}
   if(index===2){const o=osc(55),env=ctx.createGain(),pulse=osc(.83);const shape=ctx.createWaveShaper();shape.curve=Float32Array.from({length:256},(_,i)=>(i/255)**22*.8);env.gain.value=0;pulse.connect(shape);shape.connect(env.gain);o.connect(env);env.connect(gain)}
   sources.forEach(s=>s.start());return sources;
 }
 layers.forEach(([name,level],i)=>{const line=document.createElement('div');line.className='layer';const button=document.createElement('button'),slider=document.createElement('input');let sources=null,gain;button.textContent=name+' · play';button.setAttribute('aria-pressed','false');slider.type='range';slider.min=0;slider.max=100;slider.value=Math.round(level*100);slider.setAttribute('aria-label','Volume · '+name);slider.oninput=()=>gain?.gain.setTargetAtTime(slider.value/100,ctx.currentTime,.08);
 button.onclick=async()=>{if(sources){const old=gain;old.gain.setTargetAtTime(0,ctx.currentTime,.025);sources.forEach(s=>s.stop(ctx.currentTime+.15));sources=null;gain=null;button.textContent=name+' · play';button.setAttribute('aria-pressed','false');return}
 try{ctx??=new AudioContext();if(!master){master=ctx.createGain();master.gain.value=.15;master.connect(ctx.destination)}await ctx.resume();if(sources)return;gain=ctx.createGain();gain.gain.value=0;gain.connect(master);sources=source(i,gain);gain.gain.setTargetAtTime(slider.value/100,ctx.currentTime,.1);button.textContent=name+' · stop';button.setAttribute('aria-pressed','true')}catch{button.textContent='Retry audio'}};line.append(button,slider);root.append(line)});
}
