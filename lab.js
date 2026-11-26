"use strict";

const $ = selector => document.querySelector(selector);
const clamp = value => Math.max(0,Math.min(1,value));
const tau = Math.PI * 2;
const motion = matchMedia("(prefers-reduced-motion: reduce)");
const canvas = $("#float-field");
const scope = $("#scope");
const signalToggle = $("#signal-toggle");
const signalDelta = $("#signal-delta");
const resultDialog = $("#result-dialog");
const resultArtworkPreview = $("#result-artwork-preview");
const resultArtwork = document.createElement("canvas");
const resultArtworkPen = resultArtwork.getContext("2d");
const eScanOverlay = $("#e-scan-overlay");
const eScanPen = eScanOverlay.getContext("2d");
const resultMapPreview = $("#result-map-preview");
const saveResultPng = $("#save-result-png");
const exportStatus = $("#result-export-status");
let introActive=true;
const audio=new FragmentAudio();

let audioBusy=false;
const replayDuration = 2700;
const scanDuration = replayDuration/1000;

let intenseSignal=false;
let warningSound=null;
let labOpenedAt=null;
const scanButton=$("#scan-action");
const runButton=$("#run");
const scanProgress=$("#scan-progress");
const scanBar=$("#scan-progress-bar");
const scanValue=$("#scan-progress-value");
const scanMap=$("#scan-map");
const runDetails=$("#run-details-scroll");
const scanMapPen=scanMap.getContext("2d");
const brainPanel=$(".brain");
const scanProbe=document.createElement("canvas");
scanProbe.width=72;
scanProbe.height=1;
const scanProbePen=scanProbe.getContext("2d",{willReadFrequently:true});
const frameCopy = document.createElement("canvas");
const frameCopyPen = frameCopy.getContext("2d");
const field = canvas.getContext("2d");
const signal = scope.getContext("2d");
const samples = [
  {id:"E01",en:"Emotional Lostness",ko:"정서적 미아",color:"#48dae9",pulse:.39},
  {id:"E02",en:"Overload",ko:"과부하",color:"#ff7482",pulse:.81},
  {id:"E03",en:"Glitched Excitement",ko:"고장난 설렘",color:"#f767df",pulse:.95},
  {id:"E04",en:"Chain Liberation",ko:"연쇄적 해방감",color:"#cdf677",pulse:.68},
  {id:"E05",en:"Unpaid Affection",ko:"무급 애정",color:"#70f5df",pulse:.57},
  {id:"E06",en:"Overheated Pride",ko:"과열된 자존심",color:"#fa7e61",pulse:.74}
];
// These settings describe the compositions' visual character.
const sourceTone={E01:-.55,E02:-.84,E03:.2,E04:.92,E05:.62,E06:-.28};
let scopeColor="#849087";
let scopeEnergy=0;
let scopeCharge=0;
const stage = $("#stage");
const menu = $("#emotions");
const canvasPointer={x:.5,y:.5,currentX:.5,currentY:.5,time:0,hot:false,tappedUntil:0};
const cellPointer={slot:null,x:.5,y:.5,speed:0,time:0};
let glitchEnabled=!motion.matches;
let frameCount=0;
let frameStarted=performance.now();
const dustRandom=fragmentSignalRandom(9703);
const dust=Array.from({length:36},()=>[dustRandom(),dustRandom(),dustRandom(),dustRandom()]);
const cells = new Map([...document.querySelectorAll("[data-slot]")].map(button=>[
  button.dataset.slot,{button,canvas:button.querySelector("canvas"),pen:button.querySelector("canvas").getContext("2d"),layers:[],history:[],next:0,charge:0,hitX:.5,hitY:.5}
]));
const cellNotes=new Map([...document.querySelectorAll("[data-cell-note]")].map(node=>[
  node.dataset.cellNote,{node,title:node.querySelector("strong"),body:node.querySelector("small")}
]));
const meters=["pfc","amy","acc","ins"].map(id=>[$("#meter-"+id),$("#value-"+id)]);
const readings=[0,0,0,0];
let targets=[0,0,0,0];
let selected="A";
let language="en";
try { if(localStorage.getItem("kirara-fragments-language")==="ko")language="ko"; } catch {}
// Result report: two-column layout based on the supplied SVG.
const reportStyle=document.createElement("style");
reportStyle.textContent=`
#result-dialog{box-sizing:border-box;width:min(82vw,1120px);max-width:calc(100vw - 24px);max-height:84dvh;margin:auto;padding:16px;position:fixed;inset:0;border:1px solid #777;background:#000;color:#eee;overflow:auto}
#result-dialog .result-body{display:grid;grid-template-columns:minmax(0,38%) minmax(0,1fr);gap:14px;align-items:start}
#result-dialog .result-report-reading{display:flex;flex-direction:column;gap:9px;padding-right:14px;border-right:1px solid #666;min-width:0}
#result-dialog .result-report-header{gap:8px;padding:4px 4px 14px;border-bottom:1px solid #777}
#result-dialog .result-report-header>p:first-child{font-size:clamp(12px,1.1vw,20px);padding:0}
#result-dialog #result-title{font-size:clamp(18px,1.6vw,25px);line-height:1.35}
#result-dialog #result-feelings{font-size:clamp(12px,1vw,17px);color:#ddd}
#result-dialog .result-scan-data{grid-template-columns:minmax(0,55%) minmax(0,1fr);gap:12px}
#result-dialog #result-map-preview canvas{height:clamp(76px,12dvh,115px);display:block;object-fit:contain}
#result-dialog .result-scan-data dl{font-size:clamp(11px,.85vw,14px)}
#result-dialog .result-interpretation{min-width:0;display:grid;gap:5px}
#result-dialog .result-interpretation p{line-height:1.45;margin:0}
#result-dialog .result-report-actions{margin-top:auto;gap:12px;padding-top:6px}
#result-dialog .result-report-actions button,#result-dialog .result-close button{border:1px solid #777;color:#eee;background:#000;border-radius:0;padding:7px 10px;min-height:32px}
#result-dialog .result-report-actions button:hover,#result-dialog .result-close button:hover{color:#00dedd;border-color:#00dedd}
#result-dialog .result-report-plate{display:flex;flex-direction:column;gap:8px;min-width:0;padding:0;border:0}
#result-dialog .result-artwork{display:flex;flex-direction:column;flex:1;min-height:0;margin:0;padding:0}
#result-dialog .result-artwork figcaption{width:max-content;max-width:calc(100% - 78px);border:1px solid #777;border-bottom:0;padding:10px;box-sizing:border-box;font-size:clamp(12px,.95vw,15px)}
#result-dialog #result-artwork-preview{position:relative;flex:none;height:clamp(220px,40dvh,400px);min-height:0;border:1px solid #777;display:grid;place-items:center;overflow:hidden}
#result-dialog #result-artwork-preview canvas{width:100%;height:100%;max-height:100%;object-fit:contain;filter:none;display:block}
#result-dialog .result-signals{margin:0;padding:0 3px;gap:5px}
#result-dialog .result-signals>div{grid-template-columns:minmax(0,35%) minmax(0,1fr);gap:8px;font-size:clamp(10px,.85vw,13px)}
#result-dialog .result-signals dd{margin:0;grid-template-columns:minmax(0,1fr) 4.5ch;gap:10px}
#result-dialog .result-signals output{grid-column:2;grid-row:1;text-align:right}
#result-dialog .result-signals meter{grid-column:1;grid-row:1;height:10px}
#result-dialog .result-signals meter::-webkit-meter-bar{height:10px}
#result-dialog .result-signals meter::-webkit-meter-optimum-value{background:#fff}
#result-dialog .result-close{top:16px;right:16px}
#result-dialog #result-music-recommendation{font-size:.82rem}
#result-dialog #result-music-recommendation [data-player]:empty{display:none}
@media(min-width:760px) and (min-height:560px){#result-dialog .result-report-reading{max-height:calc(84dvh - 34px);overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:#555 #000}#result-dialog .result-report-actions{margin-top:4px} }
@media(max-width:759px){#result-dialog{width:calc(100vw - 24px);max-height:90dvh;padding:12px}#result-dialog .result-close{top:12px;right:12px}#result-dialog .result-body{grid-template-columns:minmax(0,1fr)}#result-dialog .result-report-reading{border:0;padding:0}#result-dialog .result-report-header>p:first-child{padding-right:72px}#result-dialog .result-report-plate{border-top:1px solid #777;padding-top:12px}#result-dialog #result-artwork-preview{height:clamp(220px,36dvh,350px);min-height:0}#result-dialog .result-signals>div{grid-template-columns:minmax(0,44%) minmax(0,1fr)}}
`;
document.head.append(reportStyle);
const reportCaption=$("#result-artwork-title");
reportCaption.textContent="EMOTION LAB : experiment result";
reportCaption.dataset.ko="감정 실험실 : 실험 결과";
const reportSave=$("#save-result-png");
reportSave.textContent="SAVE PNG";reportSave.dataset.ko="PNG 저장";
const reportExport=document.createElement("button");
reportExport.type="button";reportExport.textContent="EXPORT";reportExport.dataset.ko="보고서 내보내기";
$(".result-report-actions").append(reportExport);
reportExport.addEventListener("click",()=>{
 const fields=["#result-title","#result-cell","#result-feelings","#result-description","#result-evidence","#result-sources"];
 const text=["EMOTION LAB : experiment result",...fields.map(sel=>$(sel).innerText),...Array.from(document.querySelectorAll(".result-signals>div"),row=>row.querySelector("dt").textContent+" : "+row.querySelector("output").textContent),$("#result-music-recommendation")?.innerText||"",$(".result-footnote").textContent].join("\n\n");
 const url=URL.createObjectURL(new Blob([text],{type:"text/plain;charset=utf-8"}));const a=document.createElement("a");a.href=url;a.download="kirara-emotion-report.txt";resultDialog.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
});
const defaultCopy=new Map([...document.querySelectorAll("[data-ko]")].map(node=>[node,node.textContent]));
const floating = [
  [2,0,.13,.17,62],[3,1,.59,.32,51],[1,0,.75,.42,47],
  [0,0,.94,.18,37],[4,0,.75,.77,42],[5,0,.42,.86,83]
];
const strings={
  terminalLoading:["Preparing the lab","실험실 입장 준비"],
  terminalOpening:["Terminal opening","터미널 인트로"],
  loading:["SOURCE FRAGMENTS / LOADING","원본 조각 / 불러오는 중"],
  partial:["SOME FRAGMENTS COULD NOT LOAD","일부 조각을 불러오지 못했어요"],
  loaded:["SOURCE FRAGMENTS / READY","원본 조각 / 준비 완료"],
  glitchOn:["GLITCH ON","글리치 켜짐"],
  glitchOff:["GLITCH OFF","글리치 꺼짐"],
  select:["CELL {0} SELECTED","{0} 칸 선택"],
  added:["{0} ADDED TO CELL {1}","{1} 칸에 {0} 추가"],
  limit:["CELL {0} IS FULL (18 FRAGMENTS)","{0} 칸이 가득 찼어요 (최대 18개)"],
  undone:["LAST EDIT UNDONE IN CELL {0}","{0} 칸의 마지막 편집 취소"],
  cleared:["CELL {0} CLEARED","{0} 칸 비우기 완료"],
  replay:["CELL {0} / SCANNING COMPOSITION","{0} 칸 / 조합 스캔 중"],
  scanCaption:["MRI-STYLE COMPOSITION SCAN","MRI 스타일 조합 스캔"],
  scanActive:["SCANNING…","스캔 중…"],
  scopeIdle:["SIGNAL / IDLE","신호 / 대기"],
  scopeMixed:["SIGNAL / MIXED","신호 / 혼합"],
  scopeOpen:["SIGNAL / OPEN","신호 / 개방"],
  scopeIntense:["SIGNAL / INTENSE","신호 / 강렬"],
  scopeTense:["SIGNAL / TENSE","신호 / 긴장"],
  scanComplete:["CELL {0} / BRIGHTNESS MAP READY","{0} 칸 / 밝기 지도 작성 완료"],
  scanHint:["Scan the artwork and show its brightness map","그림을 스캔하고 밝기 지도를 표시해요"],
  runHint:["Scan the composition and open its emotional interpretation","조합을 스캔하고 감정 해석을 열어요"],
  resultReady:["CELL {0} / EMOTION RESULT READY","{0} 칸 / 감정 결과 준비 완료"],
  runReading:["READING MIX…","조합 해석 중…"],
  resultArtwork:["Emotion graphic made in cell {0}","{0} 칸에서 만든 감정 그래픽"],
  resultExportError:["PNG export failed. Try again.","PNG를 저장하지 못했어요. 다시 시도해 주세요."],
  resultCell:["CELL {0} · FRAGMENTS {1}","{0} 칸 · 조각 {1}개"],
  resultWeight:["×{0} · {1}%","×{0} · {1}%"],
  mixEven:["{0} meets {1}, with both feelings carrying similar weight.","{0}, 그리고 {1}. 두 결이 비슷한 비중으로 느껴져요."],
  mixLead:["{0} sets the tone, with {1} felt underneath.","{0} 쪽으로 기울어 있고, 그 아래에 {1}의 결도 느껴져요."],
  overlapStrong:["The different sources overlap closely (overlap {0}%), so their impressions are tightly intertwined.","서로 다른 조각이 많이 포개져(겹침 {0}%) 두 인상이 한곳에서 뒤섞이듯 읽혔어요."],
  overlapLight:["The sources have relatively distinct outlines (overlap {0}%), leaving room for each impression to be felt separately.","서로 다른 조각의 윤곽이 비교적 따로 보여(겹침 {0}%) 각 인상이 번갈아 느껴질 여지가 있어요."],
  singleSource:["The cell contains one emotion source, so the reading follows its main impression.","한 가지 감정의 조각으로 채운 칸이라 그 감정의 인상을 중심으로 읽었어요."],
  mix:["CELL {0} / TYPES {1} · FRAGMENTS {2}","{0} 칸 / 감정 {1}종 · 조각 {2}개"],
  empty:["CELL {0} / EMPTY","{0} 칸 / 비어 있음"],
  cell:["Cell {0}, fragments: {1}","{0} 칸, 조각 {1}개"],
  activeCell:["CELL {0} / ACTIVE","{0} 칸 / 선택됨"],
  emptyCell:["CELL {0} / EMPTY","{0} 칸 / 비어 있음"],
  storedCell:["CELL {0} / MIX","{0} 칸 / 조합"],
  emptyActive:["Choose an emotion to start.","감정을 눌러 첫 조각을 넣으세요."],
  emptyInactive:["Select to start a mix.","선택해서 새 조합을 시작하세요."],
  moreSources:["+{0} more","외 {0}종"]
};
let message=["loading"];
const startTime=performance.now();
let replay=null;
let ready=false;
let dirtyScope=true;
let lastMeter=0;
let lastFrame=0;

