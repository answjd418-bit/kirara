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
@media(min-width:760px){
 #result-dialog{padding:12px;max-height:88dvh;overflow:auto}
 #result-dialog .result-body{gap:12px;grid-template-columns:minmax(0,42%) minmax(0,1fr);font-size:clamp(10px,1.5dvh,13px);line-height:1.3}
 #result-dialog .result-report-reading{max-height:none;overflow:visible;gap:5px;padding-right:12px}
 #result-dialog .result-report-header{gap:3px;padding:0 0 5px}
 #result-dialog .result-report-header>p:first-child{font-size:1em}
 #result-dialog #result-cell,#result-dialog #result-feelings{font-size:.95em}
 #result-dialog #result-title{font-size:clamp(16px,2.8dvh,23px);line-height:1.2;margin:0}
 #result-dialog .result-body h3{font-size:1em;margin:0 0 3px}
 #result-dialog #result-map-preview canvas{height:clamp(48px,9dvh,83px)}
 #result-dialog .result-scan-data{gap:8px}
 #result-dialog .result-scan-data dl{gap:3px;font-size:.95em;margin:0}
 #result-dialog .result-interpretation{gap:3px}
 #result-dialog #result-description,#result-dialog #result-evidence{font-size:1em;line-height:1.3;margin:0}
 #result-dialog .result-footnote,#result-dialog .result-shares{font-size:.85em;margin:0}
 #result-dialog .result-shares{position:relative}
 #result-dialog .result-shares[open] #result-sources{position:absolute;bottom:100%;left:0;right:0;z-index:5;background:#101010;border:1px solid #777;padding:8px;box-shadow:0 4px 16px #000}
 #result-dialog .result-report-actions{margin:0;gap:6px;padding-top:2px}
 #result-dialog .result-report-actions button,#result-dialog .result-close button{font-size:inherit;min-height:25px;padding:4px 7px}
 #result-dialog .result-report-plate{gap:5px}
 #result-dialog .result-artwork figcaption{padding:6px;font-size:1em}
 #result-dialog #result-artwork-preview{height:clamp(150px,43dvh,360px)}
 #result-dialog .result-signals{gap:3px}
 #result-dialog .result-signals>div{font-size:.95em}
 #result-dialog .result-close{top:12px;right:12px}
 #result-dialog #result-music-recommendation{font-size:1em;line-height:1.3}
 #result-dialog #result-music-recommendation small{font-size:.8em}
 #result-dialog #result-music-recommendation a{white-space:normal;text-align:right}
}


