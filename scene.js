import { frameRoofLift } from './roof-camera.js';
import * as THREE from './vendor/three.module.js';
import { EffectComposer } from './vendor/addons/postprocessing/EffectComposer.js';
import { RenderPass } from './vendor/addons/postprocessing/RenderPass.js';
import { GTAOPass } from './vendor/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from './vendor/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from './vendor/addons/postprocessing/OutputPass.js';
import { HDRLoader } from './vendor/addons/loaders/HDRLoader.js';
import { detailedMaterials } from './materials.js';
import { constructionSite } from './construction.js';
import { floorDrawing, siteSurface, chapters, chapterProgress, visitAt, lengthSeconds, ease, mix } from './story.js';
import { concretePour } from './concrete.js';
import { framing } from './framing.js';
import { wallTrades } from './wall-trades.js';
import { garageInstallation } from './garage.js';
import { GroundedSkybox } from './vendor/addons/objects/GroundedSkybox.js';
import { loadPortraits,loadWardrobe,animateFaces } from './people.js';
import { homecoming } from './homecoming.js';
import { planting } from './landscape.js';

// One architectural model drives the blueprint and the completed residence.
const canvas=document.querySelector('#scene'),slider=document.querySelector('#progress');
const play=document.querySelector('#play'),rotate=document.querySelector('#rotate'),lighting=document.querySelector('#lighting');
const media=matchMedia('(prefers-reduced-motion: reduce)');
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
let panoramaGround,dayEnvironment,eveningEnvironment;
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(34,1,.1,150);
let renderer;
try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});}
catch{document.querySelector('#scene-error').hidden=false;document.querySelector('.visual').classList.add('no-webgl');for(const c of document.querySelectorAll('.controls button,.controls input,.stages button'))c.disabled=true;throw new Error('WebGL unavailable. Architectural elevation remains visible.');}
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.75));renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.94;
const house=new THREE.Group();house.scale.set(1.3,.9,1);scene.add(house);const built=[];
const material=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.8,...extra});
function texture(kind){
  const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');let seed=631;
  const random=()=>((seed=seed*16807%2147483647)-1)/2147483646;
  g.fillStyle=kind==='stone'?'#b4ac9b':'#66513e';g.fillRect(0,0,256,256);
  for(let y=0;y<256;y+=kind==='stone'?32:16){const step=kind==='stone'?64:256;for(let x=-64;x<256;x+=step){let v=kind==='stone'?187+random()*23:150+random()*70;g.fillStyle=kind==='stone'?`rgb(${v+12},${v+6},${v-8})`:`rgb(${v*.72},${v*.53},${v*.36})`;g.fillRect(x+(y%64?30:0)+1,y+1,step-2,(kind==='stone'?32:16)-2);}}
  for(let i=0;i<13000;i++){g.fillStyle=random()>.5?'#ffffff0c':'#0000000c';g.fillRect(random()*256,random()*256,1,1);}
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(kind==='stone'?2:1,kind==='stone'?2:3);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());return t;
}
const stone=texture('stone'),wood=texture('wood');
// A softly graduated sky gives the glass and metal real environment reflections.
const skyCanvas=document.createElement('canvas');skyCanvas.width=512;skyCanvas.height=256;
const skyContext=skyCanvas.getContext('2d'),skyGradient=skyContext.createLinearGradient(0,0,0,256);
skyGradient.addColorStop(0,'#7092b2');skyGradient.addColorStop(.43,'#bacad1');skyGradient.addColorStop(.52,'#f5dcc0');skyGradient.addColorStop(.58,'#647465');skyGradient.addColorStop(1,'#2c3931');skyContext.fillStyle=skyGradient;skyContext.fillRect(0,0,512,256);
const skyTexture=new THREE.CanvasTexture(skyCanvas);skyTexture.mapping=THREE.EquirectangularReflectionMapping;skyTexture.colorSpace=THREE.SRGBColorSpace;
const pmrem=new THREE.PMREMGenerator(renderer),environment=pmrem.fromEquirectangular(skyTexture);eveningEnvironment=environment;scene.environment=environment.texture;scene.environmentIntensity=.7;skyTexture.dispose();pmrem.dispose();
const mats={plaster:material('#e7e1d4',{roughness:.92}),stone:material('#d0c8b6',{map:stone,bumpMap:stone,bumpScale:.022}),wood:material('#b08a60',{map:wood,bumpMap:wood,bumpScale:.012}),timber:material('#cba77a'),concrete:material('#8a8c84'),roof:material('#333b40',{metalness:.25,roughness:.57,side:THREE.DoubleSide}),trim:material('#242c2f',{metalness:.45,roughness:.35}),glass:material('#596c70',{metalness:.65,roughness:.14}),warm:material('#d7ae72',{emissive:'#ffc16b',emissiveIntensity:.55}),curtain:material('#c3b59b'),light:material('#ffe2a5',{emissive:'#ffd197',emissiveIntensity:3}),grass:material('#44594a'),hedge:material('#354d3f'),trunk:material('#54473a'),paving:material('#8f9187'),soil:material('#343c34')};
let pendingFrame=false;
function assetReady(){
  if(pendingFrame)return;
  pendingFrame=true;requestAnimationFrame(()=>{pendingFrame=false;render();});
}
detailedMaterials(mats,assetReady);
mats.art=new THREE.MeshBasicMaterial({color:'#c9b89d'});
function add(mesh,stage=.25,duration=.08,lift=0,parent=house){mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);built.push({object:mesh,stage,duration,lift,y:mesh.position.y,sy:mesh.scale.y,height:mesh.geometry.parameters?.height||0});return mesh;}
const expand=x=>x>1.7?1.7+(x-1.7)*1.4:x;
function box(x,y,z,a,b,c,mat,stage=.25,duration=.08,lift=0,parent=house){if(parent===house){const left=expand(x-a/2),right=expand(x+a/2);x=(left+right)/2;a=right-left;}const geo=new THREE.BoxGeometry(a,b,c),uv=geo.attributes.uv,pos=geo.attributes.position,norm=geo.attributes.normal;for(let i=0;i<uv.count;i++){const px=pos.getX(i)+x,py=pos.getY(i)+y+b/2,pz=pos.getZ(i)+z;if(Math.abs(norm.getY(i))>.5)uv.setXY(i,px*.35,pz*.35);else if(Math.abs(norm.getX(i))>.5)uv.setXY(i,pz*.35,py*.5);else uv.setXY(i,px*.35,py*.5);}const m=new THREE.Mesh(geo,mat);m.position.set(x,y+b/2,z);return add(m,stage,duration,lift,parent);}
function beam(a,b,size,mat,stage){const s=new THREE.Vector3(expand(a[0]),a[1],a[2]),e=new THREE.Vector3(expand(b[0]),b[1],b[2]),d=e.clone().sub(s);const m=new THREE.Mesh(new THREE.BoxGeometry(size,d.length(),size),mat);m.position.copy(s.add(e).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return add(m,stage,.08);}
function face(v,indices,mat,stage){const verts=v.map(p=>[expand(p[0]),p[1],p[2]]);let geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts.flat(),3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(verts.flatMap(p=>[p[0]*.5,p[2]*.5]),2));geo.setIndex(indices);geo=geo.toNonIndexed();geo.computeVertexNormals();const base=Math.min(...verts.map(p=>p[1]));geo.translate(0,-base,0);const roof=new THREE.Mesh(geo,mat);roof.position.y=base;return add(roof,stage,.07);}