function t(key,...values){
  return strings[key][language==="ko"?1:0].replace(/\{(\d+)\}/g,(_,i)=>values[i]);
}

function playCurrentScene() {
  if(document.hidden||!audio.playing)return;
  if(replay)audio.startScan(replay.mode,(performance.now()-replay.time)/1000);
}



function cancelPlayback() {
  if(!replay)return;
  replay=null;
  eScanPen.clearRect(0,0,eScanOverlay.width,eScanOverlay.height);
  document.documentElement.classList.remove("scan-active");
  brainPanel.style.removeProperty("--coil-pulse");
  brainPanel.style.removeProperty("--coil-shift");
  audio.stopScene();
}

function notify(key,...values){
  message=[key,...values];
  $("#console-state").textContent=t(key,...values.map(value=>value?.id?value[language]:value));
}

function makeMenu(){
  for(const sample of samples){
    const button=document.createElement("button");
    button.className="emotion";
    button.type="button";
    button.style.setProperty("--emotion",sample.color);
    const id=document.createElement("span");
    id.className="id";
    id.textContent=sample.id;
    const name=document.createElement("span");
    const translation=document.createElement("small");
    button.append(id,name,translation);
    button.addEventListener("click",()=>addFragment(sample));
    menu.append(button);
    sample.button=button;
    sample.name=name;
    sample.translation=translation;
  }
}

