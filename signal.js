"use strict";

function fragmentSignalRandom(seed) {
  return () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

// Apply the source lab's row displacement to the assembled cell, keeping its
// actual fragments, mix measurements and input positions independent.
function paintFragmentSignal(pen, snapshot, x, y, amount, now, color) {
  const width=snapshot.width,height=snapshot.height;
  if(width<2||height<2)return;
  const px=width*x,py=height*y;
  const range=height*(.18+amount*.22);
  const rows=Math.max(20,Math.min(104,Math.ceil(height/5)));
  const rowSize=height/rows;
  const random=fragmentSignalRandom(Math.floor(now/69)*2731+37);
  pen.save();
  pen.clearRect(0,0,width,height);
  for(let index=0;index<rows;index++){
    const top=index*rowSize;
    const envelope=1/(1+((top-py)/range)**2*5);
    const wave=Math.sin(index/rows*36-now*.015)*.56+Math.sin(index/rows*101+now*.029)*.36;
    const shift=(wave+(random()-.5)*.56)*width*.177*amount*envelope;
    pen.drawImage(snapshot,0,top,width,rowSize,shift,top,width,rowSize);
  }
  for(let i=0;i<7;i++){
    const top=Math.max(0,Math.min(height-1,py+(random()-.5)*range*2));
    const left=Math.max(0,Math.min(width-1,px+(random()-.63)*width*.65));
    const length=Math.min(width-left,(.12+random()*.46)*width);
    const shift=(random()-.5)*width*.19*amount;
    const bandHeight=Math.min(height-top,1+random()**2*(3+amount*7));
    pen.globalAlpha=amount*(i%3===0?.52:.33);
    pen.drawImage(snapshot,left,top,length,bandHeight,left+shift,top,length,bandHeight);
    pen.fillStyle=color?(i%3===0?"#69def0":"#e92aab"):"#ddd";
    pen.fillRect(left+shift,top,length*.64,Math.min(1.35,bandHeight));
  }
  pen.globalAlpha=amount*.35;
  pen.lineWidth=.75;
  pen.strokeStyle="#e8eae6";
  pen.setLineDash([2,5]);
  pen.beginPath();
  pen.moveTo(0,py);pen.lineTo(width,py);
  pen.moveTo(px,0);pen.lineTo(px,height);
  pen.stroke();
  pen.restore();
}

function scanMotion(impacts, elapsed, duration) {
  let index = impacts.length - 1;
  while (index >= 0 && impacts[index].offset > elapsed) index--;
  const last = impacts[index];
  const delay = last ? elapsed - last.offset : Infinity;
  const pulse = last ? Math.exp(-delay * 38) * (last.strong ? 1 : .66) : 0;
  const progress = Math.min(1, Math.max(0, elapsed / duration + pulse * .026));
  return {progress, pulse, index};
}

function paintScanSweep(pen,width,height,progress,pulse=0) {
  const y=height*progress;
  const span=Math.max(12,height*(.12+pulse*.08));
  const fade=pen.createLinearGradient(0,y-span,0,y+span*.35);
  fade.addColorStop(0,"rgba(76,201,211,0)");
  fade.addColorStop(.73,`rgba(118,237,232,${.22+pulse*.23})`);
  fade.addColorStop(.77,"rgba(143,246,241,.09)");
  fade.addColorStop(1,"rgba(76,201,211,0)");
  pen.save();
  pen.fillStyle=fade;
  pen.fillRect(0,y-span,width,span*1.35);
  pen.strokeStyle="#adfff1";
  pen.lineWidth=Math.max(1,Math.min(2,width/280))+pulse*1.65;
  pen.shadowColor="#9bfff0";
  pen.shadowBlur=pulse*15;
  pen.beginPath();
  pen.moveTo(0,y);pen.lineTo(width,y);pen.stroke();
  pen.shadowBlur=0;
  pen.strokeStyle=`rgba(162,255,239,${.45+pulse*.35})`;
  pen.lineWidth=1;
  for(let x=6;x<width;x+=Math.max(8,width/24)){
    pen.beginPath();
    pen.moveTo(x,y-5);pen.lineTo(x,y+3);pen.stroke();
  }
  pen.restore();
}

function paintScopeInterference(pen,width,height,now,amount,color) {
  if(amount<.05)return;
  const random=fragmentSignalRandom(Math.floor(now/89)*541+21);
  pen.save();
  for(let i=0;i<6;i++){
    const x=random()*width*.83,y=random()*height;
    pen.globalAlpha=amount*(i%2===0?.42:.19);
    pen.fillStyle=i%2===0?color:"#a3e7ff";
    pen.fillRect(x,y,Math.min(width-x,(.08+random()*.3)*width),i%3===0?2.5:1);
  }
  pen.restore();
}