// Two storeys, a projecting entry portal and the lower attached garage of the reference.
const outlines=[[-5,1.7,-3.6,2.5],[1.7,4.8,-2.25,3.25]];
const formworkStart=built.length;
for(const [left,right,back,front] of outlines){
  for(const z of [back,front])box((left+right)/2,-.15,z,right-left+.15,.23,.08,mats.timber,.125,.06);
  for(const x of [left,right])box(x,-.15,(back+front)/2,.08,.23,front-back,mats.timber,.128,.06);
  for(let x=left+.44;x<right;x+=.40)box(x,-.071,(back+front)/2,.026,.024,front-back-.17,mats.trim,.167,.035);
  for(let z=back+.38;z<front;z+=.40)box((left+right)/2,-.048,z,right-left-.17,.024,.026,mats.trim,.17,.035);
}
for(const item of built.slice(formworkStart))item.temporary=true;
for(const [left,right,back,front] of outlines){
  for(const z of [back,front])box((left+right)/2,-.146,z,right-left,.30,.21,mats.concrete,.185,.066);
  for(const x of [left,right])box(x,-.146,(back+front)/2,.21,.30,front-back,mats.concrete,.185,.066);
}
const completedSlabs=[box(-1.65,-.15,-.55,6.7,.38,6.1,mats.concrete),box(3.25,-.15,.5,3.1,.38,5.5,mats.concrete)];
for(const item of built.slice(-2)){item.stage=0;item.duration=.01;item.rigid=true;}
const frontWindows=[{x:-3.55,y:1,w:1.95,h:1.6},{x:-4.05,y:3.48,w:.72,h:1.58},{x:-2.8,y:3.48,w:.72,h:1.58},{x:-.92,y:3.48,w:1.65,h:1.58},{x:.75,y:3.48,w:.72,h:1.58}];
const decks=[];
for(let level=0;level<2;level++){
  const base=.25+level*2.75,start=built.length;
  for(let z=-3.30;z<2.44;z+=.52)box(-1.65,base+2.48,z,6.55,.17,.071,mats.timber);
  for(let j=0;j<6;j++)box(-1.65,base+2.65,-3.60+(j+.5)*6.1/6,6.7,.12,6.1/6-.004,mats.timber);
  decks.push(built.splice(start));
}
function wall(x0,x1,y0,y1,z,openings,mat,stage,parent=house){
  const xs=[...new Set([x0,x1,...openings.flatMap(o=>[o.x-o.w/2,o.x+o.w/2])])].sort((a,b)=>a-b);
  const ys=[...new Set([y0,y1,...openings.flatMap(o=>[o.y,o.y+o.h])])].sort((a,b)=>a-b);
  for(let i=0;i<xs.length-1;i++)for(let j=0;j<ys.length-1;j++){let cx=(xs[i]+xs[i+1])/2,cy=(ys[j]+ys[j+1])/2;if(cx<x0||cx>x1||cy<y0||cy>y1||openings.some(o=>Math.abs(cx-o.x)<o.w/2&&cy>o.y&&cy<o.y+o.h))continue;box(cx,ys[j],z,xs[i+1]-xs[i],ys[j+1]-ys[j],.2,mat,stage+j*.006,.08,0,parent);}
}
wall(-5,1.7,.25,5.75,2.5,[...frontWindows,{x:-.93,y:.25,w:1.05,h:2.55}],mats.plaster,.49);
box(-1.65,.25,-3.6,6.7,5.5,.2,mats.plaster,.5,.1);
const side=new THREE.Group();side.position.set(-5,0,-.55);side.rotation.y=-Math.PI/2;house.add(side);
const sideWindows=[{x:-1.4,y:1,w:1.6,h:1.5},{x:1.15,y:1,w:1.25,h:1.5},{x:-1.4,y:3.55,w:1.25,h:1.5},{x:1.15,y:3.55,w:1.25,h:1.5}];
wall(-3,3,.25,5.75,0,sideWindows,mats.plaster,.51,side);
box(1.7,.25,-1.1,.2,5.5,5,mats.plaster,.52,.1);
box(3.2,.25,-2.2,3.2,2.85,.2,mats.stone,.54);box(4.8,.25,.5,.2,2.85,5.6,mats.stone,.54);
box(1.907,.25,3.25,.414,2.85,.28,mats.stone,.55);box(4.593,.25,3.25,.414,2.85,.28,mats.stone,.55);box(3.25,2.68,3.25,2.30,.42,.28,mats.stone,.55);
// Limestone portal, pivot door, sidelight, and a floating canopy.
box(-1.63,.25,2.84,.36,3.6,.65,mats.stone,.56,.1);box(.04,.25,2.84,.5,3.6,.65,mats.stone,.56,.1);box(-.75,2.80,2.84,2.12,1.05,.65,mats.stone,.56,.1);
const jamb=new THREE.Group();jamb.position.set(-1.45,0,3.2);house.add(jamb);box(.5,.25,0,1,2.55,.08,mats.wood,.73,.08,0,jamb);box(-.29,.3,3.23,.22,2.5,.035,mats.warm,.75);box(.86,1.07,.065,.035,.65,.05,mats.trim,.76,.07,0,jamb);box(-.75,3.87,2.84,2.27,.12,.9,mats.trim,.72);
box(-1.65,3.03,2.63,6.7,.085,.07,mats.trim,.66);
function windowUnit(x,y,z,width,height,stage=.69,parent=house){
  const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);
  // Deep window reveal, furnished recess and folded linen behind a real glass pane.
  const recessStart=built.length;const interior=material('#756357',{roughness:.9,side:THREE.DoubleSide});
  box(0,-.02,-.55,width+.03,.07,1.2,mats.wood,stage,.06,0,g);
  box(0,height,-.55,width+.03,.06,1.2,interior,stage,.06,0,g);
  box(0,0,-1.12,width+.05,height,.05,interior,stage,.06,0,g);
  for(const xx of[-width/2,width/2])box(xx,0,-.5,.035,height,1.1,interior,stage,.06,0,g);
  for(const item of built.slice(recessStart))item.recess=true;
  for(const xx of[-width/2,width/2])box(xx,-.03,0,.055,height+.12,.13,mats.trim,stage+.01,.06,0,g);
  for(const yy of[-.03,height+.02])box(0,yy,0,width+.1,.055,.13,mats.trim,stage+.01,.06,0,g);
  box(0,.025,.045,width-.04,height-.03,.012,mats.glass,stage+.02,.07,0,g);
  for(const side of[-1,1])for(let j=0;j<6;j++){
    const xx=side*(width*.42-j*width*.02);
    box(xx,.025,-.1-j%2*.035,width*.027,height-.04,.018,mats.curtain,stage+.025,.06,0,g);
  }
  const dressingStart=built.length;
  if(width>1.2){const upholstery=material('#a9967f',{roughness:1});box(0,.12,-.68,width*.62,.3,.35,upholstery,stage,.06,0,g);box(0,.38,-.81,width*.62,.31,.12,upholstery,stage,.06,0,g);for(const xx of[-width*.3,width*.3])box(xx,.15,-.65,.12,.4,.4,upholstery,stage,.06,0,g);box(width*.27,.06,-.45,.3,.05,.3,mats.wood,stage,.06,0,g);}
  // A miniature pendant and shade occupy true room volume, never a photo plane.
  const shade=new THREE.Mesh(new THREE.CylinderGeometry(.09,.15,.18,16,1,true),mats.warm);shade.position.set(width*.22,height*.64,-.6);add(shade,stage+.03,.07,0,g);
  box(width*.22,height*.82,-.6,.014,height*.18,.014,mats.trim,stage+.03,.06,0,g);
  for(const item of built.slice(dressingStart))item.recess=true;
  box(0,.02,.075,.035,height+.04,.045,mats.trim,stage+.03,.06,0,g);box(0,-.055,.02,width+.22,.07,.25,mats.stone,stage+.03,.06,0,g);
}
for(const o of frontWindows)windowUnit(o.x,o.y,2.63,o.w,o.h);
const sideGlazing=new THREE.Group();sideGlazing.position.set(-5.13,0,-.55);sideGlazing.rotation.y=-Math.PI/2;house.add(sideGlazing);for(const o of sideWindows)windowUnit(o.x,o.y,0,o.w,o.h,.7,sideGlazing);
function hipRoof(cx,cz,width,depth,base,rise,stage){
  const x0=cx-width/2,x1=cx+width/2,z0=cz-depth/2,z1=cz+depth/2,inset=Math.min(width,depth)*.38;
  const v=[[x0,base,z0],[x1,base,z0],[x1,base,z1],[x0,base,z1],[x0+inset,base+rise,cz],[x1-inset,base+rise,cz]];
  // Full-size roof surface sections settle onto the rafters in installation order.
  const point=(a,b,t)=>a.map((v,i)=>mix(v,b[i],t));
  for(const [e0,e1,r0,r1] of [[0,1,4,5],[1,2,5,5],[2,3,5,4],[3,0,4,4]]){
    for(let k=0;k<4;k++){
      const u=k/4,w=(k+1)/4;
      face([point(v[e0],v[e1],u),point(v[e0],v[e1],w),point(v[r0],v[r1],w),point(v[r0],v[r1],u)],[0,1,2,0,2,3],mats.roof,stage+k*.01);
      const item=built.at(-1);item.rigid=true;item.lift=.48;item.duration=.028;
    }
  }
  box(cx,base-.12,cz,width,.14,depth,mats.trim,stage,.035,.15);built.at(-1).rigid=true;beam(v[4],v[5],.075,mats.trim,stage+.03);
}
hipRoof(-1.65,-.55,7.35,6.75,5.84,1.7,.78);hipRoof(3.18,.48,3.78,6.12,3.16,1.12,.8);
// Cedar soffits and small recessed downlights under the overhangs.
box(-1.65,5.66,2.57,7.25,.08,.35,mats.wood,.84,.06);
for(const x of[-4.6,-2.25,.55])box(x,5.645,2.65,.085,.012,.085,mats.light,.92,.05);
box(3.2,2.98,3.36,3.7,.07,.3,mats.wood,.85,.06);
const rafterStart=built.length;
for(let x=-4.8;x<1.7;x+=.65){beam([x,5.7,-3.55],[x,7.2,-.55],.1,mats.timber,.44);beam([x,7.2,-.55],[x,5.7,2.5],.1,mats.timber,.45);}
const rafters=built.slice(rafterStart);
for(const[x,z,top]of[[-5.1,2.6,5.75],[1.79,-3.65,5.75],[4.87,3.34,3.1]])box(x,.27,z,.065,top,.065,mats.trim,.84);
// Landscaped arrival and finely jointed concrete pavers.
box(3.2,-.135,5.6,3.8,.055,5.2,mats.paving,.87);box(-.75,-.11,4.95,1.8,.05,3.6,mats.paving,.88);
for(let z=3.5;z<8.2;z+=.55)box(3.2,-.1,z,3.7,.008,.016,mats.concrete,.89);for(let x=1.5;x<5;x+=.62)box(x,-.1,5.6,.012,.008,5.1,mats.concrete,.89);
for(let i=0;i<3;i++)box(-.75,.02+i*.08,3.55-i*.25,1.9-i*.13,.09,.65,mats.stone,.88+i*.006);
box(-3.55,-.1,3.32,2.8,.17,1.05,mats.soil,.87);
planting(add,house);
const lamps=new THREE.Group();house.add(lamps);
for(const[x,y,z]of[[-1.65,2.3,3.24],[.2,2.3,3.24],[1.94,2.3,3.43],[4.56,2.3,3.43]]){box(x,y,z,.085,.24,.09,mats.trim,.91);box(x,y+.02,z+.052,.055,.13,.02,mats.light,.92);const l=new THREE.PointLight('#ffc379',0,3.6,2);l.position.set(expand(x),y+.08,z+.2);lamps.add(l);}
for(const x of[-1.9,.4])for(const z of[4.6,6.2]){box(x,-.08,z,.055,.48,.055,mats.trim,.92);box(x,.34,z,.08,.06,.08,mats.light,.93);const l=new THREE.PointLight('#ffd195',0,2.2,2);l.position.set(expand(x),.45,z);lamps.add(l);}
const sun=new THREE.DirectionalLight('#ffdeb0',3.8);sun.position.set(-9,11,6);sun.castShadow=true;sun.shadow.mapSize.set(innerWidth<700?1024:2048,innerWidth<700?1024:2048);Object.assign(sun.shadow.camera,{left:-14,right:14,top:14,bottom:-14,near:.5,far:45});sun.shadow.bias=-.00035;sun.shadow.normalBias=.035;sun.shadow.radius=3;scene.add(sun);
const fill=new THREE.HemisphereLight('#b3ccdf','#303b2d',2.1);scene.add(fill);const rim=new THREE.DirectionalLight('#8baacb',1.5);rim.position.set(5,6,-9);scene.add(rim);
// Blend the modelled lawn and work pad into the projected outer site.
function edgeMask(inner,outer){
  const c=document.createElement('canvas');c.width=c.height=256;
  const ctx=c.getContext('2d'),image=ctx.createImageData(256,256);
  for(let y=0;y<256;y++)for(let x=0;x<256;x++){
    const u=(x-127.5)/127.5,v=(y-127.5)/127.5;
    const edge=Math.hypot(u,v)+.027*Math.sin(9*u+12*v)+.018*Math.sin(27*u-8*v);
    const k=Math.round(255*(1-ease(edge,inner,outer))),i=(y*256+x)*4;
    image.data.set([k,k,k,255],i);
  }
  ctx.putImageData(image,0,0);return new THREE.CanvasTexture(c);
}
const groundMat=material('#e6dbbd',{map:mats.grass.map,alphaMap:edgeMask(.55,.98),transparent:true,depthWrite:false});
mats.grass.map.repeat.set(19,19);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(64,64),groundMat);
ground.rotation.x=-Math.PI/2;ground.position.y=-.21;ground.receiveShadow=true;ground.renderOrder=-3;scene.add(ground);
const site=constructionSite(mats);scene.add(site.root,site.installed);
const wallCrew=framing(scene,mats,site.createWorker);
const pour=concretePour(scene,mats,site.createWorker);
const trades=wallTrades(scene,mats,site.createWorker);
const garage=garageInstallation(scene,mats,site.createWorker);
const story=homecoming(mats);scene.add(story.root);
const sheet=floorDrawing();sheet.renderOrder=2;house.add(sheet);
const dirt=siteSurface();dirt.material.alphaMap=edgeMask(.67,1.04);dirt.renderOrder=-2;scene.add(dirt);
// Sky geometry, contact shading and HDR illumination remain live for every viewing angle.
const skyUniforms={top:{value:new THREE.Color('#1c3b5c')},horizon:{value:new THREE.Color('#c6a88e')}};
const sky=new THREE.Mesh(new THREE.SphereGeometry(75,24,16),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:skyUniforms,vertexShader:'varying vec3 v;void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec3 v;uniform vec3 top;uniform vec3 horizon;void main(){float h=clamp(normalize(v).y,0.,1.);gl_FragColor=vec4(mix(horizon,top,pow(h,.35)),1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'}));scene.add(sky);
const targetBuffer=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,samples:Math.min(2,renderer.capabilities.maxSamples)});
const composer=new EffectComposer(renderer,targetBuffer);composer.addPass(new RenderPass(scene,camera));
const contact=new GTAOPass(scene,camera,600,400);contact.blendIntensity=.27;contact.updateGtaoMaterial({radius:.26,distanceExponent:2,thickness:.35,scale:1,samples:8});composer.addPass(contact);
const bloom=new UnrealBloomPass(new THREE.Vector2(600,400),.09,.25,2);composer.addPass(bloom);composer.addPass(new OutputPass());
const query=new URLSearchParams(location.search),selectedStage=query.get('stage');
const entry=chapters.findIndex(c=>c[2].toLowerCase().replaceAll(' ','-')===selectedStage);
const playChapter=entry>=0&&query.get('play')==='1';
const initialProgress=playChapter?chapters[entry][0]/lengthSeconds*100:entry>=0?chapterProgress(entry):media.matches?100:0;
let progress=initialProgress,playing=(entry<0||playChapter)&&!media.matches,turning=false,angle=-.43,last=0,visible=true,dusk=false,pointer=null,zoom=1;
const bg=new THREE.Color(),target=new THREE.Vector3(.65,2.3,.5),blue=new THREE.Color('#152d40'),night=new THREE.Color('#182936'),day=new THREE.Color('#bfc6c5');
const blueprint=document.querySelector('.blueprint-sheet'),title=document.querySelector('#stage-title'),number=document.querySelector('#stage-number');
const stageNav=document.querySelector('.stages');
const stageButtons=chapters.map((chapter,i)=>{
  const button=document.createElement('button'),n=document.createElement('span');
  n.textContent=String(i+1).padStart(2,'0');button.dataset.stage=i;
  button.setAttribute('aria-label',chapter[3]);button.append(n,' '+chapter[2]);stageNav.append(button);
  return button;
});