function applyLanguage(){
  document.documentElement.lang=language;
  for(const [node,english] of defaultCopy)node.textContent=language==="ko"?node.dataset.ko:english;
  for(const button of document.querySelectorAll("[data-lang]"))button.setAttribute("aria-pressed",String(button.dataset.lang===language));
  for(const sample of samples){
    sample.name.textContent=sample[language];
    sample.translation.textContent=sample[language==="en"?"ko":"en"];
    sample.translation.lang=language==="en"?"ko":"en";
  }
  notify(...message);
  sync();
}

function scaledCanvas(target,element=target){
  const {width,height}=element.getBoundingClientRect();
  const scale=Math.min(window.devicePixelRatio||1,1.65);
  target.width=Math.max(1,Math.round(width*scale));
  target.height=Math.max(1,Math.round(height*scale));
}

function size(){
  scaledCanvas(canvas,stage);
  for(const cell of cells.values())scaledCanvas(cell.canvas);
  scaledCanvas(eScanOverlay);
}

async function prepareSamples(){
  const deadline=new Promise(resolve=>{
    setTimeout(()=>{
      ready=true;
      resolve();
    },650);
  });
  const loads=samples.map(async sample=>{
    const {textures, missing}=await loadMotifs(sample.id);
    sample.textures=textures;
    sample.nextTexture=0;
    sample.loadedAt=performance.now();
    sample.button.disabled=false;
    return missing;
  });
  const [results]=await Promise.all([Promise.allSettled(loads),deadline]);
  if(message[0]==="loading")notify(results.some(result=>result.status==="rejected" || result.value>0)?"partial":"loaded");
  sync();
}

function remember(cell){
  cell.history.push({layers:cell.layers,next:cell.next});
  if(cell.history.length>40)cell.history.shift();
}

function addFragment(sample){
  if(!sample.textures?.length)return;
  const cell=cells.get(selected);
  if(cell.layers.length>=18){notify("limit",selected);return;}
  remember(cell);
  const index=cell.next++;
  const angle=index*2.399963+.73;
  const radius=index===0?0:Math.min(.3,.128*Math.sqrt(index));
  const size=index===0?.8:.55+Math.sin(index*1.83)*.12;
  const texture=sample.textures[sample.nextTexture];
  sample.nextTexture=(sample.nextTexture+1)%sample.textures.length;
  cell.layers=[...cell.layers,{sample,texture,x:.5+Math.cos(angle)*radius,y:.5+Math.sin(angle)*radius*.82,
    size,angle:index?Math.sin(angle)*.49:0,born:performance.now()}];
  cancelPlayback();
  cell.charge=.44;
  scopeCharge=.72;
  cell.hitX=.5;
  cell.hitY=.5;
  notify("added",sample,selected);
  sync();
}

function undo(){
  const cell=cells.get(selected);
  const previous=cell.history.pop();
  if(!previous)return;
  cell.layers=previous.layers;
  cell.next=previous.next;
  cancelPlayback();
  notify("undone",selected);
  sync();
}

function clearCell(){
  const cell=cells.get(selected);
  if(!cell.layers.length)return;
  remember(cell);
  cell.layers=[];
  cell.next=0;
  cancelPlayback();
  notify("cleared",selected);
  sync();
}

function measure(layers){
  if(!layers.length)return [0,0,0,0];
  let mass=0,x=0,y=0,light=0,pulse=0,overlap=0,pairs=0;
  layers.forEach((layer,index)=>{
    const weight=layer.size*layer.size;
    mass+=weight;
    x+=layer.x*weight;
    y+=layer.y*weight;
    light+=layer.texture.peak*weight;
    pulse+=layer.sample.pulse*weight;
    for(const other of layers.slice(0,index)){
      const distance=Math.hypot(layer.x-other.x,layer.y-other.y);
      if(other.sample!==layer.sample)overlap+=clamp(1-distance/((layer.size+other.size)*.52));
      pairs++;
    }
  });
  return [
    clamp(1-Math.hypot(x/mass-.5,y/mass-.5)*2.3),
    clamp(1-Math.exp(-light*1.16)),
    pairs?clamp(overlap/pairs):0,
    clamp(pulse/mass)
  ];
}

function countSources(layers){
  const counts=new Map();
  for(const {sample} of layers)counts.set(sample,(counts.get(sample)??0)+1);
  return counts;
}

function syncCellNote(name,layers){
  const caption=cellNotes.get(name);
  if(!caption)return;
  const active=name===selected;
  const names=[...countSources(layers).keys()].map(sample=>sample[language]);
  const shown=names.slice(0,2);
  if(names.length>shown.length)shown.push(t("moreSources",names.length-shown.length));
  caption.node.dataset.active=String(active);
  caption.title.textContent=t(active?"activeCell":names.length?"storedCell":"emptyCell",name);
  caption.body.textContent=shown.length?shown.join(" · "):t(active?"emptyActive":"emptyInactive");
}

function syncRecipe(sources){
  const recipe=$("#recipe");
  const list=$("#recipe-list");
  recipe.hidden=!sources.size;
  list.replaceChildren();
  for(const [sample,count] of sources){
    const line=document.createElement("li");
    const label=document.createElement("span");
    const amount=document.createElement("output");
    label.textContent=sample[language];
    amount.textContent="×"+count;
    line.append(label,amount);
    list.append(line);
  }
}

