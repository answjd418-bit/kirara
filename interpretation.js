"use strict";

const fragmentEmotions = {
  E01: {name:["Ebb of certitude","길을 잃은 듯한 막막함"],title:["A Familiar Street at an Unfamiliar Hour","낯선 시간에 돌아온 익숙한 골목"],description:["The familiar seems slightly out of reach. A quiet uncertainty lingers while you wait for your bearings to return.","익숙했던 것이 잠시 멀어진 것 같아요. 어디로 가야 할지 감이 돌아오기를 기다리는 동안 조용한 막막함이 남아요."]},
  E02: {name:["Pressure and urgency","부담감과 조급함"],title:["The Afternoon Before the Storm","소나기가 쏟아지기 직전의 오후"],description:["Several demands seem to arrive at once. The feeling builds from mild pressure into the urge to respond before there is time to breathe.","여러 요구가 한꺼번에 밀려오는 듯해요. 작은 부담이 쌓이면서 숨을 고르기도 전에 무엇이든 해야 할 것 같은 조급함이 생겨요."]},
  E03: {name:["Anticipation and unease","기대감과 불안"],title:["A Flutter Just Before the Lights Go Out","불이 꺼지기 직전의 설렘"],description:["The next moment feels promising and unpredictable at the same time. What makes it exciting is also what keeps you on edge.","다음 순간이 기대되면서도 어떻게 흘러갈지 알 수 없어요. 마음을 들뜨게 하는 바로 그 기대 때문에 조금 긴장하게 돼요."]},
  E04: {name:["Relief and release","안도감과 해방감"],title:["The First Breath Through an Open Window","창문을 열고 들이마신 첫 숨"],description:["Tension gives way gradually, as if you can finally put something down. The space it leaves feels unusually wide.","마침내 무언가를 내려놓아도 되는 것처럼 긴장이 조금씩 풀려요. 그 자리에 생긴 여백이 유난히 넓게 느껴져요."]},
  E05: {name:["Tenderness and longing","다정함과 그리움"],title:["Warmth Left in an Empty Room","빈방에 남은 다정함"],description:["The impulse to care remains after the moment has passed. A little warmth stays close, with a trace of longing just behind it.","시간이 지난 뒤에도 마음을 써주고 싶은 감각이 남아요. 가까이 머무는 온기 뒤로 아주 조금의 그리움이 따라와요."]},
  E06: {name:["Pride and defensiveness","자부심과 경계심"],title:["Holding Your Head High in the Heat","열기 속에서 고개를 드는 마음"],description:["There is a wish to stand firm and be seen. That self-assurance brings a little heat with it, especially where the resolve starts to feel fragile.","굳게 서서 자신을 드러내고 싶은 마음이 있어요. 그 결심이 조금 흔들리는 자리에서는 자신감에 달아오른 경계심이 겹쳐요."]}
};

const fragmentPairs = {
  "E01-E02":["Too Much Noise on a Street You Don’t Know","낯선 골목에 한꺼번에 밀려온 소음"],
  "E01-E03":["A Flicker Waiting for a Direction","어디로 갈지 모르는 설렘"],
  "E01-E04":["The Ease of Taking the Long Way Home","길을 잃고도 발걸음이 가벼워지는 저녁"],
  "E01-E05":["A Warm Light You Can’t Quite Reach","닿을 듯 멀어지는 창가의 온기"],
  "E01-E06":["Holding Your Head High in the Fog","안개 속에서도 고개를 드는 마음"],
  "E02-E03":["When the Fireworks Come Too Soon","너무 일찍 터져버린 불꽃"],
  "E02-E04":["Quiet Arriving All at Once","한꺼번에 밀려온 고요"],
  "E02-E05":["The Weight of Keeping a Light On","불을 켜 두는 마음의 무게"],
  "E02-E06":["A Steady Voice in Rising Heat","열기 속에서 흔들리지 않으려는 목소리"],
  "E03-E04":["A Shiver in the First Cool Air","한숨 돌린 뒤 찾아온 설렘"],
  "E03-E05":["Warmth at the Edge of a Startle","놀란 마음의 가장자리에 번진 온기"],
  "E03-E06":["A Bright Feeling Held Too Tightly","너무 꼭 쥐어버린 설렘"],
  "E04-E05":["The Warmth of Finally Letting Go","놓아준 뒤에 남은 다정함"],
  "E04-E06":["The Relief of Lowering Your Guard","고개를 숙여도 괜찮아지는 순간"],
  "E05-E06":["Tenderness Behind a Firm Reply","단단한 대답 뒤에 숨은 다정함"]
};

function interpretFragments(sources,values) {
  const ranked=[...sources].sort((a,b)=>b[1]-a[1]);
  const [leading,runnerUp]=ranked;
  const first=fragmentEmotions[leading[0].id];
  const second=runnerUp?fragmentEmotions[runnerUp[0].id]:null;
  const key=runnerUp?[leading[0].id,runnerUp[0].id].sort().join("-"):null;
  const balanced=Boolean(runnerUp&&runnerUp[1]===leading[1]);
  return {ranked,first,second,title:key?fragmentPairs[key]:first.title,balanced,values};
}
