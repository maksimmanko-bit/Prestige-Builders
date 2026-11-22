import { dressActor, fittedHand, hairstyle, shoe } from './anatomy.js';
import * as T from './vendor/three.module.js';
import { RoundedBoxGeometry } from './vendor/addons/geometries/RoundedBoxGeometry.js';
import { portrait, garment, limbRig } from './people.js';
import { ease, mix } from './story.js';
import { walkRoute, plantFeet } from './footsteps.js';
import { solve, vec } from './site-work.js';

let weave;
const fabric=color=>new T.MeshStandardMaterial({color,roughness:.91});
const palette={oak:fabric('#936a47'),linen:fabric('#c8b8a0'),iron:fabric('#292b2a'),ivory:fabric('#efdfc5'),teal:fabric('#445f5b'),brass:new T.MeshStandardMaterial({color:'#d9aa54',metalness:.65,roughness:.27})};
function group(parent,x=0,y=0,z=0){const g=new T.Group();g.position.set(x,y,z);parent.add(g);return g;}
function mesh(parent,geometry,mat,x,y,z){const m=new T.Mesh(geometry,mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
function block(parent,x,y,z,w,h,d,mat,r=0){
  const geometry=r?new RoundedBoxGeometry(w,h,d,2,Math.min(r,w/3,h/3,d/3)):new T.BoxGeometry(w,h,d);
  return mesh(parent,geometry,mat,x,y,z);
}
function oval(parent,x,y,z,a,b,c,mat){
  const o=mesh(parent,new T.SphereGeometry(1,18,14),mat,x,y,z);o.scale.set(a,b,c);return o;
}
function tube(parent,points,r,mat){
  const curve=new T.CatmullRomCurve3(points.map(v=>new T.Vector3(...v)));
  return mesh(parent,new T.TubeGeometry(curve,12,r,6,false),mat,0,0,0);
}
function turnPalm(actor,arm,side,weight){
  // In this hand mesh the back of the hand is the outward X axis.
  const forward=vec(side*.08,-.25,1).normalize(),up=vec(0,side,0);
  const y=forward.negate(),x=up.addScaledVector(y,-up.dot(y)).normalize(),z=x.clone().cross(y);
  const rotation=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(x,y,z));
  rotation.premultiply(actor.root.getWorldQuaternion(new T.Quaternion()));
  arm.hand.quaternion.slerp(rotation.premultiply(arm.elbow.getWorldQuaternion(new T.Quaternion()).invert()),weight);
}
function followWithEyesAndHead(actor,worldPoint,weight){
  if(weight===0)return;
  const gaze=actor.head.parent.worldToLocal(worldPoint.clone()).sub(actor.head.position);
  actor.head.rotation.y=mix(actor.head.rotation.y,T.MathUtils.clamp(Math.atan2(gaze.x,gaze.z),-.74,.74),weight);
  actor.head.rotation.x=mix(actor.head.rotation.x,T.MathUtils.clamp(-Math.atan2(gaze.y-.09,Math.hypot(gaze.x,gaze.z)),-.32,.43),weight);
}
function person(parent,{size,shirt,pants,skin,hair,hat=false},identity){
  const young=identity===1||identity===2,hipY=young?.916:.945;
  const root=group(parent),body=group(root),chest=group(body,0,hipY,0),head=group(chest,0,young?.502:.507,-.005);
  const cloth=garment(identity,'body',shirt),trousers=garment(identity,'leg',pants),complexion=fabric(skin);
  const headSize=young?(identity===1?1.21:1.17):1;
  const face=portrait(head,identity,new T.Vector3(0,.089,.009),headSize);
  if(!hat)hairstyle(head,identity,vec(0,.089,.009),headSize,hair);
  if(hat){const helmet=fabric('#d3c4a5');const dome=mesh(head,new T.SphereGeometry(.105,28,14,0,Math.PI*2,0,Math.PI/2),helmet,0,.179,0);dome.scale.set(1,.83,1.13);oval(head,0,.181,.016,.116,.009,.142,helmet);}
  const legs=[],arms=[];
  const leather=fabric(['#725341','#9ba59b','#a37661','#634a3c','#685542'][identity]);
  const outsole=fabric(['#514237','#d2c6b0','#c2ad8b','#574236','#3c3935'][identity]);
  for(const side of [-1,1]){
    const {upper:hip,lower:knee}=limbRig(body,new T.Vector3(side*(young?.088:.092),hipY,0),young?.403:.42);
    const ankle=group(knee,0,young?-.397:-.41,0);
    shoe(ankle,side,leather,outsole);
    const shoulderWidth=young?.160:identity===3?.174:.188;
    const {upper:shoulder,lower:elbow}=limbRig(chest,new T.Vector3(side*shoulderWidth,young?.4:.393,0),young?.242:.26);
    const hand=group(elbow,0,young?-.233:-.25,0);
    const fingers=fittedHand(hand,side,complexion);
    legs.push({hip,knee,ankle});arms.push({shoulder,elbow,hand,fingers});
  }
  dressActor(root,chest,legs,arms,{body:cloth,arm:cloth,leg:trousers,skin:complexion,identity,pelvis:body});
  root.scale.setScalar(size);
  const standing=.075+legs[0].knee.position.length()+legs[0].ankle.position.length()-.009-hipY;
  function pose(stride,sit,reach=0,turn=0){
    const forward=Math.sin(Math.PI*sit);
    body.position.set(.012*stride,mix(standing,-.448,sit),0);
    body.rotation.set(0,0,-stride*.022);chest.rotation.set(.31*forward-.055*sit,-stride*.09,.023*stride);
    head.rotation.set(-.13*forward,turn+.055*stride,.032*sit*turn);
    arms.forEach(({shoulder,elbow,hand,fingers},j)=>{
      const side=j?1:-1,offer=j?reach:0;
      shoulder.rotation.set(-.06+side*stride*.39-.39*sit-.50*forward-offer*.85,0,side*(.095+.03*forward));
      elbow.rotation.set(-.22-.18*Math.max(0,-side*stride)-.83*sit-.91*offer,0,0);
      hand.rotation.set(-.08,.30*side*offer,side*.035);
      fingers.morphTargetInfluences[0]=.27+.12*sit+.32*offer;
      if(offer>0){
        const grip=shoulder.quaternion.clone().multiply(elbow.quaternion).invert()
          .multiply(new T.Quaternion().setFromEuler(new T.Euler(-.45,side*.23,side*.22)));
        hand.quaternion.slerp(grip,offer);fingers.morphTargetInfluences[0]+=.25*offer;
      }
    });
  }
  return{root,body,chest,head,face,arms,legs,pose};
}

function livingRoom(parent,mats){
  const room=group(parent),walnut=mats.wood.clone();room.name='Living room';walnut.map=mats.oak??walnut.map;walnut.bumpMap=walnut.map;walnut.color.set('#d2c5af');
  const clay=fabric('#bba38d'),plaster=fabric('#d4c7b3');
  const floorY=.225,back=-3.42;
  for(let i=0;i<20;i++){
    const row=walnut.clone();row.color.offsetHSL(0,0,(i%5-2)*.018);
    block(room,-2.13,floorY,-3.25+i*.29,8.48,.055,.285,row);
  }
  block(room,-2.12,1.48,back,8.52,2.53,.12,plaster);block(room,-2.12,.327,back+.08,8.52,.15,.04,palette.ivory);
  block(room,-2.12,2.74,-.49,8.52,.08,5.85,palette.ivory);
  // A sectional with individual cushions, stitched welts and linen throw pillows.
  const sofa=group(room,-3.42,0,-2.28);
  block(sofa,0,.47,0,3.8,.38,.9,palette.teal,.12);
  block(sofa,0,.92,-.4,3.78,.78,.21,palette.teal,.11);
  for(const x of [-1.82,1.82])block(sofa,x,.69,0,.25,.65,1.02,palette.teal,.12);
  const cushions=[];
  for(const x of [-1.35,-.45,.45,1.35]){
    cushions.push(block(sofa,x,.686,.026,.88,.18,.86,palette.linen,.075));
    block(sofa,x,.994,-.315,.88,.56,.16,palette.linen,.065);
  }
  for(const x of [-1.55,1.55]){const pillow=block(sofa,x,.94,-.18,.4,.4,.15,clay,.09);pillow.rotation.z=x>0?-.25:.25;}
  block(room,-3.35,.264,-.98,4.3,.023,2,palette.linen,.01);
  for(let i=0;i<14;i++)block(room,-3.35,.28,-1.85+i*.14,4.17,.005,.011,clay);
  const table=group(room,-3.64,0,-.69);
  for(const x of [-.66,.66])block(table,x,.414,0,.13,.27,.47,walnut,.042);
  block(table,0,.578,0,1.73,.105,.63,walnut,.05);
  const book=block(table,-.37,.65,.01,.39,.04,.27,palette.ivory,.008);book.rotation.y=.13;
  for(const x of [.16,.38]){
    mesh(table,new T.CylinderGeometry(.064,.05,.099,24),clay,x,.69,.005);
    const handle=mesh(table,new T.TorusGeometry(.031,.007,8,16),clay,x+.069,.695,.005);handle.scale.x=.68;
  }
  const fireX=.34;
  block(room,fireX,1.48,-3.2,2.22,2.48,.35,mats.stone);
  block(room,fireX,.79,-2.986,1.62,.86,.12,palette.iron,.04);
  block(room,fireX,1.43,-2.95,2.32,.11,.53,walnut,.025);
  block(room,fireX,.33,-2.89,2.35,.17,.72,mats.stone,.02);
  const charred=fabric('#30251f');charred.bumpMap=mats.wood.map;charred.bumpScale=.017;
  for(let i=0;i<5;i++){const log=mesh(room,new T.CylinderGeometry(.057,.067,.39,16),charred,fireX-.49+i*.245,.49,-2.864);log.rotation.z=1.33;log.rotation.y=i*.59;}
  // Transparent flame sheets have a dark base, bright core and flickering tapered tips.
  const fireMaterial=new T.ShaderMaterial({
    transparent:true,depthWrite:false,side:T.DoubleSide,
    uniforms:{time:{value:0}},
    vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`
      varying vec2 vUv; uniform float time;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){
        vec2 a=floor(p),f=fract(p);f=f*f*(3.-2.*f);
        return mix(mix(hash(a),hash(a+vec2(1,0)),f.x),mix(hash(a+vec2(0,1)),hash(a+vec2(1)),f.x),f.y);
      }
      float turbulence(vec2 p){return noise(p)*.55+noise(p*2.09+1.7)*.30+noise(p*4.21)*.15;}
      void main(){
        float y=vUv.y,x=vUv.x;
        float drift=turbulence(vec2(x*5.,y*4.-time*2.8))-.5;
        float u=x+drift*(.045+y*.14);
        float flame=turbulence(vec2(u*13.,y*3.-time*2.2));
        float jets=.37+.34*sin(u*31.+.7)+.22*cos(u*57.);
        float heat=(jets*.45+.19+flame*.54-y)*1.45;
        heat*=smoothstep(.005,.09,x)*(1.-smoothstep(.9,1.,x));
        float alpha=smoothstep(.15,.46,heat)*smoothstep(.01,.11,y);
        if(alpha<.015)discard;
        vec3 fire=mix(vec3(.87,.16,.015),vec3(1.,.72,.21),smoothstep(.26,.86,heat));
        fire=mix(fire,vec3(1.,.92,.61),smoothstep(.7,1.25,heat));
        gl_FragColor=vec4(fire,alpha);
      }`
  });
  mesh(room,new T.PlaneGeometry(1.45,.64),fireMaterial,fireX,.79,-2.858);  const glow=new T.PointLight('#ff9f47',2.5,4);glow.position.set(fireX,.86,-2.65);room.add(glow);
  // Shelves, pottery, framed art and a shaded reading lamp give the room scale.
  for(const y of [.81,1.45,2.12])block(room,-1.32,y,-3.25,.9,.047,.27,walnut);
  for(let i=0;i<8;i++){const book=block(room,-1.69+i*.075,1.62,-3.17,.06,.28+i%3*.035,.16,i%2?clay:palette.teal);book.rotation.z=i===7?-.12:0;}
  for(const [x,y] of [[-1.36,1.04],[-1.22,2.31]])oval(room,x,y,-3.18,.11,.16,.09,palette.ivory);
  block(room,-3.49,1.98,-3.29,1.68,.85,.06,palette.oak);
  block(room,-3.49,1.98,-3.245,1.60,.77,.025,palette.ivory);
  if(mats.art)mesh(room,new T.PlaneGeometry(1.49,.665),mats.art,-3.49,1.98,-3.225);
  const lamp=group(room,-5.9,.25,-2.26);block(lamp,0,.025,0,.4,.05,.4,palette.brass,.02);
  mesh(lamp,new T.CylinderGeometry(.019,.019,1.35,12),palette.brass,0,.72,0);
  mesh(lamp,new T.CylinderGeometry(.19,.29,.38,32),palette.ivory,0,1.44,0);
  const bounce=new T.SpotLight('#ffe4be',14,9,1.2,.9,2);
  bounce.position.set(-2,2.46,.3);bounce.target.position.set(-3.3,.72,-2.25);room.add(bounce,bounce.target);
  const daylight=new T.SpotLight('#f3f7ff',25,9,1.13,.86,2);daylight.target.position.set(-3.62,.90,-2.2);room.add(daylight.target);daylight.castShadow=true;daylight.shadow.mapSize.set(512,512);daylight.shadow.bias=-.001;daylight.shadow.normalBias=.014;daylight.position.set(-5.45,2.14,1.55);room.add(daylight);
  return{room,fireMaterial,cushions};
}

export function homecoming(mats){
  weave=mats.fabric??null;
  for(const textile of [palette.linen,palette.teal]){textile.map=weave;textile.bumpMap=weave;textile.bumpScale=.006;}
  const root=new T.Group(),{room,fireMaterial,cushions}=livingRoom(root,mats);
  const family=[
    {size:1.04,shirt:'#506f73',pants:'#39444b',skin:'#b88868',hair:'#483927'},
    {size:.64,shirt:'#c47942',pants:'#495568',skin:'#c28f71',hair:'#523c2f'},
    {size:.72,shirt:'#768450',pants:'#334750',skin:'#c49a76',hair:'#654832',long:true},
    {size:.97,shirt:'#995647',pants:'#445559',skin:'#ca9977',hair:'#48392e',long:true}
  ].map((spec,i)=>person(root,spec,i));
  const foreman=person(root,{size:1.03,shirt:'#b97940',pants:'#354753',skin:'#ad805e',hair:'#514138',hat:true},4);
  const key=group(root);key.name='Front door keys';
  mesh(key,new T.TorusGeometry(.030,.004,8,22),palette.brass,0,0,0);
  for(const x of [-.012,.012]){block(key,x,-.049,0,.010,.053,.006,palette.brass);block(key,x+.006,-.068,0,.021,.011,.006,palette.brass);}
  const handPosition=new T.Vector3(),otherHand=new T.Vector3();
  const welcome=[[-.13,4.46],[.54,4.77],[.87,5.16],[1.44,4.84]];
  const seats=[-4.31,-3.78,-3.28,-2.71];
  function arrivalSurface(x,z){
    if(z<=3.20)return .248;
    for(let i=2;i>=0;i--){
      const stepZ=3.55-i*.25,halfWidth=(1.9-i*.13)*.65;
      if(Math.abs(z-stepZ)<=.325&&Math.abs(x+.975)<=halfWidth)return (.11+i*.08)*.9;
    }
    if(x>=-2.145&&x<=.195&&z<=6.75)return -.058;
    return x>=1.69?-.072:-.20;
  }
  const routes=family.map((f,i)=>{
    const [x,z]=welcome[i],greeting=i===0?-1.57:-2.3,scale=f.root.scale.y;
    const mark=vec(x,i===0?-.058:i===3?-.08:-.20,z);
    return [
      walkRoute([vec(x+.6,-.15,z+2.5),mark],scale,-2.91,greeting,arrivalSurface),
      walkRoute([mark,vec(-1.23,.171,3.55),vec(-1.23,.248,1.28),vec(-1.45,.248,-1.43),vec(seats[i],.248,-1.46)],scale,greeting,0,arrivalSurface)
    ];
  });
  // Match both open palms at the transfer pose before the shot begins.
  const hostMark=new T.Vector3(-1.38,-.058,4.44);
  foreman.root.position.copy(hostMark);foreman.root.rotation.y=1.55;foreman.pose(0,0,1,-.13);
  family[0].root.position.set(welcome[0][0],-.058,welcome[0][1]);family[0].root.rotation.y=-1.57;family[0].pose(0,0,1);
  foreman.arms[1].hand.getWorldPosition(handPosition);family[0].arms[1].hand.getWorldPosition(otherHand);
  const meetingOffset=otherHand.sub(handPosition);hostMark.x+=meetingOffset.x;hostMark.z+=meetingOffset.z;
  function update(s){
    root.visible=s>=.679;if(!root.visible)return;
    room.visible=s>.59;foreman.root.visible=s<.892;
    const handover=ease(s,.731,.762),withdraw=ease(s,.775,.809);
    foreman.root.position.copy(hostMark);foreman.root.rotation.y=1.55;
    foreman.pose(0,0,handover*(1-withdraw),-.13);
    const bootMarks=[-1,1].map(side=>{
      const point=root.worldToLocal(foreman.root.localToWorld(vec(side*.104,0,side*.048)));
      point.y=-.058;return {point,yaw:1.55+side*.10,roll:0};
    });
    plantFeet(foreman,bootMarks);
    family.forEach((f,i)=>{
      const arrive=ease(s,.678,.724),offset=i*.0105;
      const departure=.794+offset,arrival=.932+offset;
      const settle=ease(s,Math.max(.943+i*.005,arrival+.002),.973+i*.005);
      const compression=settle*f.root.scale.x*.15;
      cushions[i].scale.y=1-compression;cushions[i].position.y=.686-.09*compression;
      const leaving=s>=departure,route=routes[i][leaving?1:0];
      const distance=(leaving?ease(s,departure,arrival):arrive)*route.total;
      const {point,yaw}=route.sample(distance),marks=route.feet(distance),size=f.root.scale.y;
      const reunion=ease(s,.957+i*.0018,.990),glance=(i<2?.56:-.52)*reunion;
      const walking=ease(distance,0,route.step*.45)*(1-ease(distance,route.total-route.step*.65,route.total));
      const footLead=marks[1].point.clone().sub(marks[0].point).dot(vec(Math.sin(yaw),0,Math.cos(yaw)));
      const stride=T.MathUtils.clamp(footLead/(.49*size),-1,1)*walking;
      const child=i===1||i===2;
      f.root.position.copy(point);f.root.position.z=T.MathUtils.lerp(point.z,child?-1.94:-2.10,settle);
      f.root.position.x+=(i===2?.085:i===1?-.025:0)*reunion;
      f.root.position.y+=settle*(.87-.48*size-.248)-.18*compression;
      f.root.rotation.y=yaw+[.15,.11,-.12,-.19][i]*reunion;
      f.pose(stride,settle,i===0?handover*(1-withdraw):0,glance);
      const watching=ease(s,.718+i*.003,.75+i*.003)*(1-ease(s,.777,.808));
      followWithEyesAndHead(f,foreman.arms[1].hand.getWorldPosition(vec()),watching*(i===0?.45:.81));
      f.face.morphTargetInfluences[0]=.13+.42*watching+.58*reunion;
      f.chest.rotation.z+=[-.075,-.043,.056,.063][i]*reunion;
      f.head.rotation.z+=[.035,-.08,.06,-.05][i]*reunion;
      for(const [leg,mark] of marks.entries()){
        mark.point.z+=settle*(child?-.17:-.13)+(leg?.039:-.018)*settle;
        if(child)mark.point.y+=settle*(.87-.248-.50*size);
        if(i===2)mark.point.x+=(leg?-.082:.095)*reunion;
        if(i===1&&leg===1){
          const kick=Math.sin(ease(s,.966,.996)*Math.PI);
          mark.point.z+=.11*kick;mark.point.y+=.042*kick;
        }
        mark.yaw+=reunion*(leg?.11:-.10);
      }
      let lap=ease(settle,.23,.95);
      if(i===1){
        function clap(start,end,count){
          if(s<=start||s>=end)return 0;
          const phase=(s-start)/(end-start);
          return Math.sin(Math.PI*phase)**.52*(.55+.45*Math.cos(phase*Math.PI*2*count));
        }
        const joy=clap(.744,.790,2)+clap(.965,.997,2);
        lap*=1-Math.min(1,joy*1.5);
        f.arms.forEach(({shoulder,elbow,hand,fingers},j)=>{
          if(joy<=0)return;
          const side=j?1:-1,rest=hand.getWorldPosition(vec());
          const clapPoint=f.chest.localToWorld(vec(side*(.022+.045*(1-joy)),.30,.255));
          solve(shoulder,elbow,rest.lerp(clapPoint,Math.min(1,joy*1.18)),vec(side,-.65,0),elbow.position.length(),hand.position.length());
          hand.rotation.set(-.1,0,side*.14);fingers.morphTargetInfluences[0]=.27*(1-joy);
        });
        f.body.position.y+=joy*.045;
      }
      if(i===2){
        const crouch=ease(s,.759,.766)*(1-ease(s,.766,.771))+ease(s,.779,.782)*(1-ease(s,.782,.790));
        const hop=ease(s,.766,.773)*(1-ease(s,.773,.781));
        f.body.position.y-=.09*crouch;f.root.position.y+=.09*hop;marks.forEach(m=>m.point.y+=.09*hop);
        f.arms.forEach(({shoulder},j)=>shoulder.rotation.z+=(j?1:-1)*.48*hop);
      }
      plantFeet(f,marks,walking*(1-settle));
      if(lap>0)f.arms.forEach((arm,j)=>{
        const leg=f.legs[j],side=j?1:-1;
        const rest=leg.hip.getWorldPosition(vec()).lerp(leg.knee.getWorldPosition(vec()),j?.56:.68);
        rest.y+=.093*size;
        const wrist=arm.hand.getWorldPosition(vec()).lerp(rest,lap);
        solve(arm.shoulder,arm.elbow,wrist,vec(side*.48,-.85,-.32),arm.elbow.position.length(),arm.hand.position.length());
        turnPalm(f,arm,side,lap);
      });
    });
    for(const [parentIndex,childIndex,side] of [[0,1,1],[3,2,-1]]){
      const embrace=ease(s,.964,.992);
      if(embrace===0)continue;
      const parent=family[parentIndex],child=family[childIndex];
      const arm=parent.arms[side>0?1:0],nearShoulder=child.arms[side>0?0:1].shoulder;
      const palm=nearShoulder.getWorldPosition(vec());
      palm.add(vec(.015*side,.047,-.050));
      const wrist=arm.hand.getWorldPosition(vec()).lerp(palm,embrace);
      solve(arm.shoulder,arm.elbow,wrist,vec(side*.35,-.43,-.91),.26,.25);
      turnPalm(parent,arm,side,embrace);
      followWithEyesAndHead(parent,child.face.getWorldPosition(vec()),embrace*.7);
      if(childIndex===2){
        const leanIn=ease(s,.976,.999);
        followWithEyesAndHead(child,parent.face.getWorldPosition(vec()),leanIn*.87);
        const childArm=child.arms[1],target=arm.hand.localToWorld(vec(0,-.068,.008));
        const touch=childArm.hand.getWorldPosition(vec()).lerp(target,leanIn);
        solve(childArm.shoulder,childArm.elbow,touch,vec(.82,-.72,.24),childArm.elbow.position.length(),childArm.hand.position.length());
      }
    }
    const offer=handover*(1-withdraw);
    if(offer>0){
      const arm=foreman.arms[1],wrist=arm.hand.getWorldPosition(vec());
      const target=wrist.lerp(family[0].arms[1].hand.getWorldPosition(vec()),offer);
      const orientation=arm.hand.getWorldQuaternion(new T.Quaternion());
      solve(arm.shoulder,arm.elbow,target,vec(.65,-.8,0),arm.elbow.position.length(),arm.hand.position.length());
      arm.hand.quaternion.copy(arm.elbow.getWorldQuaternion(new T.Quaternion()).invert().multiply(orientation));
    }
    root.updateMatrixWorld(true);
    foreman.arms[1].hand.getWorldPosition(handPosition);family[0].arms[1].hand.getWorldPosition(otherHand);
    key.position.copy(handPosition).lerp(otherHand,ease(s,.753,.767));key.position.y-=.056;
    key.visible=s>=.699&&s<.875;
    fireMaterial.uniforms.time.value=s*80;
  }
  return{root,update,key,family,foreman};
}