function sync(){
  const chosen=cells.get(selected);
  $("#target").textContent=selected;
  $("#console-fragments").textContent=String(chosen.layers.length).padStart(2,"0");
  signalToggle.setAttribute("aria-pressed",String(glitchEnabled&&!motion.matches));
  signalToggle.disabled=motion.matches;
  signalToggle.textContent=t(glitchEnabled&&!motion.matches?"glitchOn":"glitchOff");
  for(const [name,cell] of cells){
    const count=cell.layers.length;
    cell.button.setAttribute("aria-pressed",String(name===selected));
    cell.button.setAttribute("aria-label",t("cell",name,count));
    cell.button.querySelector("output").textContent=count?String(count).padStart(2,"0"):"";
    syncCellNote(name,cell.layers);
  }
  const count=chosen.layers.length;
  const sources=countSources(chosen.layers);
  syncRecipe(sources);
  $("#undo").disabled=!chosen.history.length;
  $("#clear").disabled=!count;
  for(const button of [scanButton,runButton]){
    button.disabled=!count||Boolean(replay);
    const active=replay?.trigger===button;
    button.textContent=active?t("scanActive"):language==="ko"?button.dataset.ko:defaultCopy.get(button);
  }
  scanButton.setAttribute("title",t("scanHint"));
  runButton.setAttribute("title",t("runHint"));
  scanProgress.hidden=!replay;
  const record=chosen.scanRecord?.layers===chosen.layers?chosen.scanRecord:null;
  $("#scan-record").hidden=!record;
  if(record)renderScanRecord(record);
  scanBar.setAttribute("aria-label",t("scanCaption"));
  const caption=$("#scope-caption");
  caption.textContent=replay?t("scanCaption"):language==="ko"?caption.dataset.ko:defaultCopy.get(caption);
  const result=chosen.result?.layers===chosen.layers?chosen.result:null;
  $("#experiment-result").hidden=!result;
  if(result)renderExperiment(result);
  runDetails.tabIndex=count?0:-1;
  $("#mix-label").textContent=count?t("mix",selected,sources.size,count):t("empty",selected);
  $("#scan-cell-value").textContent=`(${selected})`;
  $("#scan-types-value").textContent=`(${sources.size})`;
  $("#scan-fragments-value").textContent=`(${count})`;
  targets=measure(chosen.layers);
  const mood=count?chosen.layers.reduce((sum,layer)=>sum+sourceTone[layer.sample.id],0)/count:0;
  const energy=scopeEnergy=clamp(targets[1]*.32+targets[2]*.27+targets[3]*.41);
  const nextIntenseSignal=intenseSignal?energy>.50:energy>=.58;
  if(nextIntenseSignal!==intenseSignal){
    intenseSignal=nextIntenseSignal;
    if(intenseSignal){
      const first=audio.cue("warning",{level:.75});
      const second=audio.cue("warning",{level:.75,delay:.78});
      // Stop after two bounded cues, even if a source is configured to loop.
      const start=audio.context?.currentTime;
      if(Number.isFinite(start)){
        first?.stop(start+.632);
        second?.stop(start+1.412);
      }
      warningSound={stop(){for(const source of [first,second]){try{source?.stop();}catch{}}}};
    }else{
      warningSound?.stop();
      warningSound=null;
    }
  }
  const tone=!count?"Idle":intenseSignal?"Intense":mood>.29?"Open":mood<-.24?"Tense":"Mixed";
  const colors={Idle:"#81908a",Mixed:"#cab6fc",Open:energy>.59?"#57f3ee":"#8ff7e0",Intense:"#ff557d",Tense:"#ef7db5"};
  scopeColor=colors[tone];
  brainPanel.dataset.tone=tone.toLowerCase();
  brainPanel.style.setProperty("--signal-color",scopeColor);
  $("#signal-tone").textContent=t("scope"+tone);
  dirtyScope=true;
}

function drawFloating(now){
  field.clearRect(0,0,canvas.width,canvas.height);
  if(!ready||labOpenedAt===null)return;
  const still=motion.matches;
  const seconds=still?0:Math.max(0,(now-labOpenedAt)/1000);
  const scale=Math.min(canvas.width/700,canvas.height/700);
  const reveal=canvasPointer.hot||now<canvasPointer.tappedUntil;
  const dx=still?0:(canvasPointer.currentX-.5)*26;
  const dy=still?0:(canvasPointer.currentY-.5)*21;
  for(const [i,[x,y,phase,weight]] of dust.entries()){
    const angle=phase*tau+i*2.399963;
    const speed=.008+weight*.017;
    const curl=seconds*(.11+phase*.12);
    const driftX=x+Math.cos(angle)*speed*seconds+.061*(Math.sin(angle+curl)-Math.sin(angle));
    const driftY=y+Math.sin(angle)*speed*seconds+.05*(Math.cos(angle*.7+curl)-Math.cos(angle*.7));
    const ux=driftX-Math.floor(driftX);
    const uy=driftY-Math.floor(driftY);
    const px=ux*canvas.width+dx*.45;
    const py=uy*canvas.height+dy*.45;
    const edge=clamp(Math.min(ux,uy,1-ux,1-uy)/.06);
    const proximity=reveal?clamp(1-Math.hypot(ux-canvasPointer.x,uy-canvasPointer.y)*6):0;
    field.globalAlpha=edge*(.08+weight*.14+proximity*.34);
    field.fillStyle=proximity>.42?(i%2?"#6cdbef":"#ec77cb"):"#eee";
    const size=i%9===0?2:1;
    field.fillRect(px,py,size,size);
  }
  field.globalAlpha=1;
  for(const [i,[sampleIndex,textureIndex,x,y,size]] of floating.entries()){
    const sample=samples[sampleIndex];
    const texture=sample.textures?.[textureIndex];
    if(!texture)continue;
    const appearance=Math.max(labOpenedAt+i*105,sample.loadedAt);
    const awake=motion.matches?1:clamp((now-appearance)/670);
    if(!awake)continue;
    const radius=size*Math.max(.64,scale);
    const depth=.45+(i%3)*.28;
    const phase=i*2.399963;
    const wanderX=Math.sin(seconds*(.145+i%4*.026)+phase)*.074+Math.sin(seconds*.061+phase*1.8)*.036;
    const wanderY=Math.cos(seconds*(.125+i%3*.038)+phase)*.063+Math.sin(seconds*.079+phase*.8)*.035;
    const px=canvas.width*clamp(x+(still?0:wanderX))+dx*depth;
    const py=canvas.height*clamp(y+(still?0:wanderY))+(1-awake)*18+dy*depth;
    const color=reveal?clamp(1-Math.hypot(px-canvas.width*canvasPointer.x,py-canvas.height*canvasPointer.y)/Math.max(38,radius*1.45)):0;
    field.save();
    field.globalCompositeOperation="screen";
    field.globalAlpha=awake*(i===0||i===5?.61:.31);
    field.translate(px,py);
    field.rotate(Math.sin(seconds*.51+i)*.1);
    drawMotif(field,texture.gray,radius);
    if(color>0){
      field.globalAlpha=awake*color*.86;
      drawMotif(field,texture.texture,radius);
    }
    field.restore();
  }
}

function drawCell(cell,now,seconds,still=false){
  const {canvas:plate,pen,layers}=cell;
  pen.clearRect(0,0,plate.width,plate.height);
  if(!layers.length)return;
  const basis=Math.min(plate.width,plate.height);
  const replaying=!still&&replay?.mode==="experiment"&&replay.slot===cell.button.dataset.slot;
  const clock=replaying?now-replay.time:null;
  const active=cell.button.dataset.slot===selected;
  const hovered=!still&&cellPointer.slot===cell.button.dataset.slot;
  const colored=still||active||hovered||cell.button.matches(":focus-visible");
  const viewX=hovered&&!motion.matches?(cellPointer.x-.5)*basis*.10:0;
  const viewY=hovered&&!motion.matches?(cellPointer.y-.5)*basis*.10:0;
  const rendered=[];
  pen.save();
  pen.globalCompositeOperation="screen";
  for(const [index,layer] of layers.entries()){
    const age=clock===null?now-layer.born:clock-index*100;
    const progress=still||motion.matches?1:clamp(age/650);
    if(!progress)continue;
    const ease=1-Math.pow(1-progress,3);
    const width=layer.size*basis*(.68+ease*.34);
    const phase=seconds*(.48+layer.sample.pulse*.48)+index*1.45;
    const pulse=motion.matches?1:1+.045*Math.sin(phase*1.42);
    const x=layer.x*plate.width+viewX+Math.sin(phase)*basis*.026-(1-ease)*basis*.14;
    const y=layer.y*plate.height+viewY+Math.cos(phase*.79)*basis*.031+(1-ease)*basis*.07;
    rendered.push({x,y,layer,ease});
    pen.save();
    pen.globalAlpha=ease*(colored?.94:.7);
    pen.translate(x,y);
    pen.rotate(layer.angle+Math.sin(phase*.51)*.08);
    pen.scale(pulse,pulse);
    const texture=colored?layer.texture.texture:layer.texture.gray;
    if(!motion.matches&&(hovered||replaying||progress<1)){
      const echo=width*(1+.06*Math.sin(phase));
      pen.globalAlpha=ease*(hovered?.22:.14);
      drawMotif(pen,texture,echo,-width*.025,width*.017);
      pen.globalAlpha=ease*(colored?.94:.7);
    }
    drawMotif(pen,texture,width);
    pen.restore();
  }
  pen.globalAlpha=colored?.45:.25;
  for(let i=1;i<rendered.length;i++){
    const a=rendered[i-1],b=rendered[i];
    if(a.layer.sample===b.layer.sample || Math.hypot(a.x-b.x,a.y-b.y)>basis*.84)continue;
    const bow=Math.min(plate.width,plate.height)*.085*Math.sin(seconds*.83+i);
    pen.strokeStyle=colored?b.layer.sample.color:"#d8ddd9";
    pen.lineWidth=Math.max(.5,basis*.003);
    pen.setLineDash([1.3,3]);
    pen.beginPath();
    pen.moveTo(a.x,a.y);
    pen.quadraticCurveTo((a.x+b.x)/2-bow,(a.y+b.y)/2+bow,b.x,b.y);
    pen.stroke();
  }
  pen.restore();
}

