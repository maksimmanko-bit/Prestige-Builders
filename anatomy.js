import * as T from './vendor/three.module.js';
import data from './assets/anatomy.js';
import tailoring from './assets/tailoring.js';

const shapes={};
for(const [part,[coords,triangles]] of Object.entries(data)){
  const bytes=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0)).buffer;
  shapes[part]={raw:new Int16Array(bytes(coords)),index:new Uint16Array(bytes(triangles))};
}
function build(part,project){
  const {raw,index}=shapes[part],positions=[],uv=[],region=[],coverage=[];
  for(let i=0;i<raw.length;i+=3){
    const [x,y,z,u,v,r=0,front=1]=project(raw[i]/3000,raw[i+1]/3000,raw[i+2]/3000);
    positions.push(x,y,z);uv.push(u,v);region.push(r);coverage.push(front);
  }
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
  geometry.setAttribute('scalp',new T.Float32BufferAttribute(region,1));
  if(part==='head')geometry.setAttribute('faceCoverage',new T.Float32BufferAttribute(coverage,1));
  geometry.setIndex(new T.BufferAttribute(index,1));geometry.computeVertexNormals();return geometry;
}
const v=(x,y,z)=>new T.Vector3(x,y,z);
const down=v(0,-1,0);
const handGeometry=new Map();
const gloveMaterials=new WeakMap();
const wristBinding=new T.MeshStandardMaterial({color:'#514b3e',roughness:.95});
const gloveCuff=new T.LatheGeometry([new T.Vector2(.033,-.012),new T.Vector2(.037,-.008),new T.Vector2(.035,.015),new T.Vector2(.029,.021)],18);
// Project the hm08 hand into a wrist-local palm basis. Each finger curls
// around its own knuckle and middle joint, including the opposing thumb.
export function fittedHand(wrist,side,material,gloved=false){
  const key=side+'-'+gloved;
  if(!handGeometry.has(key)){
    const length=v(.26,-.65,.716).normalize(),front=v(-.249,.266,.52);
    front.addScaledVector(length,-front.dot(length)).normalize();
    const dorsal=front.clone().cross(length).normalize(),origin=v(4.312,2.452,1.757);
    const local=p=>v(p.dot(dorsal),-p.dot(length),p.dot(front)).multiplyScalar(gloved?.100:.095);
    const digits=[
      [[4.195,2.306,2.134],[4.095,2.256,2.373],[3.984,2.110,2.682],[3.917,2,2.876]],
      [[4.496,2.030,2.644],[4.532,1.895,2.854],[4.534,1.745,3.024],[4.530,1.589,3.194]],
      [[4.608,1.886,2.479],[4.712,1.672,2.691],[4.747,1.488,2.856],[4.784,1.303,3.015]],
      [[4.696,1.825,2.309],[4.811,1.617,2.461],[4.859,1.426,2.592],[4.915,1.223,2.717]],
      [[4.745,1.764,2.124],[4.807,1.582,2.221],[4.830,1.455,2.281],[4.857,1.289,2.353]]
    ].map(chain=>chain.map(p=>local(v(...p).sub(origin))));
    const bones=digits.map((chain,d)=>chain.slice(0,3).map((joint,j)=>{
      const line=new T.Line3(joint,chain[j+1]),axis=line.delta(v()).normalize();
      const inward=d===0?v(-.33,-.55,-.75):v(-1,0,0);
      return {joint,line,axis,hinge:axis.clone().cross(inward).normalize(),angle:(d===0?[.32,.48,.35]:[.71,.99,.61])[j]};
    }));
    const geometry=build('hand',(x,y,z)=>{
      const q=local(v(x,y,z).sub(origin));return [q.x*side,q.y,q.z,q.z*9+.5,-q.y*6];
    });
    // Mirroring a single CC0 hand also reverses its triangle winding.
    if(side===-1){const a=geometry.index.array.slice();for(let i=0;i<a.length;i+=3)[a[i+1],a[i+2]]=[a[i+2],a[i+1]];geometry.setIndex(new T.BufferAttribute(a,1));}
    const pos=geometry.attributes.position,curled=[],colours=[];
    for(let i=0;i<pos.count;i++){
      const q=v(pos.getX(i)*side,pos.getY(i),pos.getZ(i));
      const palmPad=1-T.MathUtils.smoothstep(q.x,-.007,.009);
      const edge=T.MathUtils.smoothstep(-q.y,.115,.144);
      const leather=1-.40*palmPad-.14*edge;colours.push(leather,leather*.96,leather*.88);
      const dist=bones.map(chain=>Math.min(...chain.map(b=>b.line.closestPointToPoint(q,true,v()).distanceToSquared(q))));
      const nearest=Math.min(...dist),result=v(0,0,0);let sum=0;
      for(const [d,chain] of bones.entries()){
        const w=Math.exp(-(dist[d]-nearest)/.000021);if(w<.0001)continue;
        const bent=q.clone();
        for(let j=2;j>=0;j--){
          const b=chain[j],along=q.clone().sub(b.joint).dot(b.axis);
          bent.sub(b.joint).applyAxisAngle(b.hinge,b.angle*T.MathUtils.smoothstep(along,-.005,.007)).add(b.joint);
        }
        result.addScaledVector(bent,w);sum+=w;
      }
      curled.push(result.x*side/sum,result.y/sum,result.z/sum);
    }
    geometry.computeVertexNormals();
    if(gloved)geometry.setAttribute('color',new T.Float32BufferAttribute(colours,3));
    const curl=new T.Float32BufferAttribute(curled,3),bent=geometry.clone();
    bent.setAttribute('position',curl);bent.computeVertexNormals();
    geometry.morphAttributes.position=[curl];geometry.morphAttributes.normal=[bent.attributes.normal];
    handGeometry.set(key,geometry);
  }
  if(gloved){
    if(!gloveMaterials.has(material)){const leather=material.clone();leather.vertexColors=true;gloveMaterials.set(material,leather);}
    material=gloveMaterials.get(material);
    const cuff=new T.Mesh(gloveCuff,wristBinding);cuff.scale.z=.84;wrist.add(cuff);cuff.castShadow=true;
  }
  const model=new T.Mesh(handGeometry.get(key),material);model.name=gloved?'Leather work glove':'Hand';
  model.castShadow=model.receiveShadow=true;model.morphTargetInfluences[0]=gloved?.68:.26;
  wrist.add(model);return model;
}
const decoded=new Map(),weighted=new Map();
function tailoredGeometry(name){
  if(decoded.has(name))return decoded.get(name);
  const [coords,triangles,uv,ranges]=tailoring[name];
  const bytes=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0)).buffer;
  const geo=new T.BufferGeometry();
  geo.setAttribute('position',new T.Float32BufferAttribute(Array.from(new Int16Array(bytes(coords)),x=>x/30000),3));
  geo.setAttribute('uv',new T.Float32BufferAttribute(Array.from(new Int16Array(bytes(uv)),x=>x/8192),2));
  geo.setIndex(new T.BufferAttribute(new Uint16Array(bytes(triangles)),1));
  for(const [i,[start,count]] of ranges.entries())geo.addGroup(start,count,i);
  geo.computeVertexNormals();decoded.set(name,geo);return geo;
}
const sockets=[
  [v(.168,.525,.015),v(.313,.349,.013),v(.431,.245,.176)],
  [v(.1104,.0486,.0123),v(.158,-.3694,.032),v(.2196,-.745,-.0009)]
];
const smooth=T.MathUtils.smoothstep;
function skinGeometry(name){
  if(weighted.has(name))return weighted.get(name);
  const under=name.startsWith('skin-');
  const workShirt=name==='work-shirt';
  const bibOnly=name==='site-bib';
  const pattern=workShirt?'male_casualsuit02':bibOnly?'male_worksuit01':name;
  const geo=under?build('underlayer',(x,y,z)=>[x*.1,y*.1,z*.1,x*.35,y*.35]):tailoredGeometry(pattern).clone();
  const pos=geo.attributes.position,indices=[],weights=[];
  if(under){
    const exposed=i=>(pos.getY(i)>.546&&Math.abs(pos.getX(i))<.095)||(name==='skin-short'&&Math.abs(pos.getX(i))>.234);
    const triangles=[],src=geo.index.array;
    for(let i=0;i<src.length;i+=3)if(exposed(src[i])&&exposed(src[i+1])&&exposed(src[i+2]))triangles.push(src[i],src[i+1],src[i+2]);
    geo.setIndex(triangles);
  }
  if(workShirt){
    const shirt=geo.groups[0];
    geo.setIndex(new T.BufferAttribute(geo.index.array.slice(shirt.start,shirt.start+shirt.count),1));
    geo.clearGroups();
    for(let i=0;i<pos.count;i++){
      const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);
      const tuck=(1-smooth(y,.34,.54))*(1-smooth(Math.abs(x),.155,.25));
      pos.setXYZ(i,x*(1-.18*tuck),y,z*(1-.28*tuck));
    }
    geo.computeVertexNormals();
  }
  if(bibOnly){
    // The original includes a short shirt. Keep the bib, trousers and
    // hardware, with one continuous long shirt beneath the suspenders.
    const groups=geo.groups.filter(g=>g.materialIndex!==1);
    geo.clearGroups();for(const g of groups)geo.addGroup(g.start,g.count,g.materialIndex);
  }
  for(let i=0;i<pos.count;i++){
    const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i),arm=y>.15,side=x<0?0:1;
    const limb=arm?0:1,bone=2+4*limb+2*side;
    const torso=arm?0:1,axis=sockets[limb][1].clone().sub(sockets[limb][0]);
    const limit=.162+Math.max(0,.504-y)*.69;
    const armWeight=(under||workShirt)&&Math.abs(x)>.233&&y<.433?1:smooth(Math.abs(x),limit-.042,limit+.042);
    const weight=arm?armWeight:1-smooth(y,-.094,.093);
    const along=v(Math.abs(x),y,z).sub(sockets[limb][0]).dot(axis.clone().normalize());
    const bend=smooth(along,axis.length()-.052,axis.length()+.052);
    indices.push(torso,bone,bone+1,1-torso);
    const lowerTrunk=arm?1-smooth(y,.15,.33):smooth(y,-.03,.15)*.17;
    weights.push((1-weight)*(1-lowerTrunk),weight*(1-bend),weight*bend,(1-weight)*lowerTrunk);
  }
  geo.setAttribute('skinIndex',new T.Uint16BufferAttribute(indices,4));
  geo.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));weighted.set(name,geo);return geo;
}
const hardware=new T.MeshStandardMaterial({color:'#786a51',metalness:.64,roughness:.48});
const footwear=new Map();
export function shoe(ankle,side,upper,sole){
  if(!footwear.has(side)){
    const geo=tailoredGeometry('shoes05').clone(),p=geo.attributes.position,src=geo.index.array,sets=[[],[]];
    const group=geo.groups[side<0?1:0];
    for(let i=group.start;i<group.start+group.count;i+=3){
      const heel=(p.getY(src[i])+p.getY(src[i+1])+p.getY(src[i+2]))/3;
      sets[heel<-.816?1:0].push(src[i],src[i+1],src[i+2]);
    }
    for(let i=0;i<p.count;i++)p.setXYZ(i,p.getX(i)-side*.196,(p.getY(i)+.83474)*.94-.075,p.getZ(i)*.86-.018);
    geo.setIndex(sets.flat());geo.clearGroups();geo.addGroup(0,sets[0].length,0);geo.addGroup(sets[0].length,sets[1].length,1);
    geo.computeVertexNormals();footwear.set(side,geo);
  }
  const model=new T.Mesh(footwear.get(side),[upper,sole]);model.castShadow=model.receiveShadow=true;ankle.add(model);
}
export function dressActor(root,chest,legs,arms,materials){
  const id=materials.identity??4,work=id>=4;
  const pelvis=materials.pelvis??chest;
  const local=bone=>root.worldToLocal(bone.getWorldPosition(v(0,0,0)));
  const shoulder=local(arms[1].shoulder),hip=local(legs[1].hip??legs[1].thigh);
  const scale=v(shoulder.x/.168,(shoulder.y-hip.y)/(.525-.0486),id===1||id===2?1.04:1.1);
  function trunk(bone){
    const offset=hip.clone().sub(local(bone)).sub(v(0,.0486*scale.y,.022));
    offset.x=-local(bone).x;
    return new T.Matrix4().makeScale(scale.x,scale.y,scale.z).setPosition(offset);
  }
  const bones=[chest,pelvis],inverse=[trunk(chest),trunk(pelvis)];
  for(const [chain,limbs] of [arms,legs].entries())for(const [side,limb] of limbs.entries()){
    const joints=sockets[chain].map(p=>v(p.x*(side?1:-1),p.y,p.z));
    const parts=[limb.shoulder??limb.hip??limb.thigh,limb.elbow??limb.knee];
    const end=limb.hand??limb.ankle;
    for(let j=0;j<2;j++){
      bones.push(parts[j]);
      const delta=joints[j+1].clone().sub(joints[j]);
      const length=(j?end.position:parts[1].position).length()/delta.length();
      const q=new T.Quaternion().setFromUnitVectors(delta.normalize(),down);
      const girth=chain===0?(work?1.02:.95):(work?1.05:.98);
      inverse.push(new T.Matrix4().makeScale(girth,length,girth).multiply(new T.Matrix4().makeRotationFromQuaternion(q)).multiply(new T.Matrix4().makeTranslation(-joints[j].x,-joints[j].y,-joints[j].z)));
    }
  }
  const skeleton=new T.Skeleton(bones,inverse);
  function wear(name,mat){
    const garment=new T.SkinnedMesh(skinGeometry(name),mat);
    garment.name=name;garment.castShadow=garment.receiveShadow=true;garment.frustumCulled=false;
    root.add(garment);garment.bind(skeleton,new T.Matrix4());
  }
  const name=work?(materials.liner?'site-bib':'male_worksuit01'):id<2?'male_casualsuit02':'female_casualsuit01';
  wear(id<2||materials.liner?'skin-long':'skin-short',materials.skin);
  if(materials.liner)wear('work-shirt',materials.liner);
  wear(name,work?[materials.leg,materials.arm,hardware,hardware,hardware,hardware]:[materials.body,materials.leg]);
}

