import * as T from './vendor/three.module.js';
import { RoundedBoxGeometry } from './vendor/addons/geometries/RoundedBoxGeometry.js';
import { ease } from './story.js';

export const vec=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
export const finish=(color,roughness=.78,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
export function group(parent,x=0,y=0,z=0){
  const g=new T.Group();g.position.set(x,y,z);parent.add(g);return g;
}
export function mesh(parent,geometry,mat,x=0,y=0,z=0){
  const m=new T.Mesh(geometry,mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;
}
export function block(parent,mat,x,y,z,w,h,d,r=0){
  return mesh(parent,r?new RoundedBoxGeometry(w,h,d,2,Math.min(r,w/3,h/3,d/3)):new T.BoxGeometry(w,h,d),mat,x,y,z);
}
const up=vec(0,1,0),down=vec(0,-1,0);
let soleShade;
function contactPatches(actor){
  if(!soleShade){
    const size=40,pixels=new Uint8Array(size*size*4);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const d=Math.hypot(2*(x+.5)/size-1,2*(y+.5)/size-1),i=(y*size+x)*4;
      pixels[i]=pixels[i+1]=pixels[i+2]=36;pixels[i+3]=Math.round(99*Math.max(0,1-d*d)**2);
    }
    const map=new T.DataTexture(pixels,size,size);map.magFilter=map.minFilter=T.LinearFilter;map.needsUpdate=true;
    soleShade=new T.MeshBasicMaterial({map,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});
  }
  return actor.legs.map(()=>{
    const shade=new T.Mesh(new T.PlaneGeometry(.24,.36),soleShade);shade.rotation.x=-Math.PI/2;shade.renderOrder=2;actor.g.add(shade);return shade;
  });
}
export function span(part,a,b){
  const delta=vec().subVectors(b,a);
  part.position.copy(a).addScaledVector(delta,.5);
  part.scale.y=Math.max(.00001,delta.length());
  part.quaternion.setFromUnitVectors(up,delta.normalize());
}
export function rod(parent,mat,a,b,r,segments=14){
  const m=mesh(parent,new T.CylinderGeometry(r,r,1,segments),mat);span(m,a,b);return m;
}
export function tubing(parent,mat,points,r,segments=32){
  const curve=new T.CatmullRomCurve3(points);return mesh(parent,new T.TubeGeometry(curve,segments,r,10,false),mat);
}

// Solve both bones in the shoulder (or hip) socket's local coordinates.
// A pole selects the anatomical side of the bend, including at full extension.
export function solve(upper,lower,target,pole,l1,l2){
  const aim=upper.parent.worldToLocal(target.clone()),length=aim.length();
  aim.multiplyScalar(1/Math.max(.0001,length));
  const distance=T.MathUtils.clamp(length,Math.abs(l1-l2)+.001,l1+l2-.001);
  const along=(l1*l1-l2*l2+distance*distance)/(2*distance);
  pole.addScaledVector(aim,-pole.dot(aim)).normalize();
  const bend=aim.clone().multiplyScalar(along).addScaledVector(pole,Math.sqrt(Math.max(0,l1*l1-along*along)));
  const lowerDir=aim.clone().multiplyScalar(distance).sub(bend).normalize();
  upper.quaternion.setFromUnitVectors(down,bend.normalize());
  lower.quaternion.setFromUnitVectors(down,lowerDir.applyQuaternion(upper.quaternion.clone().invert()));
}

// Use an actual deformed glove vertex between the thumb and index finger.
// Solving to the wrist alone leaves the visible leather centimetres off a tool.
export function gloveContact(arm,world=false){
  const glove=arm.fingers,p=vec();
  if(arm.padVertex===undefined){
    const side=Math.sign(arm.shoulder.parent.position.x),pad=vec(-side*.017,-.09,.025);
    const curl=glove.morphTargetInfluences[0];glove.morphTargetInfluences[0]=.93;
    let closest=Infinity;
    for(let i=0;i<glove.geometry.attributes.position.count;i++){
      const d=glove.getVertexPosition(i,p).distanceToSquared(pad);
      if(d<closest){closest=d;arm.padVertex=i;}
    }
    glove.morphTargetInfluences[0]=curl;
  }
  glove.getVertexPosition(arm.padVertex,p);
  return world?glove.localToWorld(p):p;
}

// Place the pelvis over the two actual ankle targets. A planted leg can
// extend at mid-stance without making the leading or trailing boot slide.
export function workerStance(actor,{drop=0,travel=0,walking=0,stepAxis=vec(1,0,0),footMarks,kneeWidth=.10,stepOver,weightShift=0}){
  const {g,hips,legs}=actor,area=g.parent;
  const stride=.90,targets=[];
  let hipHeight=Infinity,lowerSurface=Infinity;
  actor.contacts??=contactPatches(actor);
  for(const [i,leg] of legs.entries()){
    const sign=i?1:-1,mark=footMarks?.[i];
    const phase=travel/stride+i*.5,f=phase-Math.floor(phase),swing=ease(f,.5,1);
    const ground=mark?mark.point.clone():area.worldToLocal(g.localToWorld(vec(sign*.127,0,sign*.062)));
    if(!mark)ground.addScaledVector(stepAxis,(swing-f+.25)*stride*walking);
    const support=stepOver?stepOver(ground):0;
    lowerSurface=Math.min(lowerSurface,support);
    const lift=mark?0:.058*Math.sin(Math.PI*swing)*walking;
    ground.y+=support+lift+.087;
    const ankle=g.worldToLocal(area.localToWorld(ground));
    const hipX=sign*.108+weightShift;
    const maxReach=leg.knee.position.length()+leg.ankle.position.length()-.006;
    const height=Math.sqrt(Math.max(0,maxReach**2-(ankle.x-hipX)**2-ankle.z**2));
    hipHeight=Math.min(hipHeight,ankle.y+height);
    const roll=mark?mark.roll:.13*Math.sin(2*Math.PI*swing)*walking*stepAxis.dot(vec(Math.sin(g.rotation.y),0,Math.cos(g.rotation.y)));
    targets.push({ankle,hipX,roll,yaw:mark?mark.yaw-g.rotation.y:0,support,lift});
  }
  const workingHeight=.94-drop+Math.max(0,lowerSurface)*(1-ease(drop,.03,.22));
  hipHeight=T.MathUtils.lerp(hipHeight,Math.min(hipHeight,workingHeight),ease(drop,.02,.07));
  hips.position.set(weightShift,hipHeight-.01,0);
  for(const [i,leg] of legs.entries()){
    const {ankle,hipX,roll,yaw,support,lift}=targets[i];
    leg.thigh.parent.position.set(hipX,hipHeight,0);
    const spread=T.MathUtils.lerp(.12,kneeWidth,ease(drop,.045,.32));
    solve(leg.thigh,leg.knee,g.localToWorld(ankle.clone()),vec((i?1:-1)*spread,0,1),leg.knee.position.length(),leg.ankle.position.length());
    leg.ankle.quaternion.copy(leg.thigh.quaternion).multiply(leg.knee.quaternion).invert()
      .multiply(new T.Quaternion().setFromEuler(new T.Euler(roll,yaw,0,'YXZ')));
    const shadow=actor.contacts[i];shadow.position.set(ankle.x,.006+support,ankle.z+.033);
    shadow.scale.setScalar(1-Math.min(.22,lift*3));
  }
}

// Targets and foot marks are in the work area's coordinates, in metres.
export function poseWorker(actor,{x,y=0,z,yaw=Math.PI,drop=0,lean=.04,travel=0,walking=0,stepAxis,footMarks,left,right,look,contact=false,hold=1,kneeWidth,stepOver}){
  const {g,hips,arms,head}=actor,area=g.parent;
  const loadCentre=left.clone().lerp(right,.5);
  const workOffset=loadCentre.clone().sub(vec(x,y,z)).applyAxisAngle(up,-yaw);
  const weightShift=T.MathUtils.clamp(workOffset.x*.075,-.038,.038);
  g.position.set(x,y,z);g.rotation.y=yaw;
  workerStance(actor,{drop,travel,walking,stepAxis,footMarks,kneeWidth,stepOver,weightShift});
  const twist=T.MathUtils.clamp(workOffset.x*.28,-.19,.19);
  hips.rotation.set(lean*.45,twist*.25,-weightShift*.55);
  actor.chest.rotation.set(lean*.56,twist*.75,weightShift*.26);
  head.rotation.set(.12,0,0);
  g.updateWorldMatrix(true,true);
  for(const [i,target] of [left,right].entries()){
    const arm=arms[i],sign=i?1:-1;
    const wrist=area.localToWorld(target.clone());
    const reach=hips.worldToLocal(wrist.clone());
    const raised=ease(reach.y,.42,.82),extension=ease(reach.z,.10,.54);
    arm.shoulder.parent.position.set(sign*(.201+.010*raised),.360+.037*raised,.038*extension);
    if(contact){
      const grasp=Array.isArray(hold)?hold[i]:hold;
      arm.fingers.morphTargetInfluences[0]=.26+.67*grasp;
      const rotation=g.getWorldQuaternion(new T.Quaternion()).multiply(new T.Quaternion().setFromEuler(
        new T.Euler(-.83-.31*raised,sign*.24,sign*.12,'YXZ')));
      wrist.sub(gloveContact(arm).applyQuaternion(rotation));
      solve(arm.shoulder,arm.elbow,wrist,vec(sign*.72,-.75,-.32),.285,.29);
      arm.hand.quaternion.copy(arm.elbow.getWorldQuaternion(new T.Quaternion()).invert().multiply(rotation));
      continue;
    }
    wrist.add(vec(0,.034,.008));
    solve(arm.shoulder,arm.elbow,wrist,vec(sign*.87,-.6,-.30),.285,.29);
    arm.hand.quaternion.copy(arm.shoulder.quaternion).multiply(arm.elbow.quaternion).invert();
    const height=target.y-y;
    arm.hand.rotateX(T.MathUtils.clamp(-.12-(height-.65)*.35,-.52,.12));
    arm.hand.rotateY(sign*(.28+.23*T.MathUtils.clamp(height,0,1.6)));
    arm.fingers.morphTargetInfluences[0]=T.MathUtils.clamp(.54+.23*(1-Math.abs(workOffset.z))+.1*drop,.48,.92);
  }
  if(look){
    const gaze=head.parent.worldToLocal(area.localToWorld(look.clone())).sub(head.position);
    head.rotation.y=T.MathUtils.clamp(Math.atan2(gaze.x,gaze.z),-.8,.8);
    head.rotation.x=T.MathUtils.clamp(-Math.atan2(gaze.y-.09,Math.hypot(gaze.x,gaze.z)),-.35,.55);
  }
}