function interfere(cell,now,seconds) {
  if(!glitchEnabled||motion.matches||!cell.layers.length)return 0;
  const hovered=cellPointer.slot===cell.button.dataset.slot;
  const replaying=replay?.slot===cell.button.dataset.slot;
  const amount=Math.min(.68,cell.charge+
    (hovered?.12+cellPointer.speed*.46:0)+
    (replaying?.12+.18*Math.max(0,Math.sin(seconds*6)):0));
  if(amount<.065)return 0;
  const {canvas:plate,pen}=cell;
  if(frameCopy.width!==plate.width||frameCopy.height!==plate.height){
    frameCopy.width=plate.width;
    frameCopy.height=plate.height;
  }else frameCopyPen.clearRect(0,0,frameCopy.width,frameCopy.height);
  frameCopyPen.drawImage(plate,0,0);
  const x=hovered?cellPointer.x:cell.hitX;
  const y=hovered?cellPointer.y:cell.hitY;
  paintFragmentSignal(pen,frameCopy,x,y,amount,now,hovered||cell.button.dataset.slot===selected);
  return amount;
}

function drawScope(seconds,impact){
  const {width:w,height:h}=scope;
  signal.clearRect(0,0,w,h);
  signal.lineWidth=.7;
  signal.strokeStyle="#555";
  for(let i=1;i<14;i++){
    signal.beginPath();
    signal.moveTo(i*w/14,0);
    signal.lineTo(i*w/14,h);
    signal.stroke();
  }
  for(let i=1;i<5;i++){
    signal.beginPath();
    signal.moveTo(0,i*h/5);
    signal.lineTo(w,i*h/5);
    signal.stroke();
  }
  signal.lineWidth=1.15+(impact?.pulse||0)*.8;
  signal.strokeStyle="#00dce4";
  signal.beginPath();
  const [balance,brightness,overlap,pulse]=readings;
  for(let x=0;x<w;x++){
    const t=x/w;
    const phase=t*tau*(2+overlap*5)-seconds*pulse*2.3;
    const burst=Math.exp(-((t-.52)*(t-.52))*26);
    const slice=replay?.slice;
    const y=slice?h*(.79-slice[Math.min(slice.length-1,Math.floor(t*slice.length))]*.65):
      h*(.71-brightness*.28-(Math.sin(phase)*.095+Math.sin(phase*2.77)*.042)*pulse*(.43+burst+overlap)-balance*burst*.075);
    const shear=impact?Math.sin(x*.43+impact.index*1.9)*h*.085*impact.pulse:0;
    if(x===0)signal.moveTo(x,y+shear);else signal.lineTo(x,y+shear);
  }
  signal.stroke();
}

function readScanSlice(plate,progress) {
  if(plate.width<2||plate.height<2)return null;
  const row=Math.min(plate.height-1,Math.floor(plate.height*progress));
  scanProbePen.clearRect(0,0,scanProbe.width,1);
  scanProbePen.drawImage(plate,0,row,plate.width,1,0,0,scanProbe.width,1);
  const bytes=scanProbePen.getImageData(0,0,scanProbe.width,1).data;
  return Array.from({length:scanProbe.width},(_,i)=>{
    const offset=i*4;
    return Math.max(bytes[offset],bytes[offset+1],bytes[offset+2])*bytes[offset+3]/65025;
  });
}

function renderComposition(cell,now,maxEdge,includeOverflow=false) {
  const snapshot=document.createElement("canvas");
  const width=Math.max(1,cell.canvas.width),height=Math.max(1,cell.canvas.height);
  const scale=maxEdge/Math.max(width,height);
  const frame={
    width:Math.max(1,Math.round(width*scale)),
    height:Math.max(1,Math.round(height*scale))
  };
  // Paint beyond the cell edges before framing the finished artwork.
  const bleed=includeOverflow?Math.ceil(Math.min(frame.width,frame.height)*.5):0;
  snapshot.width=frame.width+bleed*2;
  snapshot.height=frame.height+bleed*2;
  const pen=snapshot.getContext("2d",{willReadFrequently:includeOverflow});
  pen.imageSmoothingQuality=includeOverflow?"high":"low";
  pen.translate(bleed,bleed);
  drawCell({...cell,canvas:frame,pen},now,0,true);
  return includeOverflow?frameArtwork(snapshot,pen,frame,bleed):snapshot;
}

function frameArtwork(canvas,pen,frame,bleed){
  const {width,height}=canvas;
  const {data}=pen.getImageData(0,0,width,height);
  let left=width,top=height,right=-1,bottom=-1;
  for(let y=0;y<height;y++){
    for(let x=0;x<width;x++){
      if(!data[(y*width+x)*4+3])continue;
      left=Math.min(left,x);
      right=Math.max(right,x);
      top=Math.min(top,y);
      bottom=y;
    }
  }
  if(right<0)return {artwork:canvas,frame,offsetX:bleed,offsetY:bleed};
  const inkWidth=right-left+1,inkHeight=bottom-top+1;
  // Reserve room for the fragments to drift and rotate around the still composition.
  const margin=Math.ceil(Math.min(frame.width,frame.height)*.16);
  const framed=document.createElement("canvas");
  framed.width=inkWidth+margin*2;
  framed.height=inkHeight+margin*2;
  framed.getContext("2d").drawImage(canvas,left,top,inkWidth,inkHeight,margin,margin,inkWidth,inkHeight);
  return {artwork:framed,frame,offsetX:bleed-left+margin,offsetY:bleed-top+margin};
}

function captureScan(cell,now) {
  const snapshot=renderComposition(cell,now,192);
  const pen=snapshot.getContext("2d");
  const frame=pen.getImageData(0,0,snapshot.width,snapshot.height);
  const {data}=frame;
  const rows=Array.from({length:snapshot.height},()=>new Float32Array(snapshot.width));
  let peak=0,bright=0;
  for(let y=0;y<snapshot.height;y++){
    for(let x=0;x<snapshot.width;x++){
      const pixel=(y*snapshot.width+x)*4;
      const value=Math.max(data[pixel],data[pixel+1],data[pixel+2])*data[pixel+3]/65025;
      rows[y][x]=value;
      if(value>=.20)bright++;
      peak=Math.max(peak,value);
      // The scan display lifts dim traces without changing the measured values.
      const display=Math.pow(value,.65);
      data[pixel]=6+display*181;
      data[pixel+1]=12+display*241;
      data[pixel+2]=15+display*236;
      data[pixel+3]=255;
    }
  }
  pen.putImageData(frame,0,0);
  return {layers:cell.layers,map:snapshot,rows,peak:peak*100,coverage:bright*100/(snapshot.width*snapshot.height)};
}

function formatPercent(value) {
  if(value>0&&value<.1)return "<0.1%";
  const formatter=new Intl.NumberFormat(language,{maximumFractionDigits:1});
  return formatter.format(value)+"%";
}

function renderScanRecord(record) {
  if(scanMap.width!==record.map.width||scanMap.height!==record.map.height){
    scanMap.width=record.map.width;
    scanMap.height=record.map.height;
  }
  scanMapPen.drawImage(record.map,0,0);
  $("#scan-peak").textContent=formatPercent(record.peak);
  $("#scan-coverage").textContent=formatPercent(record.coverage);
}

