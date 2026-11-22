import { dressActor, fittedHand } from './anatomy.js';
import * as THREE from './vendor/three.module.js';
import { portrait,garment,limbRig } from './people.js';
import { ease, mix } from './story.js';
import { walkRoute } from './footsteps.js';
import { workerStance,vec } from './site-work.js';
import { RoundedBoxGeometry } from './vendor/addons/geometries/RoundedBoxGeometry.js';

// All actors are genuine articulated geometry. Timeline seeking is deterministic.
export function constructionSite(mats={}){
  const root=new THREE.Group();
  const mat=(color,roughness=.7,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
  const yellow=mat('#cda329',.47,.28),dark=mat('#252b2c',.86),rubber=mat('#1f2423',.95),steel=mat('#a3afb4',.23,.85),timber=mat('#b3956f',.95);
  const glass=new THREE.MeshPhysicalMaterial({color:'#7a9aa3',roughness:.13,metalness:.15,transparent:true,opacity:.4,depthWrite:false,reflectivity:.8});
  const orange=mat('#bb642f',.94),cloth=mat('#34464d',.98),stripe=mat('#c5cba7',.75),glove=mat('#a99172',.86);
  const eyeShield=new THREE.MeshPhysicalMaterial({color:'#dfebe7',roughness:.16,metalness:.08,transparent:true,opacity:.19,depthWrite:false});
  if(mats.enamel){yellow.map=mats.enamel;yellow.color.set('#e5cd93');yellow.roughness=.56;}
  if(mats.timber){timber.map=mats.timber.map;timber.color.set('#e0c39c');}
  const grease=mat('#3d403a',.7,.25);
  function mesh(parent,geometry,material,x=0,y=0,z=0){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
  function box(parent,x,y,z,w,h,d,material,r=.025){return mesh(parent,new RoundedBoxGeometry(w,h,d,2,Math.min(r,w*.22,h*.22,d*.22)),material,x,y,z);}
  function cylinder(parent,x,y,z,r1,r2,h,material,axis='y',segments=20){const m=mesh(parent,new THREE.CylinderGeometry(r1,r2,h,segments),material,x,y,z);if(axis==='z')m.rotation.x=Math.PI/2;return m;}
  function group(parent,x=0,y=0,z=0){const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);return g;}
  function oval(parent,x,y,z,a,b,c,material){const m=mesh(parent,new THREE.SphereGeometry(1,16,12),material,x,y,z);m.scale.set(a,b,c);return m;}
  function rod(parent,a,b,r,material){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),d=end.clone().sub(start);const m=cylinder(parent,0,0,0,r,r,d.length(),material);m.position.copy(start.add(end).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return m;}
  function hose(parent,points,r=.022){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));return mesh(parent,new THREE.TubeGeometry(curve,20,r,6,false),rubber);}
  function profile(parent,points,depth,material,z=0){const s=new THREE.Shape();points.forEach((p,i)=>i?s.lineTo(...p):s.moveTo(...p));s.closePath();const geo=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.018,bevelThickness:.018,curveSegments:12});return mesh(parent,geo,material,0,0,z-depth/2);}
  function bolt(parent,x,y,z,r=.05){const b=cylinder(parent,x,y,z,r,r,.04,steel,'z',6);return b;}
  // Earthmover: shaped boom plates, articulated bucket, running gear and hydraulic lines.
  const excavator=group(root,-9,-.32,4.1),tracks=group(excavator);
  for(const z of[-.7,.7]){
    const shape=new THREE.Shape();shape.moveTo(-.88,0);shape.absarc(.88,.28,.28,-Math.PI/2,Math.PI/2,false);shape.lineTo(-.88,.56);shape.absarc(-.88,.28,.28,Math.PI/2,Math.PI*1.5,false);
    const track=mesh(tracks,new THREE.ExtrudeGeometry(shape,{depth:.34,bevelEnabled:true,bevelSegments:2,bevelSize:.025,bevelThickness:.025}),rubber,0,0,z-.17);
    for(const x of[-.88,-.44,0,.44,.88]){cylinder(tracks,x,.29,z,.23,.23,.36,grease,'z');cylinder(tracks,x,.29,z+(z>0?.2:-.2),.11,.11,.03,steel,'z');}
    for(let i=0;i<36;i++){const a=i/36*Math.PI*2,x=Math.cos(a),y=Math.sin(a),xx=x*.9+Math.sign(x)*.18;const tread=box(tracks,xx,.28+y*.31,z,.13,.055,.42,dark,.008);tread.rotation.z=Math.atan2(-x*.3,y);}
  }
  cylinder(excavator,0,.67,0,.52,.6,.22,grease);
  const body=group(excavator,0,.82,0);box(body,-.52,.18,0,1.26,.57,1.31,yellow,.18);
  for(let i=0;i<7;i++)box(body,-1.16,.18+i*.035,0,.012,.014,.7,dark,.003);
  // Rounded counterweight, rear lights, access steps and cabin shell.
  box(body,-.46,.48,-.17,1.04,.30,.93,grease,.08);
  for(const xx of [-.95,.032])for(const zz of [-.595,.265])box(body,xx,.87,zz,.051,.83,.052,dark,.016);box(body,-.46,1.31,-.17,1.16,.09,1.04,yellow,.06);
  box(body,-.45,.84,.314,.91,.75,.012,glass,.005);box(body,-1.005,.84,-.17,.012,.75,.76,glass,.005);
  box(body,.085,.84,-.17,.014,.75,.76,glass,.005);box(body,-.45,.84,-.645,.91,.75,.014,glass,.005);
  box(body,-.46,.51,-.17,.43,.12,.4,cloth,.06);box(body,-.76,.74,-.17,.1,.5,.39,cloth,.04);
  for(const z of[-.55,.24])rod(body,[-.94,.43,z],[-.94,1.25,z],.025,steel);
  rod(body,[-.97,.86,.34],[-.97,1.05,.34],.025,steel);
  box(body,-.55,.13,.85,.52,.06,.35,steel);box(body,-.55,-.12,.88,.47,.05,.3,steel);
  cylinder(body,-.85,.65,-.38,.035,.035,.48,dark);cylinder(body,-.85,.92,-.38,.05,.05,.05,dark);
  const arm=group(body,.29,.32,0);
  profile(arm,[[-.1,-.14],[.15,-.19],[.72,-.06],[1.62,.45],[1.79,.64],[1.67,.8],[1.44,.65],[.63,.27],[.05,.15]],.24,yellow);
  bolt(arm,0,0,.15,.1);bolt(arm,1.66,.63,.15,.09);
  rod(arm,[.16,.13,.17],[1.08,.6,.17],.07,yellow);rod(arm,[.67,.4,.17],[1.5,.76,.17],.032,steel);
  hose(arm,[[.1,.23,-.16],[.7,.53,-.17],[1.43,.92,-.17],[1.77,.76,-.15]]);
  const forearm=group(arm,1.66,.63,0);
  profile(forearm,[[-.1,-.11],[.2,-.17],[1.4,-.07],[1.56,.03],[1.49,.2],[.18,.18],[-.1,.1]],.2,yellow);
  rod(forearm,[.14,.19,.15],[.9,.26,.15],.055,yellow);rod(forearm,[.68,.26,.15],[1.46,.15,.15],.028,steel);
  hose(forearm,[[0,.14,-.13],[.4,.34,-.14],[1.2,.34,-.13],[1.46,.13,-.12]],.018);
  const bucket=group(forearm,1.5,0,0);
  profile(bucket,[[-.16,.12],[.15,.13],[.3,-.15],[.57,-.42],[.41,-.49],[.02,-.48],[-.21,-.26]],.64,grease);
  for(let z=-.26;z<.27;z+=.13)profile(bucket,[[.43,-.4],[.75,-.43],[.57,-.54],[.42,-.5]],.06,steel,z);
  for(const z of[-.35,.35])bolt(bucket,.03,-.02,z,.075);

  const earth=mat('#8f7155',1);
  if(mats.concrete){earth.map=mats.concrete.map;earth.bumpMap=earth.map;earth.bumpScale=.025;}
  function dirtClump(parent,x,y,z,rx,ry,rz){
    const g=new THREE.IcosahedronGeometry(1,2),p=g.attributes.position;
    for(let i=0;i<p.count;i++){
      const a=p.getX(i),b=p.getY(i),c=p.getZ(i);
      const k=.89+.09*Math.sin(9*a+3*b)*Math.cos(8*c)+.08*Math.sin(c*12-b*7);
      p.setXYZ(i,a*k,b*k,c*k);
    }
    g.computeVertexNormals();const clump=mesh(parent,g,earth,x,y,z);clump.scale.set(rx,ry,rz);return clump;
  }
  const bucketSoil=dirtClump(bucket,.28,-.13,0,.34,.17,.31);
  const spoil=dirtClump(root,-6.82,-.25,2.96,.72,.23,.55);
  excavator.position.x=-8.5;excavator.rotation.y=-.28;body.rotation.y=.9;
  arm.rotation.z=.8;forearm.rotation.z=-1.2;bucket.rotation.z=.02;
  const dumpPoint=bucketSoil.getWorldPosition(new THREE.Vector3());
  spoil.position.x=dumpPoint.x;spoil.position.z=dumpPoint.z;
  // Road crane: rubber tyres, hubs, cab, outrigger feet, telescopic sections and hook block.
  const crane=group(root,10.5,-.3,4.2);box(crane,0,.65,0,5.8,.42,1.75,yellow,.09);
  function tyre(parent,x,z){cylinder(parent,x,.43,z,.43,.43,.28,rubber,'z');cylinder(parent,x,.43,z+Math.sign(z)*.15,.25,.25,.035,steel,'z');cylinder(parent,x,.43,z+Math.sign(z)*.18,.1,.1,.08,grease,'z');for(let i=0;i<20;i++){const a=i*Math.PI*2/20;const t=box(parent,x+Math.cos(a)*.42,.43+Math.sin(a)*.42,z,.1,.07,.31,dark,.008);t.rotation.z=a;}for(let i=0;i<8;i++){const a=i*Math.PI/4;bolt(parent,x+Math.cos(a)*.17,.43+Math.sin(a)*.17,z+Math.sign(z)*.19,.022);}}
  for(const x of[-2,-.6,2])for(const z of[-.92,.92])tyre(crane,x,z);
  const cab=group(crane,2.16,.92,0);
  box(cab,0,.14,0,1.22,.42,1.7,yellow,.06);box(cab,0,1.08,0,1.27,.09,1.76,yellow,.05);box(cab,-.55,.64,0,.09,.83,1.69,yellow,.03);
  for(const z of[-.8,.8]){box(cab,.52,.65,z,.055,.8,.055,dark,.015);box(cab,-.28,.65,z,.055,.8,.055,yellow,.015);}
  box(cab,.6,.64,0,.015,.7,1.5,glass,.004);
  box(cab,-.17,.37,0,.4,.13,.57,cloth,.05);box(cab,-.35,.62,0,.1,.46,.56,cloth,.05);rod(cab,[.17,.32,-.25],[.3,.68,-.25],.025,steel);const steering=mesh(cab,new THREE.TorusGeometry(.15,.018,8,20),dark,.31,.7,-.25);steering.rotation.y=Math.PI/2;
  for(const z of[-.773,.773]){box(cab,-.05,.64,z,.84,.65,.014,glass,.006);rod(cab,[.39,.74,z*1.15],[.6,.88,z*1.33],.025,dark);box(cab,.61,.87,z*1.34,.08,.23,.13,steel);box(cab,-.36,.18,z,.16,.035,.045,steel);}
  box(cab,.59,.1,0,.12,.1,1.7,steel);for(const z of[-.59,.59])box(cab,.59,.32,z,.02,.12,.2,stripe);
  for(const x of[-1.4,1.3])for(const z of[-1.3,1.3]){box(crane,x,.64,z,.19,.2,1.3,steel);cylinder(crane,x,.25,z*1.4,.065,.065,.7,steel);box(crane,x,-.05,z*1.4,.5,.09,.5,grease,.03);}
  const turret=group(crane,-.6,1,0);cylinder(turret,0,.18,0,.63,.68,.36,grease);box(turret,.25,.55,0,1.15,.65,1.13,yellow,.13);
  // Operator cab on the rotating upper carriage, separate from the driving cab.
  const upperCab=group(turret,-.15,.46,.82);
  box(upperCab,0,0,0,1.32,.36,.77,yellow,.08);box(upperCab,.02,1.02,0,1.24,.09,.81,yellow,.045);
  for(const x of [-.57,.56])for(const z of [-.34,.34])rod(upperCab,[x,.14,z],[x+.04,.99,z],.027,grease);
  for(const z of [-.344,.344])box(upperCab,0,.61,z,1.05,.71,.018,glass,.008);
  box(upperCab,-.57,.61,0,.012,.68,.62,glass);box(upperCab,.56,.61,0,.012,.68,.62,glass);
  box(upperCab,.12,.22,0,.4,.07,.39,cloth);box(upperCab,.3,.41,0,.07,.36,.39,cloth);
  oval(upperCab,.07,.42,0,.13,.20,.13,orange);portrait(upperCab,5,new THREE.Vector3(.06,.70,0),.83).rotation.y=-Math.PI/2;
  for(let i=0;i<8;i++)box(turret,.6,.33+i*.042,-.58,.50,.017,.029,grease,.005);
  for(const x of [-1.91,-.56,1.97])for(const z of [-.91,.91])box(crane,x,.94,z,1.12,.095,.42,dark,.04);
  for(const z of [-.915,.915]){box(crane,-.85,.54,z,2.66,.17,.075,grease);for(let i=0;i<5;i++)box(crane,-1.94+i*.3,.57,z*1.05,.16,.067,.023,stripe,.008);}
  const boom=group(turret,0,.75,0);box(boom,-2.1,0,0,4.2,.37,.46,yellow,.04);box(boom,-4.95,0,0,2.1,.285,.32,steel,.025);box(boom,-6.4,0,0,1.3,.2,.23,yellow,.02);
  rod(boom,[-.3,-.35,.3],[-3.3,-.35,.3],.08,yellow);rod(boom,[-2.2,-.35,.3],[-4.2,-.35,.3],.038,steel);
  hose(boom,[[-.1,.28,-.3],[-1,.48,-.3],[-3,.28,-.3],[-4.3,.22,-.24]],.022);
  for(let i=0;i<4;i++)cylinder(boom,-7.05,.02,-.14+i*.09,.17,.17,.06,dark,'z');
  const tip=group(boom,-7.1,0,0),cable=cylinder(root,0,0,0,.014,.014,1,steel),hook=group(root);
  box(hook,0,0,0,.23,.28,.19,yellow,.04);const hookCurve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,-.12,0),new THREE.Vector3(-.04,-.32,0),new THREE.Vector3(.06,-.39,0),new THREE.Vector3(.13,-.3,0)]);mesh(hook,new THREE.TubeGeometry(hookCurve,16,.028,8,false),steel);
  const load=group(root);
  function chord(parent,from,to,width,depth,material){
    const v=new THREE.Vector3().fromArray(from),w=new THREE.Vector3().fromArray(to);
    const axis=w.clone().sub(v),center=v.add(w).multiplyScalar(.5);
    const member=box(parent,center.x,center.y,center.z,axis.length(),width,depth,material,.005);
    member.quaternion.setFromUnitVectors(new THREE.Vector3(1,0,0),axis.normalize());
    return member;
  }
  const span=2.84,heel=2.72,landingZ=1.05,deckZ=landingZ+.61;
  const ridge=[0,.72,0],left=[-span,0,0],right=[span,0,0];
  chord(load,left,right,.16,.14,timber);
  chord(load,left,ridge,.13,.14,timber);chord(load,ridge,right,.13,.14,timber);
  for(const sign of [-1,1]){
    chord(load,[sign*1.4,.36,0],[sign*.72,0,0],.085,.095,timber);
    chord(load,[sign*.72,0,0],ridge,.085,.095,timber);
    for(const [x,y] of [[heel,0],[1.4,.34],[.72,.03]]){
      const plate=box(load,sign*x,y,.077,.19,.105,.012,steel,.004);
      for(const dx of [-.055,.055])bolt(load,plate.position.x+dx,y,.086,.012);
    }
  }
  const slings=group(root),strap=mat('#92733a',.85);
  const master=mesh(slings,new THREE.TorusGeometry(.088,.017,8,24),steel);master.name='Master link';
  const vectors=new THREE.Vector3(),vertical=new THREE.Vector3(0,1,0);
  const legsOfSling=[-1,1].map(sign=>({sign,segments:Array.from({length:10},()=>box(slings,0,0,0,.041,1,.018,strap,.004)),loop:mesh(slings,new THREE.TorusGeometry(.08,.013,8,20),steel)}));
  function setSegment(segment,a,b){
    vectors.subVectors(b,a);segment.scale.y=vectors.length();segment.position.copy(a).add(b).multiplyScalar(.5);
    segment.quaternion.setFromUnitVectors(vertical,vectors.normalize());
  }
  const rigPoints=Array.from({length:11},()=>new THREE.Vector3());
  function drawBridle(top,loose,unclip){
    master.position.copy(top);
    for(const {sign,segments,loop} of legsOfSling){
      const attachX=load.position.x+sign*heel,attachY=load.position.y+.10;
      const endX=mix(attachX,top.x+sign*.26,unclip),endY=mix(attachY,top.y-3.15,unclip);
      const endZ=mix(load.position.z+.10,top.z+.35,unclip);
      loop.position.set(endX,endY,endZ);
      for(let j=0;j<=10;j++){
        const u=j/10,sag=Math.sin(Math.PI*u)*loose;
        rigPoints[j].set(mix(endX,top.x,u),mix(endY,top.y-.06,u)-.64*sag,mix(endZ,top.z,u)+.14*sag);
        if(j)setSegment(segments[j-1],rigPoints[j-1],rigPoints[j]);
      }
    }
  }
  // Anatomical workers: articulated elbows/knees, shaped clothing, hands and PPE.
  const bootLeather=mat('#625448',.88),laces=mat('#918674',.93);
  function workBoot(ankle){
    const vertices=[],indices=[],sides=16;
    // Cross sections from the heel counter through the instep to the toe cap.
    const sections=[[-.092,.045,.094],[-.074,.057,.123],[-.024,.061,.133],[.032,.062,.097],[.084,.064,.048],[.123,.065,.028],[.153,.047,.013],[.162,.016,-.008]];
    for(const [j,[z,w,top]] of sections.entries())for(let k=0;k<sides;k++){
      const a=k/sides*Math.PI*2,s=Math.sin(a);
      vertices.push(Math.cos(a)*w,-.063+(top+.063)*Math.max(0,s),z);
      if(j<sections.length-1){const n=j*sides+k,next=j*sides+(k+1)%sides;indices.push(n,next,n+sides,next,next+sides,n+sides);}
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();mesh(ankle,geo,bootLeather);
    oval(ankle,0,.014,-.070,.055,.083,.031,bootLeather);
    oval(ankle,0,-.034,.119,.062,.036,.045,bootLeather);
    box(ankle,0,-.070,.029,.128,.027,.249,dark,.018);
    for(let k=0;k<4;k++){
      const y=.082-k*.014,z=.026+k*.016;
      rod(ankle,[-.033,y,z],[.033,y-.01,z+.017],.0032,laces);
      rod(ankle,[.033,y,z],[-.033,y-.01,z+.017],.0032,laces);
    }
  }
  function worker(carrying=false,index=0,parent=root){
    const g=group(parent);
    const hips=group(g,0,.93,0);
    const chest=group(hips,0,.115,0),head=group(chest,0,.451,-.002);
    portrait(head,5+index,new THREE.Vector3(0,.105,.012),1);
    const shell=mat(['#dfd7bd','#c18c43','#d2cfc2'][index],.56,.04);
    const helmet=mesh(head,new THREE.SphereGeometry(.104,32,14,0,Math.PI*2,0,Math.PI/2),shell,0,.196,0);helmet.scale.set(1,.80,1.12);
    oval(head,0,.194,.020,.114,.009,.143,shell);
    for(const x of [-.041,.041])oval(head,x,.25,-.002,.008,.030,.077,shell);
    // Suspension band and recesses under the brim give the shell an actual lip.
    oval(head,0,.186,-.012,.099,.008,.105,rubber);
    for(const side of [-1,1])for(let j=0;j<3;j++)
      oval(head,side*(.094-j*.002),.219+j*.004,-.027+j*.024,.004,.0035,.008,rubber);
    for(const s of [-1,1]){
      const lens=oval(head,s*.034,.118,.107,.032,.019,.007,eyeShield);
      lens.rotation.y=s*.27;lens.castShadow=false;
      hose(head,[[s*.010,.130,.111],[s*.043,.136,.104],[s*.065,.126,.083],[s*.075,.126,.013]],.0025);
    }
    rod(head,[-.009,.127,.109],[.009,.127,.109],.003,rubber);
    oval(hips,0,.088,0,.174,.026,.121,dark);
    box(hips,0,.088,.123,.057,.032,.013,steel,.004);
    box(hips,-.151,.052,.046,.081,.107,.057,glove,.014);
    const trousers=garment(4+index,'leg',['#4b514b','#4c5860','#60554a'][index]);
    const liner=garment(4+index,'liner',['#42585b','#5b544b','#39464d'][index]);

    const legs=[],arms=[];
    for(const side of[-1,1]){
      const {upper:thigh,lower:knee}=limbRig(g,new THREE.Vector3(side*.108,.94,0),.43);
      const ankle=group(knee,0,-.41,0);workBoot(ankle);legs.push({thigh,knee,ankle});
      const {upper:shoulder,lower:elbow}=limbRig(chest,new THREE.Vector3(side*.201,.360,0),.285);
      const hand=group(elbow,0,-.29,0),fingers=fittedHand(hand,side,glove,true);
      arms.push({shoulder,elbow,hand,fingers});
    }
    
    const complexion=mat(['#935e45','#bf9282','#c59881'][index],.79);
    dressActor(g,chest,legs,arms,{identity:4+index,arm:liner,leg:trousers,liner,skin:complexion,pelvis:hips});
    return{g,hips,chest,head,legs,arms,carrying};
  }
  const workers=[worker(false,1),worker(false,2)];
  const materials=group(root,-8,-.18,7.1);for(let y=0;y<7;y++)for(let z=0;z<5;z++)box(materials,0,.1525+y*.065,z*.19,2.3,.065,.14,timber,.003);for(const x of[-1,1])box(materials,x,.06,.4,.12,.12,1.2,dark,.005);
  for(let i=0;i<4;i++){const cone=group(root,8+i*.7,-.2,7);box(cone,0,.025,0,.3,.05,.3,dark,.02);cylinder(cone,0,.23,0,.024,.115,.38,orange);cylinder(cone,0,.25,0,.062,.076,.07,stripe);}

  const installed=new THREE.Group();
  installed.name='Installed structural members';
  installed.add(load);
  load.name='Garage roof truss';
  const cribbing=group(root,6.9,-.17,6.8);
  for(const x of [-1.94,1.94])box(cribbing,x,.065,0,.28,.13,.74,timber);
  const platforms=group(root,0,0,landingZ-.51);
  const supportXs=[2.30,7.74];
  for(const x of supportXs){
    box(platforms,x,1.65,.9,.82,.09,2.1,timber);
    for(const dx of [-.38,.38])for(const dz of [-.94,.94])rod(platforms,[x+dx,-.2,.9+dz],[x+dx,2.5,.9+dz],.028,steel);
    rod(platforms,[x-.38,1.62,-.04],[x+.38,0,1.84],.022,steel);
    rod(platforms,[x-.38,2.45,1.84],[x+.38,2.45,1.84],.024,steel);
  }
  const rigger=worker(false,2);rigger.g.name='Signal person';
  const signalRoute=walkRoute([vec(7.117,-.18,7.20),vec(8.297,-.18,8.14)],1,Math.PI,Math.PI-.48,undefined,Math.PI-.24);
  const drills=workers.map(w=>{
    const tool=group(w.g);tool.name='Impact driver';
    box(tool,0,0,.06,.09,.11,.22,yellow);box(tool,0,-.065,0,.06,.12,.06,dark);
    rod(tool,[0,0,.16],[0,0,.27],.015,steel);return tool;
  });
  const boltHeads=supportXs.map(x=>bolt(installed,x,2.86,landingZ+.10,.038));
  const braces=supportXs.map((x,i)=>{
    const anchor=group(installed,x,2.77,landingZ);
    chord(anchor,[0,0,0],[0,-.41,-.89],.066,.085,timber);
    anchor.name='Temporary diagonal brace '+i;return anchor;
  });
  function grip(arm,dy,dz,weight=1){
    const l1=.285,l2=.29;
    const d2=THREE.MathUtils.clamp(dy*dy+dz*dz,(l1-l2)**2,(l1+l2)**2);
    const bend=-Math.acos(THREE.MathUtils.clamp((d2-l1*l1-l2*l2)/(2*l1*l2),-1,1));
    const pitch=Math.atan2(-dz,-dy)-Math.atan2(l2*Math.sin(bend),l1+l2*Math.cos(bend));
    arm.shoulder.rotation.x=mix(-.13,pitch,weight);arm.elbow.rotation.x=mix(-.21,bend,weight);
    arm.fingers.morphTargetInfluences[0]=.29+.62*weight;
  }
  const tipWorld=new THREE.Vector3();
  function update(p){
    root.visible=p>.155&&p<.925;
    const t=THREE.MathUtils.clamp((p-.50)/.30,0,1);
    const taut=ease(t,.18,.29),lift=ease(t,.30,.52),slew=ease(t,.43,.64);
    const land=ease(t,.63,.73),slack=ease(t,.838,.876),release=ease(t,.904,.998);
    const sway=Math.sin(slew*Math.PI*2)*.068*(1-land);
    load.visible=p>=.494;cribbing.visible=p>=.494&&p<.845;
    load.position.set(mix(6.90,5.02,slew)+sway,.04+4.10*lift-1.28*land,mix(6.8,landingZ,slew));
    load.rotation.z=.014*Math.sin(slew*Math.PI*2)*(1-land);
    braces.forEach((brace,i)=>{
      const swing=ease(t,.732+i*.01,.789+i*.012);
      brace.visible=t>.73&&p<.864;brace.rotation.x=(1-swing)*1.03;
    });
    boltHeads.forEach((bolt,i)=>{
      const drive=ease(t,.79+i*.008,.827+i*.008);
      bolt.visible=drive>0;bolt.position.z=landingZ+.10+.02*(1-drive);bolt.rotation.y=6.28*drive;
    });
    if(!root.visible)return;
    const entry=ease(p,.155,.19),exit=ease(p,.23,.275);
    excavator.visible=p<.275;excavator.position.x=-8.5-(1-entry)*5-exit*5;excavator.rotation.y=-.28;
    const scoop=ease(p,.182,.202),dump=ease(p,.208,.229);
    body.rotation.y=.9*dump;arm.rotation.z=.27+.53*scoop;forearm.rotation.z=-1.8+.6*scoop;bucket.rotation.z=.22+.9*scoop-1.1*dump;
    bucketSoil.visible=p>.191&&p<.222;
    spoil.visible=p>=.218;spoil.scale.y=.28*ease(p,.218,.229);
    crane.visible=p>=.5&&p<.85;
    crane.position.x=10.5+ease(p,.798,.85)*9;
    // Aim the boom above the actual sling apex; a vertical winch line does the lifting.
    const pivotX=crane.position.x-.6,pivotZ=crane.position.z;
    const dx=pivotX-load.position.x,dz=load.position.z-pivotZ;
    const reach=Math.hypot(dx,dz),high=7.5;
    turret.rotation.y=Math.atan2(dz,dx);
    boom.rotation.z=-Math.atan2(high-1.45,reach);
    boom.scale.x=Math.hypot(high-1.45,reach)/7.1;
    tip.getWorldPosition(tipWorld);
    const ringY=load.position.y+1.22+.96*taut-.23*slack+2.20*release;
    const hookY=ringY+.35+.37*(1-ease(t,0,.082));
    const rope=tipWorld.y-hookY;cable.visible=hook.visible=slings.visible=crane.visible;
    cable.position.copy(tipWorld);cable.position.y-=rope/2;cable.scale.y=rope;
    hook.position.set(tipWorld.x,hookY,tipWorld.z);
    drawBridle(new THREE.Vector3(load.position.x+(tipWorld.x-load.position.x)*release,ringY,load.position.z),
      1-taut+slack*(1-release),ease(t,.897,.99));
    const away=ease(t,.083,.177),signal=ease(t,.166,.199)*(1-ease(t,.29,.36));
    rigger.g.visible=crane.visible;rigger.g.position.set(7.117+1.18*away,-.18,7.20+.94*away);
    rigger.g.rotation.y=Math.PI-.48*away;rigger.head.rotation.y=-.54*away;rigger.head.rotation.x=.17*(1-away)-.24*lift;rigger.hips.rotation.x=.16*(1-away);
    workerStance(rigger,{footMarks:signalRoute.feet(away*signalRoute.total)});
    for(const arm of rigger.arms)grip(arm,.01,.40,1-away);
    rigger.arms[1].shoulder.rotation.x-=2.51*signal;
    rigger.arms[1].elbow.rotation.x-=.21*signal;
    materials.visible=p<.84;platforms.visible=p>=.494&&p<.805;
    workers.forEach((w,i)=>{
      w.g.visible=platforms.visible;w.g.position.set(supportXs[i]+.217,1.7,deckZ);w.g.rotation.y=Math.PI;
      const action=ease(t,.744+i*.006,.784+i*.006)*(1-ease(t,.844,.87));
      const stow=ease(t,.837,.87);
      const tool=drills[i],depth=mix(.07,.24,action)*(1-stow),height=mix(mix(1.00,1.16,action),.95,stow);
      tool.position.set(.217,height,depth);tool.rotation.x=.98*stow;
      w.hips.rotation.x=.08*action;
      const unlatch=ease(t,.852,.879)*(1-ease(t,.896,.921));
      grip(w.arms[1],mix(height-.045-1.405,-.145,unlatch),mix(depth,.51,unlatch));
      w.head.rotation.x=-.30*(lift-land)+.24*action+.15*unlatch;
      w.head.rotation.y=(i?1:-1)*(.33*(1-land)+.16*action);
      const guide=ease(t,.637,.691)*(1-ease(t,.73,.76));
      const unhook=ease(t,.854,.885)*(1-ease(t,.903,.932));
      grip(w.arms[0],-.18,.49,Math.max(guide,unhook,action*.55));
      w.g.rotation.z=(i?-1:1)*.018*guide;
    });
  }
  return{root,installed,excavator,update,createWorker:(parent,index=0)=>worker(false,index,parent)};
}