/* Retro result window: retain the previous outer dimensions. */
#result-dialog{padding:6px;border:3px double #eee;background:#000;color:#f1f1f1;--report-rule:#a0a0a0;--report-muted:#c0c0c0;font-family:var(--mono,monospace);}
#result-dialog .retro-titlebar{display:flex;align-items:center;gap:8px;background:#f4f4f4;color:#000;padding:5px 8px;min-width:0;font-size:clamp(11px,1.15vw,16px);line-height:1.25;}
#result-dialog .retro-titlebar strong{font-weight:400;min-width:0;overflow-wrap:anywhere;}
#result-dialog .retro-path{margin-left:auto;font-size:.85em;white-space:nowrap;}
#result-dialog .result-close{position:static;flex:none;display:block;margin:0;}
#result-dialog .result-close button{background:#f4f4f4;color:#000;border:1px solid #000;min-height:0;padding:2px 6px;font:inherit;}
#result-dialog .result-body{border:1px solid #eee;margin:10px 0 8px;gap:0;align-items:stretch;}
#result-dialog .result-report-reading,#result-dialog .result-report-plate{padding:7px;gap:6px;min-height:0;border:0;}
#result-dialog .result-report-reading{border-right:1px solid #eee;}
#result-dialog .result-report-header{padding:0 0 6px;gap:4px;border-color:#aaa;}
#result-dialog .result-report-header>p:first-child,#result-dialog .result-artwork figcaption{box-sizing:border-box;background:#f4f4f4;color:#000;width:100%;max-width:100%;border:0;padding:5px 7px;font:inherit;font-weight:500;}
#result-dialog #result-cell{font-weight:600;color:#eee;letter-spacing:.02em;}
#result-dialog #result-title{font-size:clamp(15px,2.45dvh,21px);line-height:1.2;}
#result-dialog #result-feelings{font-size:inherit;color:#ddd;}
#result-dialog .result-interpretation{gap:4px;}
#result-dialog #result-reading-title{margin:0 0 2px;}
#result-dialog #result-description,#result-dialog #result-evidence{font-size:inherit;line-height:1.35;}
#result-dialog .result-footnote{font-size:.82em;color:#aaa;}
#result-dialog .retro-parameters{display:grid;gap:5px;border-top:1px solid #aaa;padding-top:6px;}
#result-dialog .result-signals{padding:0;gap:3px;}
#result-dialog .result-signals>div{grid-template-columns:minmax(0,1fr) auto;gap:8px;font-size:inherit;}
#result-dialog .result-signals dt::before{content:none;}
#result-dialog .result-signals dd{display:block;margin:0;}
#result-dialog .result-signals meter{display:none;}
#result-dialog .result-signals output{display:block;text-align:right;}
#result-dialog .result-scan{border-top:1px solid #aaa;padding-top:6px;}
#result-dialog .result-scan-data{grid-template-columns:minmax(0,48%) minmax(0,1fr);gap:8px;}
#result-dialog #result-map-preview canvas{height:clamp(40px,7dvh,68px);}
#result-dialog .result-artwork{flex:1;gap:6px;padding:0;}
#result-dialog #result-artwork-preview{flex:1 1 auto;height:auto;min-height:clamp(150px,34dvh,325px);border:1px solid #aaa;}
#result-dialog #result-artwork-preview canvas{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;}
#result-dialog #result-music-recommendation{font-size:inherit;line-height:1.3;margin:0!important;padding-top:6px!important;}
#result-dialog .retro-footer{display:flex;align-items:center;gap:8px;border:1px solid #eee;padding:4px 6px;font-size:clamp(10px,1vw,13px);}
#result-dialog .retro-status{white-space:nowrap;}
#result-dialog .result-report-actions{margin:0;padding:0;gap:4px;}
#result-dialog .result-report-actions button{border:0;min-height:0;padding:3px 6px;color:#eee;background:transparent;}
#result-dialog .result-report-actions button:hover{background:#eee;color:#000;}
#result-dialog #result-export-status{margin-left:auto;}
@media(min-width:760px){#result-dialog .result-body{grid-template-columns:minmax(0,37%) minmax(0,1fr);font-size:clamp(10px,1.5dvh,13px);line-height:1.3;}#result-dialog .result-report-reading{overflow:visible;max-height:none;}#result-dialog .result-report-plate{align-self:stretch;} }
@media(max-width:759px){#result-dialog .retro-path{display:none;}#result-dialog .result-body{grid-template-columns:minmax(0,1fr);}#result-dialog .result-report-reading{border-right:0;border-bottom:1px solid #eee;}#result-dialog .result-report-header>p:first-child{padding-right:7px;}#result-dialog #result-artwork-preview{height:32dvh;}#result-dialog .retro-footer{flex-wrap:wrap;} }


/* Reference: 1600 x 1100 retro window. */
@media(min-width:760px) and (min-height:560px){
 #result-dialog{--window-w:min(82vw,1120px,calc(84dvh * 16 / 11));width:var(--window-w);height:calc(var(--window-w) * 11 / 16);max-height:84dvh;aspect-ratio:16 / 11;padding:4px;overflow:hidden;}
 #result-dialog[open]{display:flex;flex-direction:column;}
 #result-dialog .retro-titlebar{flex:none;gap:6px;padding:4px 6px;font-size:clamp(10px,calc(var(--window-w) * .018),19px);white-space:nowrap;}
 #result-dialog .retro-titlebar strong{overflow:hidden;text-overflow:ellipsis;}
 #result-dialog .retro-path{font-size:.78em;flex:none;}
 #result-dialog .result-body{flex:1;min-height:0;grid-template-columns:minmax(0,37%) minmax(0,63%);margin:calc(var(--window-w) * .043) 8px 10px;gap:0;align-items:stretch;font-size:clamp(9px,calc(var(--window-w) * .012),13px);line-height:1.25;}
 #result-dialog .result-report-reading,#result-dialog .result-report-plate{padding:6px;gap:5px;min-height:0;}
 #result-dialog .result-report-reading{border-right:1px solid #eee;overflow:auto;scrollbar-width:thin;}
 #result-dialog .result-report-header>p:first-child,#result-dialog .result-artwork figcaption{font-size:1.2em;padding:4px 6px;flex:none;}
 #result-dialog .result-report-header{gap:3px;padding-bottom:5px;}
 #result-dialog #result-title{font-size:1.35em;line-height:1.15;}
 #result-dialog #result-description,#result-dialog #result-evidence{line-height:1.25;overflow-wrap:anywhere;}
 #result-dialog .result-footnote{font-size:.8em;}
 #result-dialog .retro-parameters,#result-dialog .result-scan{padding-top:4px;gap:3px;}
 #result-dialog .result-signals{gap:2px;}
 #result-dialog #result-map-preview canvas{height:clamp(30px,5dvh,50px);}
 #result-dialog .result-artwork{flex:1 1 0;min-height:0;gap:6px;}
 #result-dialog #result-artwork-preview{flex:1 1 0;min-height:0;height:auto;}
 #result-dialog #result-music-recommendation{flex:none;font-size:.9em;line-height:1.2;gap:3px!important;padding-top:4px!important;}
 #result-dialog #result-music-recommendation p{margin:0;}
 #result-dialog .retro-footer{flex:none;padding:3px 6px;gap:6px;font-size:clamp(9px,calc(var(--window-w) * .014),15px);}
 #result-dialog .result-report-actions{flex-wrap:wrap;}
 #result-dialog .result-report-actions button{padding:2px 4px;}
 #result-dialog .result-shares[open] #result-sources{position:static;box-shadow:none;padding:3px;}
}


/* Typography rhythm: based on the supplied black retro reference. */
#result-dialog .retro-titlebar {letter-spacing:.025em;}
#result-dialog .retro-titlebar strong {line-height:1.35;}
#result-dialog .retro-path {letter-spacing:0;}
#result-dialog .result-report-header>p:first-child,#result-dialog .result-artwork figcaption {letter-spacing:.025em;line-height:1.3;font-weight:400;}
#result-dialog .result-report-header>p:first-child {margin-bottom:4px;}
#result-dialog .result-body h3 {font:600 1em/1.35 var(--mono,monospace);letter-spacing:.015em;margin:0 0 .45em;}
#result-dialog #result-description,#result-dialog #result-evidence {line-height:1.5;letter-spacing:.012em;word-break:keep-all;overflow-wrap:break-word;}
#result-dialog #result-evidence {margin-top:.3em;}
#result-dialog .result-footnote {line-height:1.4;}
#result-dialog .result-signals>div {line-height:1.5;letter-spacing:.012em;}
#result-dialog .result-signals output {font-variant-numeric:tabular-nums;}
#result-dialog .result-signals dd {min-width:4ch;}
#result-dialog .result-report-header,#result-dialog .result-interpretation,#result-dialog .retro-parameters,#result-dialog .result-scan {flex:none;}
@media(min-width:760px) and (min-height:560px){
 #result-dialog .result-body {font-size:clamp(10px,calc(var(--window-w) * .0135),15px);line-height:1.4;}
 #result-dialog .result-report-reading {padding:6px 10px 8px;gap:clamp(6px,calc(var(--window-w) * .009),10px);}
 #result-dialog .result-report-plate {padding:6px 7px 7px;gap:8px;}
 #result-dialog .result-report-header {gap:5px;padding-bottom:8px;}
 #result-dialog .result-report-header>p:first-child {margin:0 -4px 4px;width:calc(100% + 8px);max-width:none;}
 #result-dialog .result-report-header>p:first-child,#result-dialog .result-artwork figcaption {font-size:1.17em;padding:5px 8px;}
 #result-dialog #result-cell {font-size:1em;line-height:1.4;}
 #result-dialog #result-title {font-size:1.38em;line-height:1.3;margin:1px 0;}
 #result-dialog #result-feelings {line-height:1.4;}
 #result-dialog .result-interpretation {gap:4px;}
 #result-dialog .retro-parameters {padding-top:7px;gap:3px;}
 #result-dialog .result-signals {gap:3px;padding:0 1px;}
 #result-dialog .result-scan {padding-top:7px;gap:4px;}
 #result-dialog .result-scan-data dl {line-height:1.4;gap:4px;}
 #result-dialog .result-artwork {gap:7px;}
 #result-dialog #result-music-recommendation {font-size:.91em;line-height:1.45;gap:5px!important;padding-top:7px!important;}
 #result-dialog .retro-footer {padding:4px 8px;gap:8px;line-height:1.35;}
}

/* Compact monochrome parameter gauges, using the existing live meter values. */
#result-dialog .result-signals>div{display:grid;grid-template-columns:minmax(0,42%) minmax(0,1fr);align-items:center;gap:8px;}
#result-dialog .result-signals dt{min-width:0;}
#result-dialog .result-signals dd{display:grid;grid-template-columns:minmax(0,1fr) 4.2ch;align-items:center;gap:9px;min-width:0;margin:0;}
#result-dialog .result-signals meter{display:block;appearance:none;-webkit-appearance:none;width:100%;min-width:0;height:7px;background:#242424;border:0;border-radius:0;grid-column:1;grid-row:1;}
#result-dialog .result-signals meter::-webkit-meter-bar{height:7px;background:#242424;border:1px solid #777;border-radius:0;box-shadow:none;}
#result-dialog .result-signals meter::-webkit-meter-optimum-value,#result-dialog .result-signals meter::-webkit-meter-suboptimum-value,#result-dialog .result-signals meter::-webkit-meter-even-less-good-value{background:#eee;border-radius:0;box-shadow:none;}
#result-dialog .result-signals meter::-moz-meter-bar{background:#eee;border-radius:0;}
#result-dialog .result-signals output{grid-column:2;grid-row:1;text-align:right;white-space:nowrap;}

`;
document.head.append(reportStyle);
const reportCaption=$("#result-artwork-title");
reportCaption.textContent="Result Preview";
reportCaption.dataset.ko="결과 미리보기";
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

// Reuse the original live report nodes and their existing event handlers.
const retroBar=document.createElement("header");retroBar.className="retro-titlebar";
const retroIcon=document.createElement("span");retroIcon.textContent="✱";retroIcon.setAttribute("aria-hidden","true");
const retroName=document.createElement("strong");retroName.textContent="Emotion-Lab 1.0 - Experiment Result";retroName.dataset.ko="Emotion-Lab 1.0 - 실험 결과";
const retroPath=document.createElement("span");retroPath.className="retro-path";retroPath.textContent="/usr/emotionlab/run [RESULT]";
retroBar.append(retroIcon,retroName,retroPath,$(".result-close"));resultDialog.prepend(retroBar);
const reportHeading=$(".result-report-header>p:first-child");reportHeading.textContent="EXPERIMENT RESULT";reportHeading.dataset.ko="실험 결과";
const readingHeading=$("#result-reading-title");readingHeading.textContent="Interpretation";readingHeading.dataset.ko="감정 해석";
const retroParameters=document.createElement("section");retroParameters.className="retro-parameters";
const parametersHeading=document.createElement("h3");parametersHeading.textContent="Parameters";parametersHeading.dataset.ko="분석 지표";
retroParameters.append(parametersHeading,$(".result-signals"));
const reportReading=$(".result-report-reading");reportReading.append(retroParameters);
$("#result-dialog .result-scan")?.remove();
const retroFooter=document.createElement("footer");retroFooter.className="retro-footer";
const retroReady=document.createElement("span");retroReady.className="retro-status";retroReady.textContent="Ready. | Commands:";retroReady.dataset.ko="분석 완료. | 명령:";
retroFooter.append(retroReady,$(".result-report-actions"),exportStatus);resultDialog.append(retroFooter);

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
 E01:["Worries","걱정","A melody that loses its way, then returns to a place it almost remembers.","길을 잃은 선율이 어렴풋이 기억나는 곳을 향해 다시 돌아가는 듯해요."],
 E02:["Earthquake","Earthquake","A quiet tremor grows into a weight too large to hold inside.","작은 떨림이 차오르다 마음 안에 다 담을 수 없는 무게가 되는 듯해요."],
 E03:["Rain Dance","Rain Dance","Scattered sparks flicker between the wish to begin and the fear of what comes next.","시작하고 싶은 마음과 다음 순간에 대한 두려움 사이로 작은 불꽃들이 흩어져요."],
 E04:["Water","Water","A ripple loosens the next, leaving room for a breath that was held too long.","하나의 물결이 다음 물결을 풀어주고, 오래 참았던 숨이 비로소 흘러나오는 듯해요."],
 E05:["Stay","Stay","A little warmth remains in a room even after the person it was meant for has left.","마음을 건네고 싶었던 사람이 떠난 자리에도 작은 온기가 남아 있는 듯해요."],
 E06:["Blink","Blink","A bright, restless pulse pushes outward, as if to protect something fragile within.","쉴 새 없이 솟아오르는 빛이 안쪽의 여린 무언가를 지키려는 듯해요."]
};
const resultBandcamp={E01:"--2",E02:"earthquake",E03:"rain-dance",E04:"water",E05:"stay-2",E06:"blink"};
let resultPreviewAudio=null, resultPreviewGeneration=0, resultPreviewCache=null;
function stopResultMusic(){
 resultArtworkPreview.classList.remove("kr-music-live");
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
  window[cb]=data=>{clean();resolve((data.results||[]).filter(x=>x.wrapperType==="track"&&x.kind==="song"&&x.artistName.toLowerCase()==="kirara"&&x.collectionName.toLowerCase()==="sarah"));};
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
 if(!section){section=document.createElement("section");section.id="result-music-recommendation";document.querySelector(".result-report-plate").append(section);}
 section.style.cssText="border-top:1px solid #666;margin-top:3px;padding-top:6px;display:grid;gap:4px;min-width:0";
 const heading=document.createElement("strong");heading.textContent=ko?"+ 추천 음악":"+ RECOMMENDED TRACK";
 const items=reading.ranked.slice(0,1).map(([sample,count])=>{
  const track=musicMatches[sample.id];if(!track)return null;
  const item=document.createElement("div");item.style.cssText="display:grid;gap:3px;margin:0";
  const name=document.createElement("strong");name.textContent="KIRARA — "+track[ko?1:0];name.style.color="#00dedd";
  const reason=document.createElement("p");reason.textContent=track[ko?3:2];
  const link=document.createElement("a");link.href="https://music.apple.com/us/album/sarah/1856541802";link.target="_blank";link.rel="noopener noreferrer";link.textContent=ko?"Apple Music에서 듣기 ↗":"OPEN IN APPLE MUSIC ↗";link.style.cssText="color:#aaa;text-decoration:underline;font-size:.85em";
  const row=document.createElement("div");row.style.cssText="display:flex;align-items:center;gap:8px;border:1px solid #666;padding:3px 5px;min-width:0";
  const play=document.createElement("button");play.type="button";play.dataset.listen=sample.id;play.dataset.idle=ko?"▶ 미리듣기":"▶ PREVIEW";play.textContent=play.dataset.idle;play.setAttribute("aria-pressed","false");play.style.cssText="border:1px solid #00aaaa;background:#000;color:#00dedd;font:inherit;padding:4px 7px;cursor:pointer;white-space:nowrap";
  const player=document.createElement("span");player.dataset.player="true";player.setAttribute("aria-live","polite");player.textContent="00:00 / 00:30";player.style.cssText="font-variant-numeric:tabular-nums;color:#bbb;min-width:0";
  play.addEventListener("click",async()=>{
   const active=play.getAttribute("aria-pressed")==="true";stopResultMusic();if(active)return;
   const generation=resultPreviewGeneration;play.setAttribute("aria-pressed","true");play.textContent=ko?"■ 정지":"■ STOP";player.textContent=ko?"불러오는 중":"LOADING";
   try{
    const tracks=await loadResultPreviews();if(generation!==resultPreviewGeneration||!resultDialog.open)return;
    const match=tracks.find(x=>x.trackName.toLowerCase()===track[0].toLowerCase()||x.trackName===track[1]);if(!match||!match.previewUrl)throw new Error("No preview");
    const audio=new Audio(match.previewUrl);resultPreviewAudio=audio;audio.volume=.45;
    const musicVisual=()=>{if(resultPreviewAudio===audio&&resultDialog.open&&!motion.matches)resultArtworkPreview.classList.toggle("kr-music-live",!audio.paused&&!audio.ended&&audio.readyState>=2);};
    for(const event of ["playing","pause","waiting","ended","error"])audio.addEventListener(event,musicVisual);
    const finish=()=>{if(resultPreviewAudio===audio)stopResultMusic();};
    audio.addEventListener("timeupdate",()=>{if(resultPreviewAudio!==audio)return;const limit=Math.min(30,Number.isFinite(audio.duration)?audio.duration:30);if(audio.currentTime>=limit){finish();return;}player.textContent="00:"+String(Math.floor(audio.currentTime)).padStart(2,"0")+" / 00:"+String(Math.floor(limit)).padStart(2,"0");});
    audio.addEventListener("ended",finish);audio.addEventListener("error",()=>{if(resultPreviewAudio===audio){finish();player.textContent=ko?"재생 불가":"UNAVAILABLE";}});
    await audio.play();
   }catch(e){if(generation===resultPreviewGeneration){stopResultMusic();player.textContent=ko?"미리듣기 불가 · 링크 이용":"UNAVAILABLE · USE LINK";}}
  });
  row.append(play,player);row.append(link);link.style.marginLeft="auto";
  const cover=document.createElement("div");cover.style.cssText="width:clamp(48px,8dvh,66px);aspect-ratio:1;position:relative;display:grid;place-items:center;border:1px solid #666;background:#101010;overflow:hidden;align-self:start;color:#aaa;font-size:9px;text-align:center";
  cover.textContent="KIRARA / SARAH";
  const info=document.createElement("div");info.style.cssText="display:grid;gap:3px;min-width:0;align-content:start";
  const album=document.createElement("small");album.textContent="Sarah · KIRARA";album.style.color="#aaa";
  info.append(name,album,reason);
  const card=document.createElement("div");card.style.cssText="display:grid;grid-template-columns:auto minmax(0,1fr);gap:8px;align-items:start;min-width:0";card.append(cover,info);
  loadResultPreviews().then(tracks=>{
   const match=tracks.find(x=>x.trackName.toLowerCase()===track[0].toLowerCase()||x.trackName===track[1]);
   const art=(match||tracks.find(x=>x.artworkUrl100))?.artworkUrl100;
   if(!art)return;
   const image=document.createElement("img");image.alt=ko?"Sarah 앨범 커버":"Sarah album cover";image.style.cssText="position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000";
   image.addEventListener("load",()=>cover.replaceChildren(image),{once:true});image.src=art.replace(/^http:/,"https:");
   if(match?.trackViewUrl)link.href=match.trackViewUrl;
  }).catch(()=>{});
  item.append(card,row);return item;
 }).filter(Boolean);
 const note=document.createElement("small");note.textContent=ko?"Apple Music 미리듣기 · 최대 30초 · 예술적 해석":"Apple Music preview · up to 30 sec · Artistic interpretation";
 section.replaceChildren(heading,...items,note);
 loadResultPreviews().catch(()=>{});
}

function renderExperiment(result){
  const {reading,slot,layers,artwork}=result;
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
  retroPath.textContent="/usr/emotionlab/run/cell_"+slot.toLowerCase()+" [RESULT]";
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

// Non-destructive terminal typing: preserve text, layout, controls and live values.
const terminalRuns=new WeakMap();
let bootTypingAudio=null;
function stopBootTyping(){if(bootTypingAudio){bootTypingAudio.pause();bootTypingAudio=null;}}
function terminalType(root,selectors,limit=1450,withSound=false){
  if(motion.matches||!root)return;
  terminalRuns.get(root)?.();
  const nodes=[],seen=new Set();
  for(const el of root.querySelectorAll(selectors)){
    if(el.closest('[hidden],details:not([open]) > :not(summary)')||!el.getClientRects().length)continue;
    const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);
    while(walker.nextNode()){
      const n=walker.currentNode;
      if(seen.has(n)||!n.data.trim()||n.parentElement.closest('script,style,canvas,output,[data-player],[data-listen]'))continue;
      seen.add(n);nodes.push(n);
    }
  }
  const chars=[],wraps=[];
  for(const n of nodes){
    const wrap=document.createElement('span');wrap.className='kr-type-run';
    const original=n.data;
    for(const ch of Array.from(original)){
      if(/\s/.test(ch)){wrap.append(document.createTextNode(ch));continue;}
      const span=document.createElement('span');span.textContent=ch;span.className='kr-type-char';wrap.append(span);chars.push(span);
    }
    n.replaceWith(wrap);wraps.push([wrap,original]);
  }
  if(!chars.length)return;
  // Typing bursts aligned with the supplied recording's audible sections.
  const bursts=withSound?[[0,.37],[.49,.61],[.72,2.14],[2.27,2.57],[2.71,3.00],[3.40,4.36],[4.46,5.09],[5.26,5.68],[5.92,6.41],[6.55,6.96]]:[[0,.32],[.46,.79],[.98,1.38],[1.55,2.05],[2.25,2.65]];
  const scale=withSound?1:Math.max(1,limit/2650),active=bursts.reduce((v,[a,b])=>v+b-a,0);
  const weights=chars.map(()=>.65+Math.random()*.7),sum=weights.reduce((a,b)=>a+b,0);let acc=0;
  const times=weights.map(w=>{acc+=w;let x=acc/sum*active;for(const [a,b] of bursts){if(x<=b-a)return (a+x)*1000*scale;x-=b-a;}return bursts.at(-1)[1]*1000*scale;});
  let idx=0,raf=0,previous=null,origin=performance.now(),closed=false;
  const cursor=document.createElement('span');cursor.className='kr-type-cursor';cursor.setAttribute('aria-hidden','true');
  const clean=()=>{if(closed)return;closed=true;cancelAnimationFrame(raf);cursor.remove();for(const [w,t] of wraps)if(w.isConnected)w.replaceWith(document.createTextNode(t));terminalRuns.delete(root);if(withSound)stopBootTyping();};
  terminalRuns.set(root,clean);
  if(withSound){stopBootTyping();const clip=new Audio('data:audio/mpeg;base64,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');bootTypingAudio=clip;clip.volume=.65;clip.play().catch(()=>{});}
  function tick(now){if(closed)return;const elapsed=now-origin;let changed=false;while(idx<chars.length&&times[idx]<=elapsed){const ch=chars[idx++];ch.classList.add('kr-type-visible');if(ch.isConnected){previous=ch;changed=true;}}if(changed&&previous)previous.after(cursor);if(idx===chars.length&&elapsed>times.at(-1)+350){clean();return;}raf=requestAnimationFrame(tick);}
  raf=requestAnimationFrame(tick);
}
const fxStyle=document.createElement('style');fxStyle.textContent=`
.kr-type-char{opacity:0}.kr-type-char.kr-type-visible{opacity:1}.kr-type-cursor{display:inline-block;position:absolute;width:.55em;height:1em;background:currentColor;pointer-events:none;animation:kr-cursor-blink .52s steps(1,end) infinite;vertical-align:baseline}.kr-type-run{position:relative}@keyframes kr-cursor-blink{0%,100%{opacity:1}50%{opacity:0}}
@keyframes kr-type-in{from{opacity:0}to{opacity:1}}
@keyframes kr-boot-glitch{0%,100%{opacity:1;filter:none}12%{opacity:.5;filter:brightness(2)}24%{opacity:1;filter:drop-shadow(3px 0 #00dddd)}38%{opacity:.75;filter:drop-shadow(-3px 0 #ff36ad)}55%{opacity:1;filter:none}70%{opacity:.85;filter:brightness(1.6)}}
#result-artwork-preview.kr-music-live canvas{animation:kr-music-pulse .54s ease-in-out infinite,kr-music-jitter 2.17s steps(1,end) infinite;transform-origin:center;will-change:transform,filter}
#result-artwork-preview.kr-music-live:after{content:"";position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,transparent 0 5px,rgba(120,230,255,.07) 6px,transparent 7px 13px);mix-blend-mode:screen;animation:kr-scan-noise .83s steps(5,end) infinite}
@keyframes kr-music-pulse{0%,100%{scale:1;filter:saturate(1) brightness(1)}35%{scale:1.045;filter:saturate(1.35) brightness(1.15) drop-shadow(0 0 7px rgba(255,65,190,.36)) drop-shadow(0 0 12px rgba(20,230,255,.22))}65%{scale:1.012;filter:saturate(1.13) brightness(1.04)}}
@keyframes kr-music-jitter{0%,68%,84%,100%{translate:0 0}72%{translate:3px -1px}76%{translate:-3px 1px}80%{translate:1px 0}}
@keyframes kr-scan-noise{0%,80%,100%{opacity:0}40%{opacity:.5}90%{opacity:.8}}
@media(prefers-reduced-motion:reduce){.kr-type-char,#result-artwork-preview.kr-music-live canvas,#result-artwork-preview.kr-music-live:after{animation:none!important}}
`;document.head.append(fxStyle);
function revealLabText(){
 if(motion.matches)return;
 for(const {button} of cells.values()){
   const delay=100+Math.random()*850;
   button.animate([{opacity:1,filter:'none'},{opacity:.55,filter:'brightness(1.8) drop-shadow(3px 0 #00dddd)'},{opacity:1,filter:'drop-shadow(-2px 0 #ff36ad)'},{opacity:.78,filter:'brightness(1.4)'},{opacity:1,filter:'none'}],{duration:180+Math.random()*220,delay,easing:'steps(2,end)'});
 }
}
new MutationObserver(()=>{
 if(resultDialog.open){terminalType(resultDialog,'.retro-titlebar,.retro-header,.retro-footer,.result-report-header,.result-interpretation h3,.result-interpretation p,.result-shares summary,.retro-parameters h3,.result-signals dt,#result-artwork-title,#result-music-recommendation strong,#result-music-recommendation p,#result-music-recommendation small',4800);audio.cue("labText",{level:.55});}
 else{terminalRuns.get(resultDialog)?.();resultArtworkPreview.classList.remove('kr-music-live');}
}).observe(resultDialog,{attributes:true,attributeFilter:['open']});

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
    terminalRuns.get(document.body)?.();
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