function updateScanProgress(progress) {
  const next=Math.round(progress*100);
  if(scanBar.value===next)return;
  scanBar.value=next;
  scanValue.textContent=next+"%";
}

function animate(now){
  requestAnimationFrame(animate);
  if(!replay&&now-lastFrame<24)return;
  const elapsed=lastFrame?Math.min(.1,(now-lastFrame)/1000):.032;
  lastFrame=now;
  cellPointer.speed*=Math.exp(-elapsed*5.2);
  scopeCharge*=Math.exp(-elapsed*2.45);
  const tracking=canvasPointer.hot||now<canvasPointer.tappedUntil;
  canvasPointer.currentX+=((tracking?canvasPointer.x:.5)-canvasPointer.currentX)*.14;
  canvasPointer.currentY+=((tracking?canvasPointer.y:.5)-canvasPointer.currentY)*.14;
  frameCount++;
  if(now-frameStarted>800){
    $("#console-fps").textContent=String(Math.round(frameCount*1000/(now-frameStarted)));
    frameStarted=now;
    frameCount=0;
  }
  const seconds=motion.matches?0:(now-startTime)/1000;
  if(replay && now-replay.time>=replayDuration)finishScan();
  const scanTime=replay?(now-replay.time)/1000:0;
  const sweep=replay?scanMotion(scanImpacts[replay.mode],scanTime,scanDuration):null;
  const impact=glitchEnabled&&!motion.matches?sweep:null;
  if(sweep){
    updateScanProgress(clamp(scanTime/scanDuration));
    const pulse=impact?.pulse||0;
    brainPanel.style.setProperty("--coil-pulse",pulse.toFixed(3));
    brainPanel.style.setProperty("--coil-shift",((impact?.index%2===0?1:-1)*pulse*3).toFixed(2)+"px");
  }
  const updateReadout=Boolean(replay)||now-lastMeter>42||dirtyScope;
  drawFloating(now);
  let strength=0;
  for(const cell of cells.values()){
    cell.charge*=Math.exp(-elapsed*3.8);
    const scanning=replay?.slot===cell.button.dataset.slot;
    const scanOnly=scanning&&replay.mode==="scan";
    drawCell(cell,now,seconds);
    if(scanning&&updateReadout){
      const rows=replay.record?.rows;
      replay.slice=rows?rows[Math.floor((rows.length-1)*sweep.progress)]:readScanSlice(cell.canvas,sweep.progress);
    }
    if(!scanOnly)strength=Math.max(strength,interfere(cell,now,seconds));
    if(scanning){
      if(cell.button.dataset.slot==="E"){
        eScanPen.clearRect(0,0,eScanOverlay.width,eScanOverlay.height);
        paintScanSweep(eScanPen,eScanOverlay.width,eScanOverlay.height,sweep.progress,sweep.pulse);
      }else{
        paintScanSweep(cell.pen,cell.canvas.width,cell.canvas.height,sweep.progress,sweep.pulse);
      }
    }
  }
  const livePreview=document.getElementById("scan-live-preview");
  if(livePreview){
    const ctx=livePreview.getContext("2d"), active=cells.get(selected);
    const w=livePreview.width,h=livePreview.height;
    ctx.clearRect(0,0,w,h);
    if(active?.layers.length){
      const source=active.canvas, scale=Math.min(w/source.width,h/source.height)*.94;
      if(Number.isFinite(scale)&&scale>0)ctx.drawImage(source,(w-source.width*scale)/2,(h-source.height*scale)/2,source.width*scale,source.height*scale);
    }
  }
  if(resultDialog.open&&!motion.matches){
    const cell=cells.get(selected);
    const {frame,offsetX,offsetY}=cell.result;
    resultArtworkPen.clearRect(0,0,resultArtwork.width,resultArtwork.height);
    resultArtworkPen.save();
    resultArtworkPen.translate(offsetX,offsetY);
    drawCell({...cell,canvas:frame,pen:resultArtworkPen},now,seconds*.6,true);
    resultArtworkPen.restore();
  }
  const noise=glitchEnabled&&!motion.matches?clamp(scopeCharge*(.16+scopeEnergy*.82)+
    (impact?.pulse||0)*(.56+scopeEnergy*.34)):0;
  const delta="Δ "+Math.max(strength,noise).toFixed(2);
  if(signalDelta.textContent!==delta)signalDelta.textContent=delta;
  if(updateReadout){
    for(const [i,[meter,output]] of meters.entries()){
      const gap=targets[i]-readings[i];
      readings[i]=motion.matches||Math.abs(gap)<.004?targets[i]:readings[i]+gap*.29;
      const formatted=readings[i].toFixed(2);
      if(meter){
        const fill=(readings[i]*100).toFixed(1)+"%";
        if("value" in meter)meter.value=readings[i];
        meter.style?.setProperty("--fill",fill);
        meter.setAttribute?.("aria-valuenow",formatted);
        const innerFill=meter.querySelector?.(".signal-meter-fill");
        if(innerFill)innerFill.style.width=fill;
      }
      if(output.textContent!==formatted)output.textContent=formatted;
    }
    drawScope(seconds,impact);
    paintScopeInterference(signal,scope.width,scope.height,now,noise,scopeColor);
    dirtyScope=false;
    lastMeter=now;
  }
}

