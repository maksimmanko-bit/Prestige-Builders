import * as T from './vendor/three.module.js';
import { ease,between,mix } from './story.js';
import { vec,group,mesh,block,rod,tubing,span,finish,poseWorker,gloveContact } from './site-work.js';
import { walkRoute } from './footsteps.js';

const zinc=finish('#9babae',.40,.68),iron=finish('#333b3b',.68,.38);
const bone=finish('#cec6b7'),black=finish('#242b2a',.70),brass=finish('#a88652',.33,.70);
const mint=finish('#678d78'),blue=finish('#496f84'),red=finish('#a15c51'),yellow=finish('#c38a3e');
const boardWidth=1.18,boardH=2.31;
const clamp=T.MathUtils.clamp;

function drill(parent){
  const driver=group(parent);
  block(driver,mint,0,0,.014,.077,.102,.16,.024);
  block(driver,black,0,-.066,.002,.055,.105,.072,.018);
  block(driver,black,0,-.117,.021,.085,.040,.097,.01);
  rod(driver,iron,vec(0,0,-.065),vec(0,0,-.106),.032,20);
  rod(driver,zinc,vec(0,0,-.106),vec(0,0,-.165),.007,8);return driver;
}

// Eight subdivisions per span put a complete cross section precisely at
// each guide, glove and connector. Only the dynamic section is rewritten.
function serviceCable(bay){
  const spans=5,rings=spans*8+1,sides=8,geo=new T.BufferGeometry(),indices=[];
  const xyz=new T.Float32BufferAttribute(new Float32Array(rings*sides*3),3);
  const normals=new T.Float32BufferAttribute(new Float32Array(rings*sides*3),3);
  xyz.setUsage(T.DynamicDrawUsage);normals.setUsage(T.DynamicDrawUsage);
  for(let i=0;i<rings-1;i++)for(let j=0;j<sides;j++){
    const a=i*sides+j,b=i*sides+(j+1)%sides;indices.push(a,b,a+sides,b,b+sides,a+sides);
  }
  geo.setAttribute('position',xyz);geo.setAttribute('normal',normals);geo.setIndex(indices);
  const wire=mesh(bay,geo,finish('#d2a25b',.65));wire.frustumCulled=false;
  const curve=new T.CatmullRomCurve3(),p=vec(),tangent=vec(),v=vec(),n=vec(),normal=vec();
  const surfaceOffsets=Array.from({length:spans+1},()=>vec());
  function set(points){
    curve.points=points;
    // At a sloping bend the jacket's front vertex is no longer 9 mm
    // straight ahead of its centre. Match that vertex to the leather.
    for(const knot of [3,4]){
      curve.getTangent(knot/spans,tangent);
      v.set(1,0,0).cross(tangent).normalize();
      surfaceOffsets[knot].set(0,0,.009).addScaledVector(v,-.009);
    }
    for(let i=0;i<rings;i++){
      curve.getPoint(i/(rings-1),p);curve.getTangent(i/(rings-1),tangent);
      const span=Math.min(spans-1,Math.floor(i/8)),blend=ease(i/8-span,0,1);
      p.addScaledVector(surfaceOffsets[span],1-blend).addScaledVector(surfaceOffsets[span+1],blend);
      v.set(1,0,0).cross(tangent).normalize();n.crossVectors(tangent,v);
      for(let j=0;j<sides;j++){
        const angle=j*2*Math.PI/sides;normal.copy(v).multiplyScalar(Math.cos(angle)).addScaledVector(n,Math.sin(angle));
        const k=i*sides+j;normals.setXYZ(k,normal.x,normal.y,normal.z);
        xyz.setXYZ(k,p.x+.009*normal.x,p.y+.009*normal.y,p.z+.009*normal.z);
      }
    }
    xyz.needsUpdate=normals.needsUpdate=true;
  }
  return {wire,set};
}

