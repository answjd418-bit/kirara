"use strict";
// Individual PNG files from the supplied element pack, grouped by emotion.
const motifFiles = {
  "E05": [
    "elements/set01_cyan/set01_cyan_001.png",
    "elements/set01_cyan/set01_cyan_002.png",
    "elements/set01_cyan/set01_cyan_003.png",
    "elements/set01_cyan/set01_cyan_004.png",
    "elements/set01_cyan/set01_cyan_005.png",
    "elements/set01_cyan/set01_cyan_006.png",
    "elements/set01_cyan/set01_cyan_007.png",
    "elements/set01_cyan/set01_cyan_008.png",
    "elements/set01_cyan/set01_cyan_009.png",
    "elements/set01_cyan/set01_cyan_010.png",
    "elements/set01_cyan/set01_cyan_011.png",
    "elements/set01_cyan/set01_cyan_012.png",
    "elements/set01_cyan/set01_cyan_013.png",
    "elements/set01_cyan/set01_cyan_014.png",
    "elements/set01_cyan/set01_cyan_015.png",
    "elements/set01_cyan/set01_cyan_016.png",
    "elements/set01_cyan/set01_cyan_017.png",
    "elements/set01_cyan/set01_cyan_018.png",
    "elements/set01_cyan/set01_cyan_019.png",
    "elements/set01_cyan/set01_cyan_020.png",
    "elements/set01_cyan/set01_cyan_021.png",
    "elements/set01_cyan/set01_cyan_022.png",
    "elements/set01_cyan/set01_cyan_023.png",
    "elements/set01_cyan/set01_cyan_024.png",
    "elements/set01_cyan/set01_cyan_025.png",
    "elements/set01_cyan/set01_cyan_026.png",
    "elements/set01_cyan/set01_cyan_027.png",
    "elements/set01_cyan/set01_cyan_028.png",
    "elements/set01_cyan/set01_cyan_029.png",
    "elements/set01_cyan/set01_cyan_030.png",
    "elements/set01_cyan/set01_cyan_031.png",
    "elements/set01_cyan/set01_cyan_032.png",
    "elements/set01_cyan/set01_cyan_033.png",
    "elements/set01_cyan/set01_cyan_034.png"
  ],
  "E03": [
    "elements/set02_pink/set02_pink_001.png",
    "elements/set02_pink/set02_pink_002.png",
    "elements/set02_pink/set02_pink_003.png",
    "elements/set02_pink/set02_pink_004.png",
    "elements/set02_pink/set02_pink_005.png",
    "elements/set02_pink/set02_pink_006.png",
    "elements/set02_pink/set02_pink_007.png",
    "elements/set02_pink/set02_pink_008.png",
    "elements/set02_pink/set02_pink_009.png",
    "elements/set02_pink/set02_pink_010.png",
    "elements/set02_pink/set02_pink_011.png",
    "elements/set02_pink/set02_pink_012.png",
    "elements/set02_pink/set02_pink_013.png",
    "elements/set02_pink/set02_pink_014.png",
    "elements/set02_pink/set02_pink_015.png",
    "elements/set02_pink/set02_pink_016.png",
    "elements/set02_pink/set02_pink_017.png",
    "elements/set02_pink/set02_pink_018.png",
    "elements/set02_pink/set02_pink_019.png",
    "elements/set02_pink/set02_pink_020.png",
    "elements/set02_pink/set02_pink_021.png",
    "elements/set02_pink/set02_pink_022.png",
    "elements/set02_pink/set02_pink_023.png",
    "elements/set02_pink/set02_pink_024.png"
  ],
  "E04": [
    "elements/set03_white/set03_white_001.png",
    "elements/set03_white/set03_white_002.png",
    "elements/set03_white/set03_white_003.png",
    "elements/set03_white/set03_white_004.png",
    "elements/set03_white/set03_white_005.png",
    "elements/set03_white/set03_white_006.png",
    "elements/set03_white/set03_white_007.png",
    "elements/set03_white/set03_white_008.png",
    "elements/set03_white/set03_white_009.png",
    "elements/set03_white/set03_white_010.png",
    "elements/set03_white/set03_white_011.png",
    "elements/set03_white/set03_white_012.png",
    "elements/set03_white/set03_white_013.png",
    "elements/set03_white/set03_white_014.png",
    "elements/set03_white/set03_white_015.png",
    "elements/set03_white/set03_white_016.png",
    "elements/set03_white/set03_white_017.png",
    "elements/set03_white/set03_white_018.png",
    "elements/set03_white/set03_white_019.png",
    "elements/set03_white/set03_white_020.png",
    "elements/set03_white/set03_white_021.png",
    "elements/set03_white/set03_white_022.png",
    "elements/set03_white/set03_white_023.png",
    "elements/set03_white/set03_white_024.png",
    "elements/set03_white/set03_white_025.png",
    "elements/set03_white/set03_white_026.png",
    "elements/set03_white/set03_white_027.png",
    "elements/set03_white/set03_white_028.png",
    "elements/set03_white/set03_white_029.png",
    "elements/set03_white/set03_white_030.png",
    "elements/set03_white/set03_white_031.png",
    "elements/set03_white/set03_white_032.png",
    "elements/set03_white/set03_white_033.png",
    "elements/set03_white/set03_white_034.png",
    "elements/set03_white/set03_white_035.png",
    "elements/set03_white/set03_white_036.png",
    "elements/set03_white/set03_white_037.png",
    "elements/set03_white/set03_white_038.png",
    "elements/set03_white/set03_white_039.png",
    "elements/set03_white/set03_white_040.png",
    "elements/set03_white/set03_white_041.png"
  ],
  "E01": [
    "elements/set04_blue/set04_blue_001.png",
    "elements/set04_blue/set04_blue_002.png",
    "elements/set04_blue/set04_blue_003.png",
    "elements/set04_blue/set04_blue_004.png",
    "elements/set04_blue/set04_blue_005.png",
    "elements/set04_blue/set04_blue_006.png",
    "elements/set04_blue/set04_blue_007.png",
    "elements/set04_blue/set04_blue_008.png",
    "elements/set04_blue/set04_blue_009.png",
    "elements/set04_blue/set04_blue_010.png",
    "elements/set04_blue/set04_blue_011.png",
    "elements/set04_blue/set04_blue_012.png",
    "elements/set04_blue/set04_blue_013.png",
    "elements/set04_blue/set04_blue_014.png",
    "elements/set04_blue/set04_blue_015.png",
    "elements/set04_blue/set04_blue_016.png",
    "elements/set04_blue/set04_blue_017.png",
    "elements/set04_blue/set04_blue_018.png",
    "elements/set04_blue/set04_blue_019.png",
    "elements/set04_blue/set04_blue_020.png",
    "elements/set04_blue/set04_blue_021.png",
    "elements/set04_blue/set04_blue_022.png",
    "elements/set04_blue/set04_blue_023.png",
    "elements/set04_blue/set04_blue_024.png",
    "elements/set04_blue/set04_blue_025.png",
    "elements/set04_blue/set04_blue_026.png",
    "elements/set04_blue/set04_blue_027.png",
    "elements/set04_blue/set04_blue_028.png",
    "elements/set04_blue/set04_blue_029.png",
    "elements/set04_blue/set04_blue_030.png"
  ],
  "E02": [
    "elements/set05_redyellow/set05_redyellow_001.png",
    "elements/set05_redyellow/set05_redyellow_002.png",
    "elements/set05_redyellow/set05_redyellow_003.png",
    "elements/set05_redyellow/set05_redyellow_004.png",
    "elements/set05_redyellow/set05_redyellow_005.png",
    "elements/set05_redyellow/set05_redyellow_006.png",
    "elements/set05_redyellow/set05_redyellow_007.png",
    "elements/set05_redyellow/set05_redyellow_008.png",
    "elements/set05_redyellow/set05_redyellow_009.png",
    "elements/set05_redyellow/set05_redyellow_010.png",
    "elements/set05_redyellow/set05_redyellow_011.png",
    "elements/set05_redyellow/set05_redyellow_012.png",
    "elements/set05_redyellow/set05_redyellow_013.png",
    "elements/set05_redyellow/set05_redyellow_014.png",
    "elements/set05_redyellow/set05_redyellow_015.png",
    "elements/set05_redyellow/set05_redyellow_016.png",
    "elements/set05_redyellow/set05_redyellow_017.png",
    "elements/set05_redyellow/set05_redyellow_018.png",
    "elements/set05_redyellow/set05_redyellow_019.png",
    "elements/set05_redyellow/set05_redyellow_020.png"
  ],
  "E06": [
    "elements/set06_red/set06_red_001.png",
    "elements/set06_red/set06_red_002.png",
    "elements/set06_red/set06_red_003.png",
    "elements/set06_red/set06_red_004.png",
    "elements/set06_red/set06_red_005.png",
    "elements/set06_red/set06_red_006.png",
    "elements/set06_red/set06_red_007.png",
    "elements/set06_red/set06_red_008.png",
    "elements/set06_red/set06_red_009.png",
    "elements/set06_red/set06_red_010.png",
    "elements/set06_red/set06_red_011.png",
    "elements/set06_red/set06_red_012.png",
    "elements/set06_red/set06_red_013.png",
    "elements/set06_red/set06_red_014.png",
    "elements/set06_red/set06_red_015.png",
    "elements/set06_red/set06_red_016.png",
    "elements/set06_red/set06_red_017.png",
    "elements/set06_red/set06_red_018.png",
    "elements/set06_red/set06_red_019.png",
    "elements/set06_red/set06_red_020.png",
    "elements/set06_red/set06_red_021.png",
    "elements/set06_red/set06_red_022.png",
    "elements/set06_red/set06_red_023.png",
    "elements/set06_red/set06_red_024.png",
    "elements/set06_red/set06_red_025.png",
    "elements/set06_red/set06_red_026.png",
    "elements/set06_red/set06_red_027.png",
    "elements/set06_red/set06_red_028.png",
    "elements/set06_red/set06_red_029.png",
    "elements/set06_red/set06_red_030.png"
  ]
};