for(const [name,{button}] of cells){
  button.addEventListener("click",(event)=>{
    selected=name;
    cancelPlayback();
    const cell=cells.get(name);
    if(event.detail){
      const hit=positionIn(event,cell.canvas);
      cell.hitX=hit.x;
      cell.hitY=hit.y;
    }
    cell.charge=.55;
    scopeCharge=.85;
    notify("select",name);
    sync();
  });
}
for(const button of document.querySelectorAll("[data-lang]")){
  button.addEventListener("click",()=>{
    language=button.dataset.lang;
    try { localStorage.setItem("kirara-fragments-language",language); } catch {}
    applyLanguage();
  });
}
$("#undo").addEventListener("click",undo);
$("#clear").addEventListener("click",clearCell);
// Artistic music matching, based on the dominant fragment sources.
const musicMatches={
 E01:["Worries","걱정","Interrupted piano phrases suggest uncertainty.","끊겼다 이어지는 피아노 선율이 막막함과 불확실성을 연상시킵니다."],
 E02:["Earthquake","Earthquake","Expanding bass and vibration echo mounting pressure.","팽창하는 저음과 진동이 점차 쌓이는 압박감을 연상시킵니다."],
 E03:["Rain Dance","Rain Dance","Fragmented samples and shifting textures echo unstable excitement.","잘게 분절된 샘플과 변화하는 질감이 불안정한 설렘과 연결됩니다."],
 E04:["Water","Water","Gradually evolving water loops suggest space and release.","서서히 변주되는 물소리가 긴장이 풀리고 여백이 생기는 감각과 연결됩니다."],
 E05:["Stay","Stay","Piano and recordings of shared space suggest lingering warmth.","피아노와 함께 머무는 공간의 소리가 남아 있는 다정함을 연상시킵니다."],
 E06:["Blink","Blink","Rising riffs and forceful drums suggest tension and defensiveness.","상승하는 리프와 강렬한 드럼의 충돌이 긴장과 경계심을 연상시킵니다."]
};
const resultBandcamp={E01:"--2",E02:"earthquake",E03:"rain-dance",E04:"water",E05:"stay-2",E06:"blink"};
let resultPreviewAudio=null, resultPreviewGeneration=0, resultPreviewCache=null;
function stopResultMusic(){
 ++resultPreviewGeneration;
 if(resultPreviewAudio){resultPreviewAudio.pause();resultPreviewAudio.removeAttribute("src");resultPreviewAudio.load();resultPreviewAudio=null;}
 document.querySelectorAll("#result-music-recommendation [data-listen]").forEach(el=>{el.textContent=el.dataset.idle;el.setAttribute("aria-pressed","false");});
 document.querySelectorAll("#result-music-recommendation [data-player]").forEach(el=>{el.textContent="00:00 / 00:30";});
}
resultDialog.addEventListener("close",stopResultMusic);
new MutationObserver(()=>{if(!resultDialog.open)stopResultMusic();}).observe(resultDialog,{attributes:true,attributeFilter:["open"]});
function loadResultPreviews(){
 if(resultPreviewCache)return resultPreviewCache;
 resultPreviewCache=new Promise((resolve,reject)=>{
  const cb="__kiraraPreview"+Date.now(), script=document.createElement("script");
  let timer;const clean=()=>{clearTimeout(timer);script.remove();delete window[cb];};
  window[cb]=data=>{clean();resolve((data.results||[]).filter(x=>x.wrapperType==="track"&&x.kind==="song"&&x.artistName.toLowerCase()==="kirara"&&x.collectionName.toLowerCase()==="sarah"&&x.previewUrl));};
  script.onerror=()=>{clean();reject(new Error("Preview unavailable"));};
  timer=setTimeout(()=>{clean();reject(new Error("Preview timeout"));},8000);
  script.src="https://itunes.apple.com/lookup?id=1856541802&entity=song&country=us&callback="+cb;
  document.head.append(script);
 }).catch(e=>{resultPreviewCache=null;throw e;});
 return resultPreviewCache;
}
function renderMusicRecommendation(reading){
 const ko=language==="ko";
 let section=document.getElementById("result-music-recommendation");
 stopResultMusic();
 if(section&&section.tagName!=="SECTION"){section.remove();section=null;}
 if(!section){section=document.createElement("section");section.id="result-music-recommendation";document.querySelector(".result-interpretation").append(section);}
 section.style.cssText="border-top:1px solid #666;margin-top:12px;padding-top:12px;display:grid;gap:9px;min-width:0";
 const heading=document.createElement("strong");heading.textContent=ko?"+ 추천 음악":"+ RECOMMENDED TRACK";
 const items=reading.ranked.slice(0,2).map(([sample,count],index)=>{
  const track=musicMatches[sample.id];if(!track)return null;
  const item=document.createElement("div");item.style.cssText="display:grid;gap:6px;margin-bottom:5px";
  const name=document.createElement("strong");name.textContent=(index?(ko?"보조 추천 / ":"SECONDARY / "):"")+"KIRARA — "+track[ko?1:0];name.style.color="#00dedd";
  const reason=document.createElement("p");reason.textContent=track[ko?3:2];
  const link=document.createElement("a");link.href="https://music.apple.com/us/album/sarah/1856541802";link.target="_blank";link.rel="noopener noreferrer";link.textContent=ko?"Apple Music에서 듣기 ↗":"OPEN IN APPLE MUSIC ↗";link.style.cssText="color:#aaa;text-decoration:underline;font-size:.85em";
  const row=document.createElement("div");row.style.cssText="display:flex;align-items:center;gap:10px;border:1px solid #666;padding:6px;min-width:0";
  const play=document.createElement("button");play.type="button";play.dataset.listen=sample.id;play.dataset.idle=ko?"▶ 미리듣기":"▶ PREVIEW";play.textContent=play.dataset.idle;play.setAttribute("aria-pressed","false");play.style.cssText="border:1px solid #00aaaa;background:#000;color:#00dedd;font:inherit;padding:7px;cursor:pointer;white-space:nowrap";
  const player=document.createElement("span");player.dataset.player="true";player.setAttribute("aria-live","polite");player.textContent="00:00 / 00:30";player.style.cssText="font-variant-numeric:tabular-nums;color:#bbb;min-width:0";
  play.addEventListener("click",async()=>{
   const active=play.getAttribute("aria-pressed")==="true";stopResultMusic();if(active)return;
   const generation=resultPreviewGeneration;play.setAttribute("aria-pressed","true");play.textContent=ko?"■ 정지":"■ STOP";player.textContent=ko?"불러오는 중":"LOADING";
   try{
    const tracks=await loadResultPreviews();if(generation!==resultPreviewGeneration||!resultDialog.open)return;
    const match=tracks.find(x=>x.trackName.toLowerCase()===track[0].toLowerCase()||x.trackName===track[1]);if(!match)throw new Error("No preview");
    const audio=new Audio(match.previewUrl);resultPreviewAudio=audio;audio.volume=.45;
    const finish=()=>{if(resultPreviewAudio===audio)stopResultMusic();};
    audio.addEventListener("timeupdate",()=>{if(resultPreviewAudio!==audio)return;const limit=Math.min(30,Number.isFinite(audio.duration)?audio.duration:30);if(audio.currentTime>=limit){finish();return;}player.textContent="00:"+String(Math.floor(audio.currentTime)).padStart(2,"0")+" / 00:"+String(Math.floor(limit)).padStart(2,"0");});
    audio.addEventListener("ended",finish);audio.addEventListener("error",()=>{if(resultPreviewAudio===audio){finish();player.textContent=ko?"재생 불가":"UNAVAILABLE";}});
    await audio.play();
   }catch(e){if(generation===resultPreviewGeneration){stopResultMusic();player.textContent=ko?"미리듣기 불가 · 링크 이용":"UNAVAILABLE · USE LINK";}}
  });
  row.append(play,player);item.append(name,reason,row,link);return item;
 }).filter(Boolean);
 const note=document.createElement("small");note.textContent=ko?"Apple Music 제공 미리듣기 · 최대 30초. 그래픽 조각 비율에 따른 예술적 추천입니다.":"Apple Music preview · up to 30 sec. Artistic match based on fragment shares, not an emotion diagnosis.";
 section.replaceChildren(heading,...items,note);
 loadResultPreviews().catch(()=>{});
}

function renderExperiment(result){
  const {reading,slot,layers,artwork,scan}=result;
  scan.map.setAttribute("aria-hidden","true");
  if(resultMapPreview.firstElementChild!==scan.map)resultMapPreview.replaceChildren(scan.map);
  $("#result-map-peak").textContent=formatPercent(scan.peak);
  $("#result-map-coverage").textContent=formatPercent(scan.coverage);
  resultArtwork.setAttribute("role","img");
  resultArtwork.setAttribute("aria-label",t("resultArtwork",slot));
  if(resultArtworkPreview.firstElementChild!==resultArtwork)resultArtworkPreview.replaceChildren(resultArtwork);
  resultArtwork.width=artwork.width;
  resultArtwork.height=artwork.height;
  resultArtworkPen.imageSmoothingQuality="high";
  resultArtworkPen.drawImage(artwork,0,0);
  window.emotionOrbit?.setResult(result);
  const i=language==="ko"?1:0;
  const title=reading.title[i];
  $("#result-summary-title").textContent=title;
  $("#result-title").textContent=title;
  $("#result-cell").textContent=t("resultCell",slot,layers.length);
  const feelings=[reading.first.name[i]];
  if(reading.second)feelings.push(reading.second.name[i]);
  $("#result-feelings").textContent=feelings.join(" / ");
  $("#result-description").textContent=reading.second
    ? t(reading.balanced?"mixEven":"mixLead",...feelings)
    : reading.first.description[i];
  for(const [index,row] of document.querySelectorAll(".result-signals dd").entries()){
    const value=reading.values[index];
    row.querySelector("output").textContent=value.toFixed(2);
    row.querySelector("meter").value=value;
  }
  renderMusicRecommendation(reading);
  const overlap=reading.values[2];
  $("#result-evidence").textContent=reading.second
    ? t(overlap>=.46?"overlapStrong":"overlapLight",Math.round(overlap*100))
    : t("singleSource");
  $("#result-sources").replaceChildren(...reading.ranked.map(([sample,count])=>{
    const line=document.createElement("li");
    const name=document.createElement("span");
    const weight=document.createElement("output");
    name.textContent=sample[language];
    weight.textContent=t("resultWeight",count,Math.round(count/layers.length*100));
    line.append(name,weight);
    return line;
  }));
}