function drywall(parent,mat,x,sockets){
  const shape=new T.Shape();
  shape.moveTo(-boardWidth/2,0);shape.lineTo(boardWidth/2,0);shape.lineTo(boardWidth/2,boardH);
  shape.lineTo(-boardWidth/2,boardH);shape.closePath();
  for(const [worldX,y,w,h] of sockets){
    if(Math.abs(worldX-x)>.52)continue;
    const a=worldX-x-w/2,b=a+w,c=y-h/2,d=c+h;
    const hole=new T.Path();hole.moveTo(a,c);hole.lineTo(a,d);hole.lineTo(b,d);hole.lineTo(b,c);hole.closePath();shape.holes.push(hole);
  }
  const geo=new T.ExtrudeGeometry(shape,{depth:.014,bevelEnabled:false});
  geo.translate(0,0,.138);return mesh(parent,geo,mat,x,0,0);
}

// The roller and the paint material use the same coverage function. The upper
// and lower turnaround arcs leave a soft nap edge rather than a rectangular wipe.
const strokes=20,rollW=.258;
function paintPath(t){
  const n=Math.min(strokes-1,Math.floor(t*strokes)),f=t*strokes-n;
  const advance=ease(f,.79,1)*(n<strokes-1?1:0),stroke=ease(f,0,.79);
  return vec(-2.27+(n+advance)*.238,mix(n%2?2.23:.09,n%2?.09:2.23,stroke),.182);
}
function paintMaterial(){
  const mat=finish('#dfdacf',.95),paint={value:-1};
  mat.onBeforeCompile=shader=>{
    shader.uniforms.coatingTime=paint;
    shader.vertexShader='varying vec2 wallMetres;\n'+shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
      wallMetres=vec2((modelMatrix*vec4(transformed,1.)).x-5.01,transformed.y);`);
    shader.fragmentShader='uniform float coatingTime; varying vec2 wallMetres;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      float grain=fract(sin(dot(floor(wallMetres*760.),vec2(71.43,37.8)))*4375.83);
      float cover=0.;
      for(int i=0;i<20;i++){
        float p=clamp(coatingTime*20.-float(i),0.,1.);
        if(p>0.){
          float u=smoothstep(0.,.79,p);
          float start=mod(float(i),2.)<.5?.09:2.23;
          float end=mix(start,2.32-start,u);
          vec2 gap=vec2(max(abs(wallMetres.x-(-2.27+float(i)*.238))-.120,0.),max(max(min(start,end)-wallMetres.y,wallMetres.y-max(start,end)),0.));
          float edge=length(gap/vec2(.018,.095));
          cover=max(cover,1.-smoothstep(.70,1.0,edge+.1*grain));
        }
      }
      diffuseColor.rgb*=mix(vec3(.96+.035*grain),vec3(.53,.65,.53)*(.982+.031*grain),cover);`);
  };
  return {mat,paint};
}

