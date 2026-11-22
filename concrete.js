import * as T from './vendor/three.module.js';
import { ease, mix, between } from './story.js';
import { vec,finish,group,mesh,block,rod,span,tubing,poseWorker } from './site-work.js';

const rubber=finish('#252a29',.91),metal=finish('#aeb7b5',.37,.77),chassis=finish('#364243',.70,.42);
const white=finish('#dddcd2',.45,.14),green=finish('#51695e',.51,.24),amber=finish('#df9140',.38);
const glass=new T.MeshPhysicalMaterial({color:'#52666b',metalness:.33,roughness:.15});
function mixer(parent){
  const truck=group(parent,9.24,-.19,-.74);
  block(truck,chassis,0,.65,0,1.68,.30,5.94,.09);
  for(const z of [-2.21,1.04,2.09])for(const sign of [-1,1]){
    const axle=(x,r,m,w)=>rod(truck,m,vec(x-w/2,.48,z),vec(x+w/2,.48,z),r,28);
    axle(sign*.93,.51,rubber,.34);axle(sign*1.11,.30,metal,.028);axle(sign*1.13,.128,chassis,.044);
    for(let j=0;j<8;j++){const a=j*Math.PI/4;
      rod(truck,metal,vec(sign*1.14,.48+.20*Math.sin(a),z+.20*Math.cos(a)),vec(sign*1.16,.48+.20*Math.sin(a),z+.20*Math.cos(a)),.023,6);}
  }
  block(truck,green,0,1.34,-2.03,1.88,1.18,1.64,.16);
  block(truck,white,0,2.12,-1.97,1.85,.96,1.49,.16);
  block(truck,glass,0,2.19,-2.719,1.59,.59,.04,.035);
  for(const x of [-.926,.926]){
    block(truck,glass,x,2.20,-1.99,.025,.55,1.02,.007);
    block(truck,metal,x,1.69,-1.65,.04,.045,.21);
    rod(truck,chassis,vec(x,2.06,-2.51),vec(x*1.31,2.11,-2.47),.028);
    block(truck,chassis,x*1.32,2.17,-2.47,.095,.25,.11,.027);
  }
  block(truck,metal,0,.83,-2.96,1.99,.21,.16,.045);
  for(const x of [-.71,.71])block(truck,white,x,1.24,-2.86,.34,.16,.04,.025);
  for(let i=0;i<5;i++)block(truck,chassis,0,1.04+i*.066,-2.866,.83,.025,.023);
  for(const sign of [-1,1]){
    block(truck,green,sign*.97,1.02,-2.17,.41,.085,.96,.030);
    for(let i=0;i<2;i++)block(truck,metal,sign*1.025,.67+i*.18,-1.40,.30,.05,.55,.011);
    for(const z of [.49,2.62])rod(truck,chassis,vec(sign*.94,.51,z),vec(sign*.94,1.14,z),.032);
    block(truck,chassis,sign*.97,1.15,1.58,.44,.077,2.16,.025);
    block(truck,amber,sign*.76,2.62,-2.55,.09,.044,.072,.013);
    block(truck,amber,sign*.91,.85,2.98,.18,.10,.026,.005);
  }
  for(const x of [-.70,-.40])rod(truck,metal,vec(x,.63,2.73),vec(x,2.53,1.96),.025);
  for(let j=0;j<7;j++){
    const f=j/7;
    rod(truck,metal,vec(-.70,.67+f*1.78,2.71-f*.74),vec(-.40,.67+f*1.78,2.71-f*.74),.020);
  }
  const bed=group(truck,0,1.81,.42);bed.rotation.x=1.34;
  const profile=[[.22,-1.58],[.54,-1.48],[.89,-1.05],[.98,-.64],[1,-.31],[.94,.35],[.76,.88],[.44,1.48],[.39,1.62]];
  const drum=mesh(bed,new T.LatheGeometry(profile.map(p=>new T.Vector2(...p)),56),white);
  for(const [r,h] of [[.987,-.50],[.955,.20],[.88,.49]]){
    const band=mesh(drum,new T.CylinderGeometry(r,r,.075,56,1,true),green,0,h,0);band.scale.setScalar(1.008);}
  for(let i=0;i<3;i++){const a=i*2.094;
    tubing(drum,green,[vec(.97*Math.cos(a),-.57,.97*Math.sin(a)),vec(Math.cos(a+.36),-.21,Math.sin(a+.36)),vec(.95*Math.cos(a+.74),.30,.95*Math.sin(a+.74))],.034);}
  // Open, U-shaped chute between the outlet and the pump's receiving hopper.
  const chute=mesh(truck,new T.CylinderGeometry(.275,.22,2.17,20,1,true,Math.PI/2,Math.PI),metal);
  chute.rotation.x=1.98;chute.position.set(0,1.60,2.87);
  for(const x of [-.55,.55])rod(truck,chassis,vec(x,.79,2.57),vec(x*.62,2.12,1.89),.066);
  const pump=group(parent,9.24,-.19,3.51);
  block(pump,green,0,.49,.10,1.12,.71,1.61,.10);
  block(pump,chassis,0,.90,0,.83,.14,.89,.03);
  for(const x of [-.46,.46])block(pump,metal,x,1.03,0,.085,.36,.93,.018);
  for(const z of [-.45,.45])block(pump,metal,0,1.03,z,.98,.36,.085,.018);
  rod(pump,rubber,vec(-.67,.30,.38),vec(.67,.30,.38),.245,24);
  for(const x of [-.67,.67])rod(pump,metal,vec(x-.012,.30,.38),vec(x+.012,.30,.38),.14);
  for(let j=0;j<8;j++)block(pump,chassis,0,.39+j*.047,.912,.69,.015,.013);
  return drum;
}