function showExperiment(slot){
  const cell=cells.get(slot);
  const layers=cell.layers;
  const now=performance.now();
  cell.result={
    slot,layers,
    reading:interpretFragments(countSources(layers),measure(layers)),
    ...renderComposition(cell,now,1920,true),
    scan:captureScan(cell,now)
  };
  notify("resultReady",slot);
  sync();
  if(!resultDialog.open)resultDialog.showModal();
}

function finishScan(){
  const {slot,record}=replay;
  cancelPlayback();
  updateScanProgress(1);
  if(record){
    cells.get(slot).scanRecord=record;
    notify("scanComplete",slot);
    sync();
    runDetails.scrollTop=0;
    return;
  }
  showExperiment(slot);
  audio.cue("result",{level:.74});
}

function startScan(event){
  const cell=cells.get(selected);
  if(replay||!cell.layers.length)return;
  const trigger=event.currentTarget;
  const mode=trigger===scanButton?"scan":"experiment";
  const now=performance.now();
  const record=mode==="scan"?captureScan(cell,now):null;
  replay={time:now,slot:selected,trigger,mode,record,slice:null};
  updateScanProgress(0);
  notify("replay",selected);
  readings.fill(0);
  dirtyScope=true;
  scopeCharge=.8;
  if(motion.matches){
    audio.cue(mode);
    finishScan();
  }else {
    document.documentElement.classList.add("scan-active");
    replay.time=performance.now();
    audio.startScan(mode);
    sync();
  }
}

for(const button of [scanButton,runButton])button.addEventListener("click",startScan);

$("#show-result").addEventListener("click",()=>{
  if(!resultDialog.open)resultDialog.showModal();
});

saveResultPng.addEventListener("click",()=>{
  const cell=cells.get(selected);
  const result=cell.result;
  if(!result||result.layers!==cell.layers)return;
  exportStatus.hidden=true;
  saveResultPng.disabled=true;
  result.artwork.toBlob(blob=>{
    saveResultPng.disabled=false;
    if(!blob){
      exportStatus.textContent=t("resultExportError");
      exportStatus.hidden=false;
      return;
    }
    const url=URL.createObjectURL(blob);
    const download=document.createElement("a");
    download.href=url;
    download.download="kirara-emotion-cell-"+result.slot.toLowerCase()+".png";
    resultDialog.append(download);
    download.click();
    download.remove();
    setTimeout(()=>URL.revokeObjectURL(url),30000);
  },"image/png");
});

function positionIn(event,element){
  const rect=element.getBoundingClientRect();
  return {x:clamp((event.clientX-rect.left)/Math.max(1,rect.width)),y:clamp((event.clientY-rect.top)/Math.max(1,rect.height))};
}

stage.addEventListener("pointermove",event=>{
  if(event.pointerType==="touch")return;
  Object.assign(canvasPointer,positionIn(event,stage),{hot:true});
},{passive:true});
stage.addEventListener("pointerleave",()=>{canvasPointer.hot=false;});
stage.addEventListener("pointerdown",event=>{
  if(event.pointerType!=="touch")return;
  Object.assign(canvasPointer,positionIn(event,stage),{tappedUntil:performance.now()+1400});
},{passive:true});
for(const [name,{button,canvas}] of cells){
  button.addEventListener("pointermove",event=>{
    if(event.pointerType==="touch")return;
    const hit=positionIn(event,canvas);
    const dt=Math.max(6,event.timeStamp-cellPointer.time);
    if(cellPointer.slot===name)cellPointer.speed=Math.max(cellPointer.speed,clamp(Math.hypot(hit.x-cellPointer.x,hit.y-cellPointer.y)*310/dt));
    Object.assign(cellPointer,hit,{slot:name,time:event.timeStamp});
  },{passive:true});
  button.addEventListener("pointerleave",()=>{if(cellPointer.slot===name)cellPointer.slot=null;});
}

signalToggle.addEventListener("click",()=>{
  glitchEnabled=!glitchEnabled;
  sync();
});
motion.addEventListener("change",sync);
document.addEventListener("keydown",event=>{
  if(introActive||document.getElementById("kr-intro")||resultDialog.open||event.repeat||event.metaKey||event.ctrlKey||event.altKey||event.isComposing||event.target.closest("input,textarea,select,[contenteditable=true]"))return;
  const shortcut={z:"#undo",c:"#clear",g:"#signal-toggle",r:"#run",x:"#scan-action"}[event.key.toLowerCase()];
  if(!shortcut||$(shortcut).disabled)return;
  event.preventDefault();
  $(shortcut).click();
});

function revealLabText() {
  if(motion.matches)return;
  const selectors=[
    ".brand", ".masthead h1", ".mast-tools>p", "#console-heading",
    ".instructions", ".telemetry dt", ".target span", "#signal-help",
    ".dataset-metadata span", ".emotion span:not(.id)", ".emotion small",
    ".stage-key strong", ".stage-key small", "#brain-heading",
    ".simulated", "#scope-caption", ".channels dt", ".signal-info summary",
  ];
  for(const [index,label] of [...document.querySelectorAll(selectors.join(","))].entries()){
    const characters=label.textContent.trim().length;
    if(!characters)continue;
    label.animate(
      [{clipPath:"inset(0 100% 0 0)"},{clipPath:"inset(0 0 0 0)"}],
      {duration:Math.min(510,Math.max(115,characters*13)),delay:Math.min(index,22)*23,
        easing:`steps(${characters},end)`,fill:"backwards"}
    );
  }
  audio.cue("labText",{delay:.045,level:.80});
}

window.addEventListener("kirara:enter",()=>{
  if(!introActive)return;
  introActive=false;
  labOpenedAt=performance.now();
  audio.stopTyping();
  audio.cue("arrival",{level:.53});
  revealLabText();
});
document.addEventListener("visibilitychange",()=>{
  if(document.hidden){
    audio.stopTyping();
    audio.stopScene();
  }else playCurrentScene();
});
document.addEventListener("click",event=>{
  const control=event.target.closest("button,summary");
  if(!control||control.disabled||control===scanButton||control===runButton)return;
  if(control.matches(".emotion"))audio.cue("element");
  else audio.cue("button");
},{capture:true});

async function resumeWithInteraction(event) {
  if(audioBusy||audio.playing||!audio.available||!event.isTrusted||event.repeat)return;
  audioBusy=true;
  const ready=await audio.enable(true);
  audioBusy=false;
  if(ready)playCurrentScene();
}
document.addEventListener("pointerdown",event=>{
  if(event.pointerType==="mouse")resumeWithInteraction(event);
},{capture:true,passive:true});
document.addEventListener("click",resumeWithInteraction,{capture:true});
document.addEventListener("keydown",resumeWithInteraction,{capture:true});

makeMenu();
for(const sample of samples)sample.button.disabled=true;
applyLanguage();
const observer=new ResizeObserver(size);
observer.observe(stage);
for(const cell of cells.values())observer.observe(cell.button);
prepareSamples();
const ua=navigator.userAgent;
const requiresAudioGesture=/AppleWebKit/.test(ua)&&(!/Chrome|Chromium|Edg\//.test(ua)||/iPhone|iPad|iPod/.test(ua));
if(!requiresAudioGesture)audio.enable(false);

requestAnimationFrame(animate);

// Expand the existing scan record without changing the scan workflow.
$("#scan-more").addEventListener("click",()=>{const b=$("#scan-more"),open=b.getAttribute("aria-expanded")!=="true";b.setAttribute("aria-expanded",String(open));b.closest(".run").classList.toggle("show-scan-details",open);});
