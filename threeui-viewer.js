import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';

/** Stage-only controls. The factory's root can be mounted in any Three.js scene. */
export async function mountAsset(host,createAsset,{family='',controls=true,background='dark'}={}){
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(new URLSearchParams(location.search).has('capture')?1:Math.min(devicePixelRatio||1,2));
 if('outputColorSpace'in renderer)renderer.outputColorSpace=THREE.SRGBColorSpace;else renderer.outputEncoding=THREE.sRGBEncoding;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=family==='kibori'?1.35:family==='oblo'?1.2:1.05;
 renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label','Interactive 3D object. Drag to rotate, wheel to zoom, arrow keys to rotate, R to reset.');host.append(renderer.domElement);
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(32,1,.01,1000),orbit=new OrbitControls(camera,renderer.domElement);
 orbit.enableDamping=true;orbit.dampingFactor=.1;orbit.enablePan=false;orbit.rotateSpeed=.6;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),capture=new URLSearchParams(location.search).has('capture');orbit.enableRotate=!capture;
 let disposed=false,raf=0,last=0,visible=true,time=0,manual=0;
 const asset=await createAsset(renderer);
 const root=new THREE.Group();root.add(asset.root);scene.add(root);
 const box=new THREE.Box3().setFromObject(asset.root),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
 if(box.isEmpty()||!Number.isFinite(size.length())||size.length()===0)throw Error('Object has no finite geometry');
 asset.root.position.sub(center);
 const normalize=2.7/Math.max(size.x,size.y,size.z);root.scale.setScalar(normalize);size.multiplyScalar(normalize);
 let environment;
 if(asset.environment)scene.environment=asset.environment;
 else{const room=new RoomEnvironment(),pm=new THREE.PMREMGenerator(renderer);environment=pm.fromScene(room,.04);scene.environment=environment.texture;room.dispose?.();pm.dispose();}
 const key=new THREE.DirectionalLight(family==='kibori'?0xffe1b5:0xffffff,2.7);key.position.set(-3,5,6);
 const fill=new THREE.DirectionalLight(family==='aureon'?0x5ccbcf:0xb9cbdc,1.15);fill.position.set(4,1,3);
 const rim=new THREE.DirectionalLight(family==='aureon'?0xffcd82:0xffe0ae,1.7);rim.position.set(3,4,-4);
 if(asset.lights?.length){const rig=new THREE.Group();rig.position.copy(center).multiplyScalar(-normalize);rig.scale.setScalar(normalize);for(const light of asset.lights){rig.add(light);if(light.target)rig.add(light.target);if(light.isPointLight&&light.distance)light.distance*=normalize;}scene.add(rig);}else scene.add(key,fill,rim,new THREE.HemisphereLight(0xe7ecf1,0x282018,.7));
 if(background!=='transparent')scene.background=new THREE.Color(background==='light'?'#ece8df':family==='oblo'?'#082a57':family==='kibori'?'#17120d':family==='dayward'?'#11151a':family==='aureon'?'#07121a':'#14171b');
 const direction=(asset.viewDirection||new THREE.Vector3(family==='rondel-one'?-.55:family==='umbra'?.15:.28,family==='umbra'?1.45:family==='rondel-one'?.85:family==='kibori'?.4:.27,1)).normalize();
 function fit(){const posed=new THREE.Box3().setFromObject(root),target=posed.getCenter(new THREE.Vector3());posed.getSize(size);const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
 const vf=THREE.MathUtils.degToRad(camera.fov),hf=2*Math.atan(Math.tan(vf/2)*camera.aspect),radius=size.length()/2;
 const distance=radius/Math.sin(Math.min(vf,hf)/2)*1.16;camera.position.copy(direction).multiplyScalar(distance).add(target);camera.near=.01;camera.far=Math.max(100,distance*10);camera.updateProjectionMatrix();orbit.target.copy(target);orbit.minDistance=distance*.58;orbit.maxDistance=distance*2.5;orbit.update();orbit.saveState();}
 const observer=new ResizeObserver(fit);observer.observe(host);fit();
 function draw(dt=0){time+=dt;asset.update?.(reduced.matches?0:dt);orbit.update();renderer.render(scene,camera);}
 function tick(now){raf=0;if(disposed||document.hidden||!visible||capture)return;const dt=last?Math.min(.05,(now-last)/1000):0;last=now;draw(dt);if(!reduced.matches)raf=requestAnimationFrame(tick);}
 function wake(){if(!disposed&&!document.hidden&&visible&&!capture&&!raf){last=0;raf=requestAnimationFrame(tick);}else if(reduced.matches)draw();}
 // OrbitControls.update emits change itself. Render that state directly to
 // avoid re-entering update during capture or reduced-motion resizing.
 orbit.addEventListener('change',()=>{if(reduced.matches||capture)renderer.render(scene,camera);});
 const visibility=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(!visible){cancelAnimationFrame(raf);raf=0;}else wake();});visibility.observe(host);
 const updateVisibility=()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;}else wake();};document.addEventListener('visibilitychange',updateVisibility);
 const toolbar=document.createElement('nav');toolbar.className='asset-controls';toolbar.setAttribute('aria-label','Object controls');
 function button(label,fn){const b=document.createElement('button');b.textContent=label;b.type='button';b.onclick=fn;toolbar.append(b);return b;}
 button('Reset view',()=>{orbit.reset();draw();});
 let opened=false;
 if(asset.setOpen||asset.setExplosion){const b=button(asset.setOpen?(asset.openLabel||'Open cover'):'Separate parts',()=>{opened=!opened;asset.setOpen?.(opened?1:0);asset.setExplosion?.(opened?1:0);b.setAttribute('aria-pressed',String(opened));fit();draw();});b.setAttribute('aria-pressed','false');}
 if(asset.setLevel){const label=document.createElement('label');label.textContent='Light ';const input=document.createElement('input');input.type='range';input.min='0';input.max='2';input.step='.01';input.value='1';input.setAttribute('aria-label','Light intensity');input.oninput=()=>{asset.setLevel(Number(input.value));draw();};label.append(input);toolbar.append(label);}
 if(controls)host.append(toolbar);
 const onKey=e=>{if(e.key.toLowerCase()==='r'||e.key==='Home'){orbit.reset();draw();}else if(capture&&e.key==='ArrowRight'){e.preventDefault();draw(1/30);document.documentElement.dataset.captureFrame=String(manual++);}else if(/^Arrow/.test(e.key)){e.preventDefault();const spherical=new THREE.Spherical().setFromVector3(camera.position.clone().sub(orbit.target));if(e.key==='ArrowLeft')spherical.theta-=.1;if(e.key==='ArrowRight')spherical.theta+=.1;if(e.key==='ArrowUp')spherical.phi-=.1;if(e.key==='ArrowDown')spherical.phi+=.1;spherical.makeSafe();camera.position.setFromSpherical(spherical).add(orbit.target);draw();}};
 renderer.domElement.addEventListener('keydown',onKey);
 const onPointer=e=>{if(reduced.matches)return;const rect=renderer.domElement.getBoundingClientRect();root.rotation.x=((e.clientY-rect.top)/rect.height-.5)*.08;root.rotation.y=((e.clientX-rect.left)/rect.width-.5)*.16;if(capture)draw();};renderer.domElement.addEventListener('pointermove',onPointer);

 const state=()=>{host.dataset.triangles=String(renderer.info.render.triangles);};draw();state();wake();
 host.dataset.state='ready';
 return {asset,root,scene,camera,renderer,dispose(){disposed=true;cancelAnimationFrame(raf);observer.disconnect();visibility.disconnect();orbit.dispose();renderer.domElement.removeEventListener('keydown',onKey);renderer.domElement.removeEventListener('pointermove',onPointer);document.removeEventListener('visibilitychange',updateVisibility);asset.dispose?.();const seen=new Set();root.traverse(o=>{if(o.geometry&&!seen.has(o.geometry)){seen.add(o.geometry);o.geometry.dispose();}for(const m of (Array.isArray(o.material)?o.material:[o.material]).filter(Boolean)){if(seen.has(m))continue;seen.add(m);for(const t of Object.values(m))if(t?.isTexture&&!seen.has(t)){seen.add(t);t.dispose();}m.dispose();}});environment?.dispose();asset.environment?.dispose();renderer.dispose();host.replaceChildren();host.dataset.state='disposed';}};
}
