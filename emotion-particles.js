/* Layered spatial artwork viewer, no external dependencies. */
(() => {
 const host=document.querySelector('#result-artwork-preview'), dialog=document.querySelector('#result-dialog');
 if(!host||!dialog)return;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const canvas=document.createElement('canvas'), pen=canvas.getContext('2d');
 if(!pen)return;
 canvas.className='emotion-particle-overlay'; canvas.tabIndex=0;
 canvas.setAttribute('aria-label','Drag to rotate artwork in any direction. Wheel to zoom. Arrow keys to rotate. R to reset.');
 Object.assign(canvas.style,{position:'absolute',inset:'0',width:'100%',height:'100%',pointerEvents:'auto',touchAction:'none',cursor:'grab',filter:'none'});
 const hint=document.createElement('div'); hint.textContent='DRAG / ROTATE   ·   SCROLL / ZOOM   ·   R / RESET';
 Object.assign(hint.style,{position:'absolute',left:'12px',bottom:'10px',fontSize:'10px',color:'#a1aaa5',pointerEvents:'none',letterSpacing:'.04em'});
 let result=null, layers=[], raf=0,w=0,h=0,dpr=1, yaw=0,pitch=0,ty=0,tx=0,zoom=1,tzoom=1,hover=false,drag=null,px=0,py=0,energy=0,entered=0;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function resize(){const r=host.getBoundingClientRect();w=r.width;h=r.height;dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.max(1,Math.round(w*dpr));canvas.height=Math.max(1,Math.round(h*dpr));}
 function reset(){yaw=pitch=ty=tx=0;zoom=tzoom=1;energy=0;}
 function setResult(r){if(result===r)return;result=r;reset();const {frame,offsetX,offsetY,artwork}=r;const basis=Math.min(frame.width,frame.height),unit=Math.max(artwork.width,artwork.height);layers=r.layers.map((l,i)=>{
  const im=l.texture.texture, ratio=l.size*basis*1.02/Math.max(im.width,im.height)/unit;
  const small=document.createElement('canvas');const q=small.getContext('2d',{willReadFrequently:true});const s=Math.min(1,125/Math.max(im.width,im.height));small.width=Math.max(1,Math.round(im.width*s));small.height=Math.max(1,Math.round(im.height*s));q.drawImage(im,0,0,small.width,small.height);const data=q.getImageData(0,0,small.width,small.height).data;const points=[];
  for(let y=0;y<small.height;y+=2)for(let x=0;x<small.width;x+=2){const j=(y*small.width+x)*4;if(data[j+3]<24||Math.max(data[j],data[j+1],data[j+2])<20||Math.random()>.62)continue;points.push({x:(x/small.width-.5)*im.width*ratio,y:(y/small.height-.5)*im.height*ratio,c:`rgb(${data[j]},${data[j+1]},${data[j+2]})`,a:data[j+3]/255,k:Math.random(),phase:Math.random()*6.28});}
  return {im,x:(l.x*frame.width+offsetX-artwork.width/2)/unit,y:(l.y*frame.height+offsetY-artwork.height/2)/unit,z:(i-(r.layers.length-1)/2)*Math.min(.12,.78/Math.max(1,r.layers.length-1)),angle:l.angle,width:im.width*ratio,height:im.height*ratio,points,i};
 });if(dialog.open)start();}
 window.emotionOrbit={setResult};
 function start(){if(!result||!dialog.open)return;if(!canvas.isConnected){host.append(canvas,hint);resize();}entered=performance.now();if(!raf)raf=requestAnimationFrame(draw);}
 function draw(now){raf=0;if(!dialog.open||!result)return;if(!canvas.isConnected){host.append(canvas,hint);resize();}
 const source=host.querySelector('canvas:not(.emotion-particle-overlay)');if(source)source.style.visibility='hidden';
 const ease=reduced.matches?1:.12; yaw+=(ty-yaw)*ease;pitch+=(tx-pitch)*ease;zoom+=(tzoom-zoom)*ease;energy+=((hover?1:0)-energy)*.1;
 const t=reduced.matches?0:(now-entered)/1000;const hy=hover&&!drag&&!reduced.matches?clamp((px/w-.5)*.85,-.43,.43):0;const hx=hover&&!drag&&!reduced.matches?clamp((py/h-.5)*.65,-.33,.33):0;
 const cy=Math.cos(yaw+hy*energy),sy=Math.sin(yaw+hy*energy),cx=Math.cos(pitch+hx*energy),sx=Math.sin(pitch+hx*energy);
 const scale=Math.min(w,h)*.88*zoom;const rot=(x,y,z)=>{const a=x*cy+z*sy,b=-x*sy+z*cy;return [a,y*cx-b*sx,y*sx+b*cx];};const project=(x,y,z)=>[w/2+x*scale,h/2+y*scale,z];
 pen.setTransform(dpr,0,0,dpr,0,0);pen.clearRect(0,0,w,h);pen.globalCompositeOperation='screen';
 const prepared=layers.map(l=>{const drift=energy*.035;const p=rot(l.x+Math.sin(t*1.5+l.i)*(.012+drift),l.y+Math.cos(t*1.25+l.i)*(.012+drift),l.z+Math.sin(t*1.8+l.i)*energy*.05);const center=project(...p);const dx=center[0]-px,dy=center[1]-py;const influence=energy*Math.exp(-(dx*dx+dy*dy)/Math.pow(Math.min(w,h)*.45,2));center[0]+=dx*influence*.24;center[1]+=dy*influence*.24;const angle=l.angle+Math.sin(t*1.2+l.i)*(.04+influence*.15);const c=Math.cos(angle),s=Math.sin(angle);const a=rot(c,s,0),b=rot(-s,c,0);return {l,center,a,b,influence};}).sort((a,b)=>a.center[2]-b.center[2]);
 for(const {l,center,a,b,influence} of prepared){const [x,y]=center;const size=scale*(1+influence*.13);pen.save();pen.transform(a[0]*size,a[1]*size,b[0]*size,b[1]*size,x,y);pen.globalAlpha=.94;pen.drawImage(l.im,-l.width/2,-l.height/2,l.width,l.height);pen.restore();
  // Spatial particles remain visible even when the flat fragments are viewed edge-on.
  const edge=1-Math.abs(a[0]*b[1]-a[1]*b[0]);for(const p of l.points){const xx=x+(a[0]*p.x+b[0]*p.y)*size,yy=y+(a[1]*p.x+b[1]*p.y)*size;const dx=xx-px,dy=yy-py;const f=energy*Math.exp(-(dx*dx+dy*dy)/Math.pow(Math.min(w,h)*.34,2));if(f<.025&&edge<.3)continue;const d=Math.hypot(dx,dy)||1;const spread=f*(12+65*p.k);const depth=(p.k-.5)*.065*scale;const ux=xx+dx/d*spread+sy*depth+Math.sin(t*3+p.phase)*f*8,uy=yy+dy/d*spread-sx*depth+Math.cos(t*3+p.phase)*f*8;pen.globalAlpha=clamp((f*.8+edge*.36)*p.a,0,.9);pen.fillStyle=p.c;pen.beginPath();pen.arc(ux,uy,.45+p.k*1.15,0,Math.PI*2);pen.fill();}
 }
 pen.globalAlpha=1;pen.globalCompositeOperation='source-over';raf=requestAnimationFrame(draw);
 }
 function pointer(e){const r=host.getBoundingClientRect();px=e.clientX-r.left;py=e.clientY-r.top;hover=true;}
 canvas.addEventListener('pointerdown',e=>{pointer(e);drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);canvas.style.cursor='grabbing';canvas.focus({preventScroll:true});});
 canvas.addEventListener('pointermove',e=>{pointer(e);if(drag){ty+=(e.clientX-drag.x)*.009;tx+=(e.clientY-drag.y)*.009;drag={x:e.clientX,y:e.clientY};}});
 function end(){drag=null;canvas.style.cursor='grab';}canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',()=>{end();hover=false;});canvas.addEventListener('lostpointercapture',end);canvas.addEventListener('pointerleave',()=>{hover=false;});
 canvas.addEventListener('wheel',e=>{e.preventDefault();tzoom=clamp(tzoom*Math.exp(-e.deltaY*.001),.55,2.4);},{passive:false});
 canvas.addEventListener('keydown',e=>{const key=e.key.toLowerCase();if(!['r','home','arrowleft','arrowright','arrowup','arrowdown','+','-','='].includes(key))return;e.preventDefault();e.stopPropagation();if(key==='r'||key==='home')reset();else if(key==='arrowleft')ty-=.22;else if(key==='arrowright')ty+=.22;else if(key==='arrowup')tx-=.22;else if(key==='arrowdown')tx+=.22;else tzoom=clamp(tzoom*(key==='-'?.85:1.15),.55,2.4);});canvas.addEventListener('dblclick',reset);
 new ResizeObserver(()=>{if(dialog.open)resize();}).observe(host);
 new MutationObserver(()=>{if(dialog.open)start();}).observe(dialog,{attributes:true,attributeFilter:['open']});
 dialog.addEventListener('close',()=>{cancelAnimationFrame(raf);raf=0;hover=false;drag=null;reset();canvas.remove();hint.remove();const source=host.querySelector('canvas');if(source)source.style.visibility='';});
})();
