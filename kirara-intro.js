(()=>{
 const it=document.getElementById('kr-intro');if(!it)return;
 const cv=it.querySelector('canvas'),g=cv.getContext('2d'),$=id=>document.getElementById(id);
 const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
 document.documentElement.classList.add('kr-lock');
 const COL=['#00e5e0','#ff2fd0','#5dffb8','#ff8a1f','#00e5e0','#ffffff'];
 const SPEC=String(Math.floor(Math.random()*900+100));
 let W=0,H=0,R=1,cx=0,cy=0,mx=-1e4,my=-1e4,t0=performance.now(),last=t0,exitT=0,alive=true;
 const fit=()=>{const d=Math.min(devicePixelRatio||1,2);W=innerWidth;H=innerHeight;cv.width=W*d;cv.height=H*d;g.setTransform(d,0,0,d,0,0);R=Math.min(W,H)*(W<700?.4:.34);cx=W/2;cy=H/2};
 fit();addEventListener('resize',fit);
 it.addEventListener('pointermove',e=>{mx=e.clientX;my=e.clientY});
 it.addEventListener('pointerleave',()=>{mx=my=-1e4});
 /* targets on the 6-arm asterisk */
 const TG=[];for(let a=0;a<3;a++){const an=a*Math.PI/3;for(let s=-1;s<=1.0001;s+=.034)for(let w=-1;w<=1;w+=.5){TG.push([Math.cos(an)*s*.86-Math.sin(an)*w*.11,Math.sin(an)*s*.86+Math.cos(an)*w*.11])}}
 const N=Math.min(TG.length,W<700?330:480);
 for(let i=TG.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[TG[i],TG[j]]=[TG[j],TG[i]]}
 const P=Array.from({length:N},(_,i)=>{const a=Math.random()*7,r=Math.sqrt(Math.random())*.92;return{x:Math.cos(a)*r,y:Math.sin(a)*r,vx:0,vy:0,c:COL[i%COL.length],s:.6+Math.random()*1.6,ph:Math.random()*7,tg:TG[i],hit:0}});
 const sm=(a,b,x)=>{x=Math.max(0,Math.min(1,(x-a)/(b-a)));return x*x*(3-2*x)};
 const M={PFC:0,AMY:0,ACC:0,INS:0},MT={PFC:.62,AMY:.81,ACC:.47,INS:.73};
 const LOG=[['loading emotion fragments','06'],['calibrating optical lens','OK'],['reading brain response','LIVE'],['synthesizing structure','...']];
 const bar=v=>'█'.repeat(Math.round(v*10))+'░'.repeat(10-Math.round(v*10));
 const skip=()=>{if(!exitT&&performance.now()-t0>400)exitT=performance.now()};
 it.addEventListener('pointerdown',e=>{e.preventDefault();skip()});
 const onKey=e=>{if(e.key==='Escape'){e.preventDefault();skip()}};
 addEventListener('keydown',onKey);
 const finish=()=>{if(!alive)return;alive=false;removeEventListener('resize',fit);removeEventListener('keydown',onKey);it.remove();document.documentElement.classList.remove('kr-lock')};
 let fired=false;
 const T_SYN=2.3,T_DONE=3.5,T_EXIT=3.9,IRIS=1.5;
 function frame(now){if(!alive)return;
  const dt=Math.min(.05,(now-last)/1000);last=now;
  let T=RM?T_EXIT:(now-t0)/1000;if(exitT)T=Math.max(T,T_EXIT);
  if(!exitT&&T>=T_EXIT)exitT=now;
  const iris=exitT?Math.min(1,(now-exitT)/1000/IRIS):0;
  if(exitT&&!fired){fired=true;it.classList.add('kr-done');document.documentElement.classList.remove('kr-lock');window.dispatchEvent(new CustomEvent('kirara:enter'))}
  if(RM||iris>=1){finish();return}
  const boot=sm(0,.8,T),syn=sm(T_SYN,T_DONE-.2,T),done=sm(T_DONE-.15,T_DONE+.1,T);
  /* --- physics --- */
  for(const p of P){
   if(exitT){if(!p.out){p.out=1;const a=Math.atan2(p.y,p.x)+(Math.random()-.5)*.8,v=.006+Math.random()*.02;p.vx=Math.cos(a)*v;p.vy=Math.sin(a)*v;p.rs=.97+Math.random()*.02}
    p.vx*=p.rs;p.vy*=p.rs;p.vx+=Math.sin(T*2+p.ph)*.0004;p.vy+=Math.cos(T*2+p.ph)*.0004}
   else if(syn<.001){p.vx+=(Math.random()-.5)*.004+Math.sin(T*1.3+p.ph)*.0006;p.vy+=(Math.random()-.5)*.004+Math.cos(T*1.1+p.ph)*.0006;
    const r=Math.hypot(p.x,p.y);if(r>.9){p.vx-=p.x*.004;p.vy-=p.y*.004}p.vx*=.95;p.vy*=.95}
   else{const k=.04+.22*syn;p.vx+=(p.tg[0]-p.x)*k*.25;p.vy+=(p.tg[1]-p.y)*k*.25;p.vx*=.78;p.vy*=.78}
   const dx=p.x-(mx-cx)/R,dy=p.y-(my-cy)/R,d=Math.hypot(dx,dy);
   if(d<.22&&!exitT){const f=(1-d/.22)*.012*(1-syn*.7);p.vx+=dx/(d||1)*f;p.vy+=dy/(d||1)*f}
   p.x+=p.vx;p.y+=p.vy;p.hit*=.9}
  /* --- draw --- */
  const bg=1-sm(.05,.85,iris),pf=1-sm(.1,.75,iris),col=0,zoom=1;
  g.clearRect(0,0,W,H);g.fillStyle=`rgba(0,0,0,${bg})`;g.fillRect(0,0,W,H);
  g.save();g.translate(cx,cy);
  // specimen dish
  g.globalAlpha=boot*(1-sm(0,.4,iris));g.strokeStyle='rgba(255,255,255,.22)';g.lineWidth=1;
  g.beginPath();g.arc(0,0,R,-Math.PI/2,-Math.PI/2+Math.PI*2*boot);g.stroke();
  // scan line
  let sy=null;if(T>.8&&T<T_DONE){sy=(((T-.8)*.75)%1)*2-1;const y=sy*R,hw=Math.sqrt(Math.max(0,1-sy*sy))*R;
   const gr=g.createLinearGradient(0,y-26,0,y+2);gr.addColorStop(0,'rgba(0,229,224,0)');gr.addColorStop(1,'rgba(0,229,224,.28)');g.fillStyle=gr;g.fillRect(-hw,y-26,hw*2,28);
   g.strokeStyle='rgba(0,229,224,.9)';g.beginPath();g.moveTo(-hw,y);g.lineTo(hw,y);g.stroke()}
  // particles
  g.globalCompositeOperation='lighter';
  const gl=done>0&&done<1?(1-Math.abs(done*2-1))*6:0;
  for(const p of P){if(sy!=null&&Math.abs(p.y-sy)<.03)p.hit=1;
   const tw=.55+.45*Math.sin(T*3+p.ph),a=(.35+.65*Math.max(syn,tw*.6+p.hit*.6))*boot*pf;
   const r=(p.s*(1+p.hit*1.2)+syn*1.3)*(W<700?.85:1);
   g.globalAlpha=Math.min(1,a);g.fillStyle=p.c;
   const px=p.x*R*zoom,py=p.y*R*zoom;
   g.beginPath();g.arc(px+(gl?(Math.random()-.5)*gl:0),py,r*(1-col*.5),0,7);g.fill();
   if(syn>.6&&p.c!=='#ffffff'&&!col){g.globalAlpha=(syn-.6)*.5;g.beginPath();g.arc(px,py,r*3,0,7);g.fill()}}
  g.globalCompositeOperation='source-over';g.globalAlpha=1;
  // connection lines while synthesizing
  if(syn>.15){g.strokeStyle=`rgba(255,255,255,${.12*syn*(1-sm(0,.3,iris))})`;g.beginPath();for(let i=0;i<P.length;i+=7){const a=P[i],b=P[(i*13+5)%P.length];g.moveTo(a.x*R*zoom,a.y*R*zoom);g.lineTo(b.x*R*zoom,b.y*R*zoom)}g.stroke()}
  g.restore();
  requestAnimationFrame(frame)}
 requestAnimationFrame(t=>{it.style.background='transparent';frame(t)});
})();