scene.fog=new THREE.Fog(blue,68,130);
function apply(){const seconds=progress*lengthSeconds/100,{i:chapter,t,architecturalTime:s}=visitAt(seconds),p=clamp(s/.665),finished=smooth((p-.84)/.13);
  let building=p<=.49?p:p<.8?.49:mix(.49,1,(p-.8)/.2);
  if(chapter>=6)building=Math.max(building,.871);
  for(const i of built){const a=smooth((building-i.stage)/i.duration);i.object.visible=a>.001;i.object.scale.y=i.rigid?i.sy:i.sy*Math.max(.001,a);i.object.position.y=i.y+(i.rigid?0:-i.height*(1-a)*.5)+i.lift*(1-a);if(i.temporary&&p>.30)i.object.visible=false;if(i.recess&&s>.805)i.object.visible=false;if(i.object.material===mats.timber)i.object.visible=i.object.visible&&building<.75;}
  wallCrew.update(chapter,t);
  rafters.forEach((item,j)=>{
    const landed=chapter===5?ease(t*4-(j>>1)*.080,0,.29):chapter>5?1:0;
    item.object.visible=landed>.001;item.object.scale.y=item.sy;item.object.position.y=item.y+.27*(1-landed);
  });
  const carpentryClock=chapter===3?.248:chapter===4?mix(.248,.493,ease(t,.41,.77)):p;
  site.update(carpentryClock);
  if(chapter>=2)site.excavator.visible=false;
  for(const [level,items] of decks.entries()){
    const completion=level?wallCrew.state.upperDeck:wallCrew.state.deck;
    items.forEach((item,j)=>{
      const set=ease(completion*items.length-j,0,1);item.object.visible=set>.001&&s<.806;
      item.object.position.y=item.y+(1-set)*.20;
    });
  }
  completedSlabs.forEach(slab=>slab.visible=chapter>2);
  pour.update(chapter===2?t:-1);
  trades.update(chapter,t);garage.update(chapter,t);
  story.update(s);
  animateFaces(seconds);
  jamb.rotation.y=1.48*ease(s,.785,.817);
  sheet.visible=chapter<2;sheet.material.opacity=1-ease(seconds,.45,.80);
  dirt.visible=p<.99;dirt.material.opacity=1-ease(p,.83,.99);
  blueprint.style.display='none';
  scene.background=bg.copy(dusk?night:day);ground.material.color.set('#dcd5bf');
  sky.visible=!panoramaGround||dusk;if(panoramaGround)panoramaGround.visible=!dusk;skyUniforms.top.value.set(dusk?'#0c2d57':'#6b9abf');skyUniforms.horizon.value.set(dusk?'#617a94':'#e4ded0');
  scene.fog.color.copy(skyUniforms.horizon.value);
  sun.intensity=dusk?1.15:2.7;sun.color.set(dusk?'#ffd0a0':'#fff0d5');fill.intensity=dusk?.5:.95;rim.intensity=dusk?.6:.39;scene.environment=(!dusk&&dayEnvironment)?dayEnvironment.texture:eveningEnvironment.texture;scene.environmentIntensity=dusk?.55:.64;mats.warm.emissiveIntensity=(dusk?2.3:.15)*finished;
  mats.glass.emissiveIntensity=0;for(const l of lamps.children)l.intensity=(dusk?1.1:0)*finished;
  mats.light.emissiveIntensity=dusk?2.4:.16;
  const interior=s>=.856,aspect=camera.aspect;
  const radius=Math.max(22,30/Math.max(.7,aspect));
  const elevated=1-ease(p,.13,.42);
  target.set(.65,2.05*(1-elevated),.1);
  camera.position.set(Math.sin(angle)*radius*(1-elevated*.94),5.0+elevated*24,Math.cos(angle)*radius*(1-elevated*.66));
  // Cut in as each handoff becomes the subject, then track through the open door.
  function shot(weight,eye,look){
    if(weight<=0)return;
    camera.position.lerp(new THREE.Vector3(...eye),weight);
    target.lerp(new THREE.Vector3(...look),weight);
  }
  const close=aspect<1?1.38:1;
  const roofShot=ease(p,.52,.565)*(1-ease(p,.78,.838));
  if(roofShot>0){
    const originalEye=camera.position.clone(),originalTarget=target.clone();
    frameRoofLift(camera,target,clamp((p-.50)/.30),aspect);
    camera.position.lerp(originalEye,1-roofShot);target.lerp(originalTarget,1-roofShot);
  }
  let exteriorFov=roofShot?mix(34,camera.fov,roofShot):34;
  const workShot=chapter===2||chapter===3||chapter===4||(chapter>=6&&chapter<=11);
  if(chapter===3||chapter===4){
    const view=wallCrew.state;
    shot(1,view.eye.toArray(),view.look.toArray());exteriorFov=aspect<1?69:53;
  }
  if(chapter===2){
    const f=pour.root.userData.focus;
    shot(1,[f.x-2.47,1.46,f.z-.40],[f.x+.05,.85,f.z+.23]);exteriorFov=42;
  }
  if(chapter===6){
    shot(1,[4.74,1.46,-1.34],[3.40,1.06,-1.51]);exteriorFov=aspect<1?64:47;
  }else if(chapter>=7&&chapter<=10){
    // Keep the same wall in frame as pipes, insulation and finishes change.
    shot(1,[4.72,1.71,1.03],[6.27,1.38,-1.49]);exteriorFov=aspect<1?70:53;
  }
  if(chapter===11){
    shot(1,[4.31,1.97,-1.35],[5.16,1.52,2.77]);exteriorFov=aspect<1?76:49;
  }
  if(chapter===13)shot(1,[-.02,1.86,8.85*close],[-.15,1.02,4.37]);
  if(chapter===14&&!interior)shot(1,[.72,1.68,6.68*close],[-1.13,1.14,3.13]);
  const through=chapter===14&&interior?1:0;
  const portraitView=aspect<1;
  shot(through,portraitView?[-5.55,1.44,1.60]:[-2.65,1.48,1.38],portraitView?[-2.60,1.12,-2.60]:[-2.04,1.14,-2.50]);
  const seated=ease(s,.954,.999);
  shot(seated,portraitView?[-3.9,1.43,1.56]:[-3.18,1.39,1.21],portraitView?[-3.45,1.19,-2.10]:[-2.83,1.20,-2.10]);
  // Frame in horizontal space so a wide player still gives faces enough pixels.
  const frameDistance=portraitView?camera.position.distanceTo(target):Math.max(3.7,camera.position.z+2.5);
  const halfWidth=mix(portraitView?3.1:3.45,portraitView?1.72:2.65,seated);
  const interiorFov=THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(2*Math.atan(halfWidth/(Math.max(1,frameDistance)*aspect))),26,96);
  camera.fov=mix(exteriorFov,interiorFov,through);
  camera.zoom=zoom;camera.updateProjectionMatrix();camera.lookAt(target);
  const scripted=workShot||roofShot>.05||s>=.68;
  if(scripted&&turning){turning=false;rotate.setAttribute('aria-pressed','false');}
  rotate.disabled=scripted;document.querySelector('.scene-hint').style.visibility=scripted?'hidden':'visible';
  slider.value=String(progress);
  title.textContent=chapters[chapter][3];number.textContent=String(chapter+1).padStart(2,'0')+' / '+chapters.length;
  slider.setAttribute('aria-valuetext',chapters[chapter][3]);
  stageButtons.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===chapter)));
  play.textContent=playing?'Ⅱ':'▶';play.setAttribute('aria-label',playing?'Pause animation':progress===100?'Replay construction':'Play animation');
  visual.dataset.phase=interior?'interior':s>=.665?'complete':'building';
}
function render(){
  apply();
  if(playing||turning||canvas.clientWidth<=580){renderer.render(scene,camera);return;}
  contact.enabled=progress>22;composer.render();
}
function resize(){const r=canvas.getBoundingClientRect();camera.aspect=r.width/r.height;camera.updateProjectionMatrix();renderer.setSize(r.width,r.height,false);composer.setSize(r.width,r.height);render();}
const expandButton=document.querySelector('#expand-scene'),visual=document.querySelector('.visual');let previousOverflow='';
function expandScene(open){if(open)previousOverflow=document.body.style.overflow;visual.classList.toggle('scene-expanded',open);document.body.style.overflow=open?'hidden':previousOverflow;expandButton.setAttribute('aria-expanded',String(open));expandButton.setAttribute('aria-label',open?'Close enlarged scene':'Enlarge 3D scene');expandButton.textContent=open?'×':'⛶';if(open){visual.setAttribute('role','dialog');visual.setAttribute('aria-modal','true');visual.setAttribute('aria-label','Interactive 3D construction');}else{visual.removeAttribute('role');visual.removeAttribute('aria-modal');visual.removeAttribute('aria-label');}resize();}
expandButton.addEventListener('click',()=>expandScene(!visual.classList.contains('scene-expanded')));
document.querySelector('#zoom-in').addEventListener('click',()=>{zoom=Math.min(2,zoom+.2);render();});document.querySelector('#zoom-out').addEventListener('click',()=>{zoom=Math.max(.6,zoom-.2);render();});
document.addEventListener('keydown',e=>{if(!visual.classList.contains('scene-expanded'))return;if(e.key==='Escape'){expandScene(false);expandButton.focus();}if(e.key==='Tab'){const focusables=[...visual.querySelectorAll('button,input')].filter(el=>!el.disabled&&el.getClientRects().length);const first=focusables[0],last=focusables.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
play.addEventListener('click',()=>{if(!playing&&progress>=100)progress=0;playing=!playing;last=playing?performance.now():0;render();});slider.addEventListener('input',()=>{playing=false;progress=Number(slider.value);render();});
rotate.addEventListener('click',()=>{if(media.matches){angle+=.35;render();return;}turning=!turning;rotate.setAttribute('aria-pressed',String(turning));render();});
lighting.addEventListener('click',()=>{dusk=!dusk;lighting.setAttribute('aria-pressed',String(dusk));lighting.textContent=dusk?'Evening light ☾':'Daylight ☀';render();});
stageButtons.forEach((b,i)=>b.addEventListener('click',()=>{progress=chapterProgress(i);playing=false;render();}));
canvas.addEventListener('pointerdown',e=>{if(rotate.disabled)return;pointer={x:e.clientX,angle};canvas.setPointerCapture(e.pointerId);});canvas.addEventListener('pointermove',e=>{if(pointer){angle=pointer.angle+(e.clientX-pointer.x)*.006;render();}});canvas.addEventListener('pointerup',()=>pointer=null);canvas.addEventListener('pointercancel',()=>pointer=null);
media.addEventListener('change',()=>{playing=false;turning=false;progress=100;rotate.setAttribute('aria-pressed','false');render();});document.addEventListener('visibilitychange',()=>last=0);
new ResizeObserver(resize).observe(canvas);new IntersectionObserver(e=>{if(visible!==e[0].isIntersecting){visible=e[0].isIntersecting;last=0;}}).observe(canvas);
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();playing=false;document.querySelector('#scene-error').hidden=false;});canvas.addEventListener('webglcontextrestored',()=>{document.querySelector('#scene-error').hidden=true;render();});
function tick(){
  if(visible&&!document.hidden&&(playing||turning)){
    const now=performance.now(),elapsed=last?(now-last)/1000:0;last=now;
    if(playing){
      progress=Math.min(100,progress+elapsed*100/lengthSeconds);
      if(progress===100)playing=false;
    }
    if(turning)angle+=Math.min(elapsed,.35)*.12;
    render();
  }else last=0;
  requestAnimationFrame(tick);
}
resize();requestAnimationFrame(tick);
new HDRLoader().load('./assets/venice-sunset-1k.hdr',hdr=>{const generator=new THREE.PMREMGenerator(renderer),map=generator.fromEquirectangular(hdr);eveningEnvironment=map;hdr.dispose();generator.dispose();environment.dispose();render();},undefined,()=>{/* Procedural sky reflection remains available offline if HDR loading fails. */});

const outsideLoader=new THREE.TextureLoader();
outsideLoader.load('./assets/prairie-daylight.jpg',texture=>{
  texture.colorSpace=THREE.SRGBColorSpace;texture.mapping=THREE.EquirectangularReflectionMapping;
  panoramaGround=new GroundedSkybox(texture,9,105,64);panoramaGround.position.y=8.75;panoramaGround.renderOrder=-10;panoramaGround.material.fog=false;scene.add(panoramaGround);
  const print=texture.clone();print.mapping=THREE.UVMapping;print.repeat.set(.28,.18);print.offset.set(.38,.48);print.needsUpdate=true;mats.art.map=print;mats.art.needsUpdate=true;
  const generator=new THREE.PMREMGenerator(renderer);
  dayEnvironment=generator.fromEquirectangular(texture);generator.dispose();render();
});
outsideLoader.load('./assets/site-gravel.jpg',texture=>{
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.wrapS=texture.wrapT=THREE.MirroredRepeatWrapping;
  texture.repeat.set(6,4);texture.anisotropy=4;
  dirt.material.map=texture;dirt.material.needsUpdate=true;render();
});
loadPortraits(assetReady);
loadWardrobe(assetReady);
