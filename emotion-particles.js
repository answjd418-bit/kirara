/* 2D pointer-responsive particles sampled from the original emotion artwork. */
(() => {
  const host=document.querySelector('#result-artwork-preview');
  const dialog=document.querySelector('#result-dialog');
  if(!host||!dialog)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const overlay=document.createElement('canvas');
  overlay.className='emotion-particle-overlay'; overlay.setAttribute('aria-hidden','true');
  const pen=overlay.getContext('2d');
  const sample=document.createElement('canvas'); const ctx=sample.getContext('2d',{willReadFrequently:true});
  let source=null, points=[], raf=0, active=false, px=0,py=0, strength=0, w=0,h=0, scale=1, stamp=0;
  const resize=()=>{const r=host.getBoundingClientRect();w=r.width;h=r.height;scale=Math.min(devicePixelRatio||1,2);overlay.width=Math.max(1,Math.round(w*scale));overlay.height=Math.max(1,Math.round(h*scale));};
  function build(){
    source=host.querySelector('canvas:not(.emotion-particle-overlay)'); if(!source||!source.width||!source.height)return;
    if(!overlay.isConnected)host.append(overlay);resize();
    const s=260/Math.max(source.width,source.height);sample.width=Math.max(1,Math.round(source.width*s));sample.height=Math.max(1,Math.round(source.height*s));ctx.clearRect(0,0,sample.width,sample.height);ctx.drawImage(source,0,0,sample.width,sample.height);
    const {data}=ctx.getImageData(0,0,sample.width,sample.height);points=[];
    for(let y=0;y<sample.height;y+=2)for(let x=0;x<sample.width;x+=2){const i=(y*sample.width+x)*4;const peak=Math.max(data[i],data[i+1],data[i+2]);if(data[i+3]<18||peak<25)continue;const seed=Math.random();if(seed>.72)continue;points.push({x:(x+.5)/sample.width,y:(y+.5)/sample.height,c:`rgb(${data[i]},${data[i+1]},${data[i+2]})`,a:data[i+3]/255,seed,phase:Math.random()*Math.PI*2});}
  }
  function draw(now){raf=0;if(!dialog.open||reduced.matches){pen.clearRect(0,0,overlay.width,overlay.height);return;}if(!source||!source.isConnected){build();}if(!source){raf=requestAnimationFrame(draw);return;}
    strength+=(Number(active)-strength)*.095;pen.setTransform(scale,0,0,scale,0,0);pen.clearRect(0,0,w,h);
    const r=source.getBoundingClientRect(), b=host.getBoundingClientRect();const fit=Math.min(r.width/source.width,r.height/source.height);const sw=source.width*fit,sh=source.height*fit;const ox=r.left-b.left+(r.width-sw)/2,oy=r.top-b.top+(r.height-sh)/2;
    const radius=Math.max(65,Math.min(w,h)*.32);pen.globalCompositeOperation='lighter';
    for(const p of points){const x=ox+p.x*sw,y=oy+p.y*sh;const dx=x-px,dy=y-py,d=Math.hypot(dx,dy);const influence=Math.exp(-d*d/(radius*radius))*strength;if(influence<.018)continue;const angle=Math.atan2(dy,dx)+Math.sin(p.phase+now*.002)*.65;const push=influence*(8+p.seed*57);const xx=x+Math.cos(angle)*push+Math.sin(now*.004+p.phase)*influence*5;const yy=y+Math.sin(angle)*push+Math.cos(now*.003+p.phase)*influence*5;pen.fillStyle=p.c;pen.globalAlpha=Math.min(.85,influence*p.a*(.35+p.seed*.65));pen.beginPath();pen.arc(xx,yy,.45+p.seed*1.1,0,Math.PI*2);pen.fill();}
    pen.globalAlpha=1;pen.globalCompositeOperation='source-over';raf=requestAnimationFrame(draw);
  }
  host.addEventListener('pointermove',e=>{const r=host.getBoundingClientRect();px=e.clientX-r.left;py=e.clientY-r.top;active=true;if(!raf&&!reduced.matches)raf=requestAnimationFrame(draw);});
  host.addEventListener('pointerleave',()=>{active=false;});
  host.addEventListener('pointercancel',()=>{active=false;});
  new ResizeObserver(()=>{if(dialog.open)resize();}).observe(host);
  new MutationObserver(()=>{if(dialog.open&&!reduced.matches){build();if(!raf)raf=requestAnimationFrame(draw);}}).observe(dialog,{attributes:true,attributeFilter:['open']});
  dialog.addEventListener('close',()=>{cancelAnimationFrame(raf);raf=0;active=false;strength=0;source=null;points=[];overlay.remove();});
})();