// Store the arrival of the hose at each vertex. Seeking can then rebuild either
// slab directly, including the wet edge, without replaying any earlier frames.
function makeSlab(parent,mats,bounds,route){
  const [x0,x1,z0,z1]=bounds;
  const geo=new T.PlaneGeometry(x1-x0,z1-z0,Math.ceil((x1-x0)*10),Math.ceil((z1-z0)*10));
  geo.rotateX(-Math.PI/2);geo.translate((x0+x1)/2,0,(z0+z1)/2);
  const material=new T.MeshStandardMaterial({map:mats.concrete.map,vertexColors:true,roughness:.39,metalness:.055,bumpMap:mats.concrete.map,bumpScale:.009});
  const pos=geo.attributes.position,uv=geo.attributes.uv,arrivals=[],grain=[],colors=new Float32Array(pos.count*3);
  for(let i=0;i<pos.count;i++){
    const x=pos.getX(i),z=pos.getZ(i);uv.setXY(i,x*.65,z*.65);
    let arrival=1;
    for(const [a,b,start,end] of route){
      const dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);
      const u=T.MathUtils.clamp(((x-a.x)*dx+(z-a.z)*dz)/(len*len),0,1);
      const dist=Math.hypot(x-a.x-dx*u,z-a.z-dz*u);
      if(dist<.60)arrival=Math.min(arrival,mix(start,end,u)+.012*(dist/.57)**2);
    }
    arrivals.push(arrival);
    grain.push(.012*Math.sin(23*x+z*4)+.009*Math.cos(16*z-3*x)+.014*Math.sin(5*x+11*z));
  }
  geo.setAttribute('color',new T.BufferAttribute(colors,3));
  const slab=mesh(parent,geo,material);slab.receiveShadow=true;slab.castShadow=false;slab.frustumCulled=false;
  function update(t,screed,cure){
    const tint=mix(.33,.78,cure);material.roughness=mix(.37,.90,cure);
    for(let i=0;i<pos.count;i++){
      const fill=ease(t,arrivals[i]-.006,arrivals[i]+.035),x=pos.getX(i),z=pos.getZ(i);
      const pass=z>2.38&&z<3.24?ease(screed*6.54+2.05-x,-.1,.1):cure;
      pos.setY(i,mix(-.202,.206+grain[i]*(1-pass)*(1-cure),fill));
      const value=tint+grain[i]*(1-cure);
      colors[i*3]=value;colors[i*3+1]=value*1.015;colors[i*3+2]=value*.99;
    }
    pos.needsUpdate=true;geo.attributes.color.needsUpdate=true;geo.computeVertexNormals();
  }
  return update;
}
export function concretePour(parent,mats,createWorker){
  const root=group(parent),crew=group(root),drum=mixer(crew);
  const worker=createWorker(crew,0);
  white.map=mats.fleet;white.bumpMap=mats.fleet;white.bumpScale=.004;white.needsUpdate=true;
  const bounds=[[2.21,7.853,-2.25,3.25],[-6.5,2.21,-3.6,2.5]];
  const route=[];
  function addStrip(a,b,start,end){route.push([a,b,start,end]);}
  let previous;
  for(const [site,[x0,x1,z0,z1]] of bounds.entries()){
    const rows=Math.ceil((z1-z0)/.75);
    for(let row=0;row<rows;row++){
      const z=z1-(row+.5)*(z1-z0)/rows;
      const a=vec(row%2?x0+.25:x1-.25,0,z),b=vec(row%2?x1-.25:x0+.25,0,z);
      const start=site?.73+row*.27/rows:row===0?0:.47+(row-1)*.26/(rows-1);
      const end=site?.73+(row+1)*.27/rows:row===0?.47:.47+row*.26/(rows-1);
      if(previous)addStrip(previous,a,start,start+(end-start)*.10);
      addStrip(a,b,previous?start+(end-start)*.10:start,end);previous=b;
    }
  }
  const slabs=bounds.map(b=>makeSlab(root,mats,b,route));
  const nozzle=rod(crew,metal,vec(0,0,0),vec(0,1,0),.065);
  const wet=finish('#5e605a',.35);
  const discharge=rod(crew,wet,vec(9.24,1.10,3.10),vec(9.24,.88,3.22),.084);
  const stream=rod(crew,wet,vec(),vec(0,1,0),.054);
  const pipe=mesh(crew,new T.BufferGeometry(),rubber);pipe.frustumCulled=false;
  const strick=group(crew);
  block(strick,metal,0,0,0,.085,.084,1.12,.01);
  rod(strick,metal,vec(0,.04,.25),vec(.20,.86,.59),.021);
  rod(strick,metal,vec(0,.04,-.23),vec(.20,.86,.59),.021);
  rod(strick,rubber,vec(.06,.85,.59),vec(.36,.85,.59),.033);
  let previousFrame=-1;
  function update(t){
    root.visible=t>=0&&t<=1;if(!root.visible||previousFrame===t)return;
    previousFrame=t;const pouring=between(t,.07,.72),screed=ease(t,.75,.94),cure=ease(t,.91,1);
    crew.visible=t<.975;slabs.forEach(updateSlab=>updateSlab(pouring+(pouring===1?.045:0),screed,cure));
    const [a,b,start,end]=route.find(part=>pouring<=part[3])??route.at(-1);
    const tip=a.clone().lerp(b,between(pouring,start,end)),nozzleTop=tip.clone().add(vec(.03,1.02,.17));
    const nozzleEnd=tip.clone().add(vec(0,.49,.014));
    span(nozzle,nozzleEnd,nozzleTop);span(stream,tip.clone().add(vec(0,.13,0)),nozzleEnd);
    discharge.visible=stream.visible=t>.07&&t<.72;
    drum.rotation.y=10*t;
    const points=[vec(9.24,.36,4.22),vec(8.93,.02,4.89),vec(8.15,-.09,4.87),
      vec(tip.x+.66,.09,tip.z+.91),vec(tip.x+.43,.85,tip.z+.62),nozzleTop];
    const tube=new T.TubeGeometry(new T.CatmullRomCurve3(points),38,.065,10,false);
    pipe.geometry.dispose();pipe.geometry=tube;
    pipe.visible=nozzle.visible=t<.747;
    strick.visible=t>=.747;strick.position.set(mix(2.50,7.58,screed),.24,2.75);
    if(t<.747){
      poseWorker(worker,{x:tip.x+.04,y:-.10,z:tip.z+.59,yaw:Math.PI-.13,drop:.019,lean:.23,travel:tip.x-7.60,walking:ease(t,.07,.11)*(1-ease(t,.70,.72)),
        left:nozzleTop.clone().add(vec(.16,-.005,.14)),right:nozzleTop.clone().add(vec(-.015,-.20,-.07)),look:nozzleEnd});
    }else{
      const h=strick.position.clone().add(vec(.2,.84,.59));
      poseWorker(worker,{x:h.x,y:-.12,z:h.z+.37,drop:.022,lean:.22,travel:h.x-2.70,walking:Math.sin(Math.PI*screed),
        left:h.clone().add(vec(.13,0,0)),right:h.clone().add(vec(-.13,0,0)),look:strick.position});
    }
    root.userData.focus= t<.747?nozzleTop:strick.position.clone().add(vec(0,.66,.34));
  }
  return {root,update};
}