async function loadMotifs(id) {
  const files = motifFiles[id] || [];
  const results = await Promise.allSettled(files.map(async path => {
    const image = new Image();
    image.src = new URL(path, document.baseURI).href;
    await image.decode();
    return prepareIndividualMotif(image);
  }));
  const textures = results.filter(r => r.status === "fulfilled" && r.value).map(r => r.value);
  const missing = results.length - textures.length;
  if (missing) console.warn(id + ": " + missing + " element PNGs failed to load");
  if (!textures.length) throw new Error("Missing motifs in " + id);
  return {textures, missing};
}

function prepareIndividualMotif(image) {
  const texture = document.createElement("canvas");
  const gray = document.createElement("canvas");
  texture.width = gray.width = image.naturalWidth;
  texture.height = gray.height = image.naturalHeight;
  const pen = texture.getContext("2d");
  pen.drawImage(image, 0, 0);
  const pixels = pen.getImageData(0, 0, texture.width, texture.height);
  const data = pixels.data;
  let peak = 0;
  // The supplied PNG pack stores original black-background RGB and uses
  // max(R,G,B) as alpha. Undo this double attenuation for screen blending.
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (!a) continue;
    peak = Math.max(peak, a / 255);
    for (let c = 0; c < 3; c++) data[i+c] = Math.min(255, Math.round(data[i+c] * 255 / a));
  }
  if (!peak) return null;
  pen.putImageData(pixels, 0, 0);
  for (let i = 0; i < data.length; i += 4) {
    if (data[i+3]) data[i] = data[i+1] = data[i+2] = 255;
  }
  gray.getContext("2d").putImageData(pixels, 0, 0);
  return {texture, gray, peak};
}

function drawMotif(pen, texture, size, dx=0, dy=0) {
  const scale = size / Math.max(texture.width, texture.height);
  const width = texture.width * scale, height = texture.height * scale;
  pen.drawImage(texture, -width/2+dx, -height/2+dy, width, height);
}