const hairstyles=new Map();
const hairMaterials=[];
export function loadHair(onReady){
  for(const style of ['hair-short','hair-tied']){
    new T.TextureLoader().load('./assets/'+style+'.png',map=>{
      map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;
      for(const item of hairMaterials)if(item.style===style){
        item.hair.map=map;item.hair.color.set(item.tint);item.hair.alphaTest=.35;item.hair.needsUpdate=true;
      }
      onReady();
    });
  }
}
export function hairstyle(parent,identity,centre,size,colour){
  const name=identity===2||identity===3?'ponytail01':'short02';
  if(!hairstyles.has(name)){
    const geo=tailoredGeometry(name).clone(),p=geo.attributes.position;
    for(let i=0;i<p.count;i++)p.setXYZ(i,p.getX(i)*1.052,(p.getY(i)-.716)*1.03,(p.getZ(i)-.053)*1.05);
    geo.clearGroups();geo.computeVertexNormals();hairstyles.set(name,geo);
  }
  const hair=new T.MeshStandardMaterial({color:colour,roughness:.64,side:T.DoubleSide});
  hairMaterials.push({hair,style:name==='short02'?'hair-short':'hair-tied',tint:['#cebbb0','#e5c8a8','#dcb68e','#bc9b85'][identity]});
  hair.onBeforeCompile=s=>{
    s.vertexShader='varying vec2 strandUV;\n'+s.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\nstrandUV=uv;');
    s.fragmentShader='varying vec2 strandUV;\n'+s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      float strand=strandUV.x*640.+2.8*sin(strandUV.y*12.);
      float grain=(.11*cos(strand)+.06*sin(strand*2.31))/(1.+fwidth(strand));
      diffuseColor.rgb*=.93+grain+.12*sin(strandUV.x*48.+strandUV.y*6.);`);
  };
  const model=new T.Mesh(hairstyles.get(name),hair);model.position.copy(centre);model.scale.setScalar(size);
  if(identity===1){model.scale.y*=.97;model.rotation.y=.055;}
  model.castShadow=model.receiveShadow=true;parent.add(model);
}
const heads=[];
export function faceGeometry(identity){
  heads[identity]??=build('head',(x,y,z)=>{
    const child=identity===1||identity===2;
    const face=T.MathUtils.smoothstep(z,.10,.95);
    const back=T.MathUtils.clamp((1.21-z)/1.32,0,1);
    const hairline=8.15-1.57*back-.15*Math.sin(x*5+.8)*face;
    const scalp=T.MathUtils.smoothstep(y-hairline,-.048,.053);
    const u=.5+x*.216;
    const v=T.MathUtils.clamp((y-6.07)/2.31,.018,.983);
    const neckline=T.MathUtils.smoothstep(y,6.10,6.36)*face;
    const cheeks=Math.exp(-(((y-6.89)/.37)**2));
    const width=child?.98+.055*cheeks:identity===3?.95:identity===6?1.055:1.02;
    const smile=Math.exp(-(((Math.abs(x)-.26)/.16)**2+((y-6.61)/.16)**2))*face*(identity<=3?.027:.004);
    // The portrait ends at the cheek contour. The temple and ears use
    // side skin so background pixels never wrap around the jaw.
    const cheekContour=1-T.MathUtils.smoothstep(Math.abs(x),.51,.76);
    return [x*.105*width,(y-7.16+smile)*.103,(z-.53)*.105,
      u,v,scalp,neckline*cheekContour*T.MathUtils.smoothstep(z,.14,.90)];
  });
  const geo=heads[identity];
  if(identity<4&&!geo.morphAttributes.position){
    const p=geo.attributes.position,offset=[];
    for(let i=0;i<p.count;i++){
      const x=p.getX(i),y=p.getY(i),front=smooth(p.getZ(i),.027,.080);
      const lobe=(cx,cy,rx,ry)=>Math.exp(-(((Math.abs(x)-cx)/rx)**2+((y-cy)/ry)**2))*front;
      const corner=lobe(.031,-.055,.018,.014),cheek=lobe(.043,-.017,.021,.025),lid=lobe(.034,.003,.014,.008);
      offset.push(Math.sign(x)*.0024*corner,.0042*corner+.0027*cheek+.0015*lid,.0024*cheek);
    }
    geo.morphTargetsRelative=true;geo.morphAttributes.position=[new T.Float32BufferAttribute(offset,3)];
  }
  return heads[identity];
}
