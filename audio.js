"use strict";

const clips = {
  boot: [0, .370],
  progress: [.400, .460],
  arrival: [.890, .720],
  labText: [1.640, .320],
  element: [1.990, .180],
  example: [2.200, .170],
  button: [2.820, .200],
  scan: [3.050, .584],
  experiment: [3.664, 2.619],
  power: [6.313, 1.793],
  result: [8.136, 2.003],
  typing: [10.169, 8.09796875],
  warning: [18.29696875, .632],
};

const terminalDuration = 8350;
const keyboardAttacks = [
  454,546,602,718,798,926,1030,1170,1250,1356,1476,1598,1690,1768,
  1846,1902,2010,2074,2144,2206,2260,2312,2388,2456,2560,2708,2810,
  2944,2996,3142,3254,3394,3842,3932,4000,4088,4138,4214,4292,4396,
  4470,4552,4616,4670,4746,4898,5000,5082,5138,5250,5352,5428,5476,
  5696,5802,5856,5946,6010,6104,6366,6468,6574,6694,6786,6846,6988,
  7038,7140,7238,7310,
];

function typedCharacterCount(elapsed, total) {
  // Reveal the text in bursts on the original recording's key attacks.
  const nextAttack = keyboardAttacks.findIndex(attack=>attack>elapsed);
  return nextAttack<0?total:Math.floor(total*nextAttack/keyboardAttacks.length);
}

// Transient positions in the trimmed files, relative to playback start.
const scanImpacts = {
  scan: [.010,.077,.147,.219,.278,.359,.428,.496],
  experiment: [.012,.218,.286,.432,.503,.67,1.344,1.449,1.52,1.588,1.663,1.735,1.802,1.875,1.952,2.034,2.096,2.174,2.268,2.348,2.418,2.515],
};
for (const mode of Object.keys(scanImpacts)) {
  scanImpacts[mode] = scanImpacts[mode].map((offset,index)=>({offset,strong:index%3===0}));
}

class FragmentAudio {
  constructor() {
    this.AudioContext = window.AudioContext || window.webkitAudioContext;
    this.context = null;
    this.master = null;
    this.buffer = null;
    this.individual = {};
    const names = {boot:"인트로화면",progress:"프로그래스바",arrival:"페이지입장",labText:"글자써지는거",element:"요소클릭",button:"버튼클릭",scan:"스캔",experiment:"실험",power:"화면켜지는",result:"팝업",typing:"인트로타자",warning:"경고"};
    this.individualData = this.AudioContext ? Promise.all(Object.entries(names).map(async ([key,name])=>{
      for(const filename of [...new Set([name.normalize("NFD"),name.normalize("NFC")])]){
        try { const response=await fetch("./"+encodeURIComponent(filename+".mp3")); if(response.ok) return [key,await response.arrayBuffer()]; } catch {}
      }
      return [key,null];
    })) : Promise.resolve([]);
    this.samplesReady = null;
    this.scene = null;
    this.typing = null;
    this.data = this.AudioContext
      ? fetch("sound/lab-alert-audio.wav").then(response=>response.ok?response.arrayBuffer():null).catch(()=>null)
      : Promise.resolve(null);
  }

  get available() {
    return Boolean(this.AudioContext);
  }

  get playing() {
    return this.context?.state === "running";
  }

  async enable(interactive) {
    if (!this.available) return false;
    try {
      if (!this.context) {
        this.context = new this.AudioContext();
        this.master = this.context.createGain();
        this.master.gain.value = .40;
        this.master.connect(this.context.destination);
        this.samplesReady = this.data.then(bytes=>{
          if (!bytes) return;
          return new Promise(resolve=>{
            this.context.decodeAudioData(bytes,buffer=>{
              this.buffer = buffer;
              resolve();
            },resolve);
          });
        }).catch(()=>{});
        this.individualData.then(entries=>Promise.all(entries.map(async ([key,bytes])=>{
          if(bytes) try { this.individual[key]=await this.context.decodeAudioData(bytes); } catch {}
        }))).catch(()=>{});
      }
      if(interactive && !this.playing) await this.context.resume();
      return this.playing;
    } catch {
      return false;
    }
  }

  cue(name, {level=1, delay=0, skip=0}={}) {
    if (!this.playing || document.hidden) return null;
    const individual = this.individual[name];
    const buffer = this.buffer || individual;
    if (!buffer) return null;
    const [offset, length] = this.buffer ? clips[name] : [0, individual.duration];
    if (skip >= length) return null;
    const at = this.context.currentTime + delay;
    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    source.buffer = buffer;
    gain.gain.value = level;
    source.connect(gain);
    gain.connect(this.master);
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
    };
    source.start(at,offset+skip,length-skip);
    return source;
  }

  startTyping(elapsed) {
    if (!this.typing) this.typing = this.cue("typing",{level:.84,skip:elapsed/1000});
  }

  stopTyping() {
    if (!this.typing) return;
    this.typing.stop();
    this.typing = null;
  }

  startScan(mode, elapsed=0) {
    this.stopScene();
    this.scene = this.cue(mode,{skip:elapsed});
  }

  stopScene() {
    if (!this.scene) return;
    this.scene.stop();
    this.scene = null;
  }
}
