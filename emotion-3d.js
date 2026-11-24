import * as THREE from 'three';
import {mountAsset} from './threeui-viewer.js';

export async function mountEmotion(host,result){
  const {layers,frame}=result;
  const basis=Math.min(frame.width,frame.height);
  return mountAsset(host,async()=>{
    const root=new THREE.Group();
    const textures=[];
    const count=layers.length;
    const depth=.34;
    for(const [i,layer] of layers.entries()){
      const source=layer.texture.texture;
      const texture=new THREE.CanvasTexture(source);
      texture.colorSpace=THREE.SRGBColorSpace;
      textures.push(texture);
      const scale=layer.size*1.02/Math.max(source.width,source.height);
      const geometry=new THREE.PlaneGeometry(source.width*scale,source.height*scale);
      const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,opacity:.94,depthWrite:false,side:THREE.DoubleSide,toneMapped:false,blending:THREE.CustomBlending,blendSrc:THREE.OneFactor,blendDst:THREE.OneMinusSrcColorFactor,blendEquation:THREE.AddEquation,premultipliedAlpha:true});
      const mesh=new THREE.Mesh(geometry,material);
      const phase=i*1.45;
      mesh.position.set((layer.x-.5)*frame.width/basis+Math.sin(phase)*.026,-(layer.y-.5)*frame.height/basis-Math.cos(phase*.79)*.031,count===1?0:(i/(count-1)-.5)*depth);
      mesh.rotation.z=-(layer.angle+Math.sin(phase*.51)*.08);
      root.add(mesh);
    }
    // Preserve the connecting curves in the original composition.
    const points=root.children.map(o=>o.position.clone());
    for(let i=1;i<points.length;i++){
      const a=points[i-1],b=points[i];
      if(layers[i-1].sample===layers[i].sample||Math.hypot(a.x-b.x,a.y-b.y)>.84)continue;
      const bow=.085*Math.sin(i);
      const middle=a.clone().add(b).multiplyScalar(.5);middle.x-=bow;middle.y-=bow;
      const curve=new THREE.QuadraticBezierCurve3(a,middle,b);
      const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(40)),new THREE.LineDashedMaterial({color:layers[i].sample.color,transparent:true,opacity:.45,dashSize:.003,gapSize:.006,depthWrite:false,toneMapped:false}));
      line.computeLineDistances();root.add(line);
    }
    return {root,viewDirection:new THREE.Vector3(0,0,1),dispose(){for(const texture of textures)texture.dispose();}};
  },{family:'emotion',controls:true,background:'transparent'});
}
