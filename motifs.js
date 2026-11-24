"use strict";

// Each row records the vertical bounds and horizontal separators between
// motifs on the supplied sheet. Different rows have different column widths.
const motifSheets={
  E01:{file:"lostness",rows:[
    [16,209,[15,237,392,530,660,763,880,1000]],
    [216,329,[29,183,324,452,589,729,863,985]],
    [336,439,[30,143,296,436,564,722,851,989]],
    [449,495,[29,183,343,521,677,815,991]],
    [503,644,[16,195,322,431,571,717,861,996]]
  ]},
  E02:{file:"overload",rows:[
    [42,205,[12,193,392,580,770,952]],
    [210,368,[12,193,392,580,770,952]],
    [374,528,[12,193,392,580,770,952]],
    [531,701,[12,193,392,580,770,952]]
  ]},
  E03:{file:"excitement",rows:[
    [48,213,[18,185,337,494,650,806,964]],
    [216,382,[18,185,337,494,650,806,964]],
    [386,525,[18,185,337,494,650,806,964]],
    [530,680,[18,185,337,494,650,806,964]]
  ]},
  E04:{file:"liberation",rows:[
    [16,225,[32,244,391,544,698,851,961,1064]],
    [229,335,[31,138,240,343,450,550,651,757,852,964,1060]],
    [358,402,[35,184,343,482,636,777,929,1059]],
    [420,530,[39,88,153,219,321,373,443,541,641,774,920,1062]],
    [552,679,[33,158,278,432,682,885,1063]]
  ]},
  E05:{file:"affection",rows:[
    [16,269,[23,294,465,643,792,930,1068]],
    [297,368,[25,106,196,291,374,473,518,553,608,688,771,911,1070]],
    [398,517,[27,206,400,565,735,833,913,1067]],
    [536,695,[18,162,327,502,641,834,1072]]
  ]},
  E06:{file:"pride",rows:[
    [20,211,[36,249,407,563,711,826,936,1067]],
    [214,312,[45,166,302,448,571,699,833,960,1074]],
    [322,441,[14,372,609,870,1082]],
    [446,527,[25,204,393,579,783,903,983,1084]],
    [535,694,[14,215,379,545,638,819,1093]]
  ]}
};

function prepareMotifs(image,rows){
  const sheet=document.createElement("canvas");
  sheet.width=image.naturalWidth;
  sheet.height=image.naturalHeight;
  const source=sheet.getContext("2d",{willReadFrequently:true});
  source.drawImage(image,0,0);
  const grouped=rows.map(([top,bottom,edges])=>edges.slice(1).map((right,index)=>{
    const left=edges[index];
    return extractMotif(source.getImageData(left,top,right-left,bottom-top));
  }));
  // Alternate rows so early clicks reveal different kinds of geometry.
  const motifs=[];
  const columns=Math.max(...grouped.map(row=>row.length));
  for(let column=0;column<columns;column++){
    for(const row of grouped)if(row[column])motifs.push(row[column]);
  }
  return motifs;
}

function removeBlackMatte(data,offset) {
  const peak=Math.max(data[offset],data[offset+1],data[offset+2]);
  if(peak<=5 || data[offset+3]===0){
    data.fill(0,offset,offset+4);
    return 0;
  }
  const strength=peak/255;
  // Suppress near-black background noise, then carry the light level in
  // alpha so the recovered colors can be placed over any other fragment.
  const coverage=Math.min(1,(peak-5)/13);
  const alpha=Math.round(data[offset+3]*strength*coverage);
  if(!alpha){
    data.fill(0,offset,offset+4);
    return 0;
  }
  data[offset]/=strength;
  data[offset+1]/=strength;
  data[offset+2]/=strength;
  data[offset+3]=alpha;
  return alpha;
}

function extractMotif(pixels) {
  const {data,width,height}=pixels;
  let left=width,right=-1,top=height,bottom=-1,peak=0;
  for(let y=0;y<height;y++){
    for(let x=0;x<width;x++){
      const i=(y*width+x)*4;
      const alpha=removeBlackMatte(data,i);
      if(!alpha)continue;
      left=Math.min(left,x);right=Math.max(right,x);
      top=Math.min(top,y);bottom=Math.max(bottom,y);
      peak=Math.max(peak,alpha/255);
    }
  }
  if(right<left)return null;
  left=Math.max(0,left-2);top=Math.max(0,top-2);
  right=Math.min(width-1,right+2);bottom=Math.min(height-1,bottom+2);
  const texture=document.createElement("canvas"),gray=document.createElement("canvas");
  texture.width=gray.width=right-left+1;
  texture.height=gray.height=bottom-top+1;
  const pen=texture.getContext("2d"),mono=gray.getContext("2d");
  pen.putImageData(pixels,-left,-top,left,top,texture.width,texture.height);
  for(let i=0;i<data.length;i+=4){
    if(data[i+3])data[i]=data[i+1]=data[i+2]=255;
  }
  mono.putImageData(pixels,-left,-top,left,top,gray.width,gray.height);
  return {texture,gray,peak};
}

function drawMotif(pen,texture,size,dx=0,dy=0) {
  const scale=size/Math.max(texture.width,texture.height);
  const width=texture.width*scale,height=texture.height*scale;
  pen.drawImage(texture,-width/2+dx,-height/2+dy,width,height);
}