export function wallTrades(parent,mats,createWorker){
  const bay=group(parent,5.01,.207,-1.73),equipment=group(bay);
  const studs=group(bay),cover=group(bay);
  // Framed service partition along the inside of the garage's back wall.
  const sheathing=finish('#f0e7d6',.96);sheathing.map=sheathing.bumpMap=mats.sheathing;sheathing.bumpScale=.009;
  block(studs,sheathing,0,1.16,-.099,4.83,2.34,.032);
  const sideLinings=group(bay),sideFinish=finish('#d0cbc0',.94);
  for(const x of [-2.61,2.65]){
    block(sideLinings,sideFinish,x,1.22,2.53,.033,2.47,5.19);
    block(sideLinings,bone,x-Math.sign(x)*.018,.061,2.53,.026,.112,5.19);
    for(const z of [.54,1.78,3.02,4.26])block(sideLinings,sideFinish,x-Math.sign(x)*.018,1.22,z,.003,2.42,.005);
  }
  block(sideLinings,sideFinish,.02,2.52,2.5,5.26,.045,5.19);
  for(const z of [.8,3.65]){block(sideLinings,zinc,0,2.487,z,1.06,.035,.13,.01);block(sideLinings,bone,0,2.461,z,1.01,.016,.095,.006);}
  for(let i=0;i<=8;i++)block(studs,mats.timber,-2.36+i*.59,1.16,0,.048,2.32,.14);
  for(const h of [.029,2.296])block(studs,mats.timber,0,h,.004,4.77,.058,.144);
  const socketX=-1.69,socketY=1.12,box=group(bay,socketX,socketY,.065);
  block(box,iron,0,0,0,.13,.186,.074,.009);
  for(const x of [-.061,.061])block(box,zinc,x,0,.06,.013,.19,.067);
  for(const y of [-.089,.089])block(box,zinc,0,y,.06,.137,.011,.067);
  block(box,black,0,0,.044,.101,.15,.014);
  const feed=vec(socketX+.025,.056,.047),entry=vec(socketX,1.044,.083);
  const {wire:cable,set:shapeCable}=serviceCable(bay);
  const saddle=block(bay,zinc,feed.x,.203,.060,.035,.022,.019,.004);
  const reel=group(equipment,-.96,.24,.72),coil=group(reel);
  for(const x of [-.166,.166])rod(coil,bone,vec(x-.01,0,0),vec(x+.01,0,0),.214,36);
  rod(coil,yellow,vec(-.152,0,0),vec(.152,0,0),.164,32);
  for(let j=0;j<18;j++)rod(coil,finish('#afa07b'),vec(-.145+j*.017,0,0),vec(-.14+j*.017,0,0),.167,24);
  for(const x of [-.205,.205]){
    block(reel,iron,x,-.22,0,.078,.04,.43,.009);
    rod(reel,zinc,vec(x,-.20,.14),vec(x,0,0),.017);
    rod(reel,zinc,vec(x,-.20,-.14),vec(x,0,0),.017);
  }
  rod(reel,zinc,vec(-.24,0,0),vec(.24,0,0),.021);
  tubing(reel,finish('#d2a25b'),[vec(0,-.15,-.073),vec(-.15,-.225,-.22),vec(-.50,-.229,-.53),feed.clone().sub(reel.position)],.009);
  const seatedLeft=vec(feed.x,.734,.057),seatedRight=vec(entry.x,.975,.075);
  function routeWire(left,right,end,bow){
    shapeCable([feed,vec(feed.x,.203,.047),vec(feed.x+.018,(left.y+.203)*.5,.053+bow),left,right,end]);
  }
  routeWire(seatedLeft,seatedRight,entry,0);
  const pipes=group(bay),runs=[];
  for(const [x,colour,top] of [[.31,blue,1.01],[.48,red,1.01],[.84,black,.72]]){
    const radius=colour===black?.046:.019;
    const riser=rod(pipes,colour,vec(x,.035,.002),vec(x,top,.002),radius);
    const elbow=tubing(pipes,colour,[vec(x,top-.044,.002),vec(x,top,.024),vec(x,top,.17)],radius);
    const ferrule=rod(pipes,colour===black?black:brass,vec(x,top,.093),vec(x,top,.126),radius*1.28);
    const cap=rod(pipes,colour===black?black:brass,vec(x,top,.159),vec(x,top,.181),radius*1.12);
    runs.push({x,top,riser,elbow,ferrule,cap});
  }
  const faucetPlate=block(bay,zinc,.394,1.0,.164,.35,.11,.012,.009);
  const outPlate=block(bay,bone,socketX,socketY,.168,.151,.222,.015,.01);
  for(const h of [-.046,.046]){
    block(outPlate,bone,0,h,.012,.080,.071,.010,.01);
    for(const dx of [-.018,.018])block(outPlate,black,dx,h+.003,.019,.009,.025,.003);
  }
  // Slightly ragged edges and stippled fibres read through the open timber bays.
  const wool=finish('#ebe3be',.99);wool.map=wool.bumpMap=mats.insulation;wool.bumpScale=.016;
  const batts=[];
  for(let i=0;i<8;i++){
    const x=-2.065+i*.59;
    const batt=block(bay,wool,x,1.157,.034,.548,2.213,.089,.040);
    batts.push({batt,x});
  }
  const {mat:boardMat,paint}=paintMaterial();
  const sheets=[],screws=[],joints=[];
  const sockets=[[socketX,socketY,.136,.19],[.39,1.01,.34,.10],[.84,.72,.114,.114]];
  for(let i=0;i<4;i++){
    const x=-1.77+i*boardWidth,board=drywall(cover,boardMat,x,sockets);sheets.push({board,x});
    const points=[vec(x-.54,.81,.157),vec(x-.54,1.28,.157),vec(x-.54,1.71,.157)];
    for(const p of points){
      const screw=rod(cover,iron,p.clone().add(vec(0,0,-.008)),p,.008,10);screws.push(screw);
    }
    if(i)joints.push(block(cover,bone,x-.59,1.154,.154,.061,2.30,.002));
  }
  const electrician=createWorker(equipment,0),plumber=createWorker(equipment,2);
  const truck=group(equipment,-1.28,0,1.08);
  for(const x of [-.45,.45]){
    rod(truck,black,vec(x-.028,.072,0),vec(x+.028,.072,0),.070,18);
    rod(truck,zinc,vec(x,.12,.11),vec(x,.95,-.11),.024);
  }
  block(truck,iron,0,.11,.095,1.18,.048,.46,.009);
  const driver=drill(equipment);
  const crimper=group(equipment),jaws=[];
  mesh(crimper,new T.TorusGeometry(.043,.012,8,20),zinc);
  for(const s of [-1,1]){
    const lever=group(crimper,s*.019,-.032,0);
    rod(lever,zinc,vec(),vec(s*.04,-.10,.035),.013);
    rod(lever,black,vec(s*.04,-.10,.035),vec(s*.065,-.20,.096),.020);
    jaws.push(lever);
  }
  const seamKnife=group(equipment);
  block(seamKnife,zinc,0,.02,0,.19,.090,.008);
  block(seamKnife,iron,0,-.070,.018,.042,.105,.032,.009);
  const roller=group(equipment),rollerNap=rod(roller,finish('#9cae94',.96),vec(-rollW/2,0,0),vec(rollW/2,0,0),.046,28);
  tubing(roller,zinc,[vec(.137,0,0),vec(.151,0,.027),vec(.151,-.11,.042),vec(.016,-.15,.06)],.009);
  const pole=rod(equipment,mint,vec(),vec(0,1,0),.016);
  const tray=group(equipment,-1.88,.048,.91);
  block(tray,zinc,0,0,0,.37,.061,.60,.018);block(tray,finish('#95a28e',.45),0,.030,.063,.32,.02,.36,.012);
  const rollerGrip=group(equipment);
  rod(rollerGrip,black,vec(),vec(0,.14,0),.023);
  // A floor lamp and an open tool case give the bay depth and physical scale.
  const stand=group(equipment,2.18,0,.44);
  rod(stand,iron,vec(0,.1,0),vec(0,1.54,0),.019);
  for(let i=0;i<3;i++){const a=2.094*i;rod(stand,iron,vec(0,.34,0),vec(.27*Math.cos(a),.01,.27*Math.sin(a)),.016);}
  block(stand,yellow,0,1.55,0,.36,.20,.08,.016);block(stand,bone,0,1.55,.048,.31,.15,.016);
  block(equipment,black,-2.04,.071,.45,.46,.14,.29,.033);
  const light=new T.PointLight('#fff2e2',5.4,6,2);light.position.set(-.41,2.26,1.72);equipment.add(light);
  const reflectedLight=new T.PointLight('#fff2e2',.32,2.4);reflectedLight.position.set(socketX+.74,1.72,.66);equipment.add(reflectedLight);
  const insulationSteps=batts.map(({x})=>{
    const yaw=Math.PI-.73;
    return walkRoute([vec(x-.17,0,1.105),vec(x-.17,0,.455)],1,yaw,yaw,undefined,yaw);
  });
  function update(stage,t){
    bay.visible=stage>=6;
    equipment.visible=stage>=6&&stage<=10;
    if(!bay.visible)return;
    electrician.g.visible=equipment.visible&&stage!==7;
    plumber.g.visible=stage===7;
    reel.visible=stage===6;truck.visible=stage===9&&t<.83;
    box.visible=saddle.visible=true;
    if(stage!==6&&cable.userData.handled){routeWire(seatedLeft,seatedRight,entry,0);cable.userData.handled=false;}
    pipes.visible=stage>=7;outPlate.visible=faucetPlate.visible=stage>10;
    sideLinings.visible=stage>=9;
    const pipeOrder=[2,0,1];
    for(const [i,run] of runs.entries()){
      const local=stage===7?clamp(t*3-pipeOrder.indexOf(i),0,1):stage>7?1:0;
      const set=ease(local,.06,.51);
      run.riser.visible=local>0;run.riser.position.x=run.x+(1-set)*.21;run.riser.position.z=.002+(1-set)*.24;
      run.riser.rotation.z=(1-set)*-.30;
      for(const part of [run.elbow,run.ferrule,run.cap]){part.visible=local>.48;part.position.z=(part.userData.restZ??=part.position.z)+.14*(1-ease(local,.48,.68));}
    }
    for(const [i,{batt,x}] of batts.entries()){
      const u=stage===8?clamp(8*t/.84-i,0,1):stage>8?1:0;
      batt.visible=u>0;batt.position.set(x,1.157+.08*(1-u),.034+.65*(1-ease(u,.05,.90)));
      batt.rotation.z=.077*Math.sin(u*Math.PI);
      if(stage===8&&i===7)batt.scale.y=.968+.032*ease(t,.916,.978);
      else batt.scale.y=1;
    }
    const hang=stage===9?Math.min(t/.78,1):stage>9?1:0;
    for(const [i,{board,x}] of sheets.entries()){
      const local=clamp(hang*4-i,0,1),lift=ease(local,0,.46);
      board.visible=stage>=9;board.position.set(mix(-1.28,x,lift),mix(.141,0,lift)+.10*Math.sin(lift*Math.PI),mix(1.21+i*.034,0,lift));
      board.rotation.x=-.17*(1-lift);board.rotation.y=.08*(1-lift);
      for(let j=0;j<3;j++){const screw=screws[3*i+j];screw.visible=local>(.54+j*.18)&&stage<=9;}
    }
    const tape=stage===9?between(t,.78,1):stage>9?1:0;
    joints.forEach((j,i)=>{const v=clamp(tape*3-i,0,1);j.visible=v>0&&stage<=9;j.scale.y=v;j.position.y=1.154*v;});
    const coating=stage===10?(.20*between(t,.04,.51)+.80*between(t,.51,.965)):stage>10?1:-1;paint.value=coating;
    driver.visible=stage===9&&t<.78;
    crimper.visible=stage===7;seamKnife.visible=stage===9&&t>=.78;
    roller.visible=pole.visible=rollerGrip.visible=tray.visible=stage===10;
    if(!equipment.visible)return;
    let x=0,z=.48,drop=.014,lean=.09,yaw=Math.PI-.22,aim,left,right,footMarks;
    const actor=stage===7?plumber:electrician;
    if(stage===6){
      const pull=ease(t,.035,.48),guide=ease(t,.43,.79),insert=ease(t,.74,.86),letGo=ease(t,.87,.985);
      const bow=.13*Math.sin(Math.PI*pull)*(1-guide);
      right=vec(socketX+.10,mix(.54,1.05,pull),.275+bow).lerp(seatedRight,guide);
      left=vec(socketX+.17,mix(.34,.70,pull),.210+bow*.5).lerp(seatedLeft,guide);
      const end=right.clone().add(vec(-.010,.069,.012-.025*guide)).lerp(entry,insert);
      const targets=[left.clone(),right.clone()];
      for(const [j,p] of targets.entries())p.add(vec(0,0,.009)).lerp(vec(socketX+(j?-.10:.22),.73,.36),letGo);
      const centre=targets[0].clone().lerp(targets[1],.5);
      poseWorker(actor,{x:socketX+.055,z:.47,yaw:Math.PI-.12,drop:clamp(.99-centre.y,.018,.55),
        lean:.30+.28*(1-pull),contact:true,hold:1-letGo,left:targets[0],right:targets[1],look:end});
      for(const [j,point] of [left,right].entries()){
        if(letGo>0)point.copy(j?seatedRight:seatedLeft);
        else {point.copy(bay.worldToLocal(gloveContact(actor.arms[j],true)));point.z-=.009;}
      }
      routeWire(left,right,end,bow);cable.userData.handled=true;
      coil.rotation.x=-pull*3.4-guide*.65;
      bay.userData.focus=end.clone().add(bay.position);
      return;
    }else if(stage===7){
      const index=Math.min(2,Math.floor(t*3)),u=t*3-index,run=runs[pipeOrder[index]];
      const seat=ease(u,.1,.57),press=Math.sin(Math.PI*ease(u,.69,.95));
      aim=vec(run.x+.18*(1-seat),run.top,.12+.18*(1-seat));
      crimper.visible=u>=.59;crimper.position.copy(aim);crimper.rotation.z=-.19;
      jaws.forEach((j,i)=>j.rotation.z=(i?1:-1)*.25*(1-press));
      x=aim.x+.13;drop=clamp(.99-run.top,.018,.28)+.012*press;z=.38;
      left=aim.clone().add(vec(.10,-.15,.08));
      right=aim.clone().add(vec(-.082,-.17,.074));
    }else if(stage===8){
      const i=Math.min(7,Math.floor(t/.84*8)),b=batts[i].batt;
      aim=vec(b.position.x,1.30,.096+b.position.z);
      if(t>.84)aim.y+=.39*ease(t,.84,.91);
      x=aim.x;z=aim.z+.36;
      const route=insulationSteps[i],insertion=ease(clamp(t/.84*8-i,0,1),.05,.90);
      footMarks=route.feet(route.total*insertion);
      left=aim.clone().add(vec(.20,.09,0));right=aim.clone().add(vec(-.20,-.13,0));
    }else if(stage===9&&t<.78){
      const i=Math.min(3,Math.floor(hang*4)),u=hang*4-i,{board,x:cx}=sheets[i];
      if(u<.46){
        aim=vec(board.position.x,1.16,.18+board.position.z);driver.visible=false;
        x=aim.x+.05;z=aim.z+.34;
        left=aim.clone().add(vec(.23,.13,0));right=aim.clone().add(vec(-.22,-.17,0));
      }else{
        const j=Math.min(2,Math.floor((u-.46)/.18)),screw=screws[i*3+j],phase=(u-.46)/.18-j,drive=ease(phase,.35,.65);
        const previous=j?screws[i*3+j-1].position:vec(cx,1.19,.18);
        aim=previous.clone().lerp(screw.position,ease(phase,0,.36));
        driver.position.copy(aim).add(vec(0,0,.165+.05*(1-drive)+.025*ease(phase,.86,1)));
        right=driver.position.clone().add(vec(0,-.069,.013));left=aim.clone().add(vec(.18,-.025,.065));
        x=aim.x+.14;z=.56;drop=clamp(1.16-aim.y,0,.47);
      }
    }else if(stage===9){
      const i=Math.min(2,Math.floor(tape*3)),u=tape*3-i;
      aim=vec(joints[i].position.x,Math.max(.12,u*2.29),.17);
      seamKnife.position.copy(aim);right=aim.clone().add(vec(0,-.072,.022));left=aim.clone().add(vec(.14,.05,.10));
      x=aim.x+.10;drop=clamp(1.28-aim.y,0,.58);
    }else{
      aim=paintPath(coating);roller.position.copy(aim);rollerNap.rotation.y=coating*80;
      const handle=vec(aim.x+.14,clamp(aim.y-.19,.82,1.39),.64+clamp(1.38-aim.y,-.24,.12));
      span(pole,aim.clone().add(vec(.015,-.14,.06)),handle);
      rollerGrip.position.copy(handle);right=handle.clone();left=handle.clone().lerp(aim,.24);
      x=handle.x+.04;z=.93;drop=clamp(.86-handle.y,.012,.045);
    }
    const side=stage===7?-1:1;
    yaw=Math.PI-side*.73;
    poseWorker(actor,{x:x-side*.17,z:z-.035,yaw,lean,drop,footMarks,left,right,look:aim});
    bay.userData.focus=aim.clone().add(bay.position);
  }
  return {bay,update,paint,cable,electrician,boards:sheets.map(s=>s.board)};
}
