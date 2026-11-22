import * as T from './vendor/three.module.js';
import { solve, vec } from './site-work.js';
import { ease } from './story.js';

// Store shoe prints in room coordinates. Only the swinging foot leaves its
// print, even when the character slows at the threshold or turns at the sofa.
export function walkRoute(points,size,startYaw,endYaw,surface,facingYaw){
  const stops=[0],angles=[];
  for(let i=1;i<points.length;i++){
    const delta=points[i].clone().sub(points[i-1]);
    stops.push(stops.at(-1)+delta.length());angles.push(Math.atan2(delta.x,delta.z));
  }
  const total=stops.at(-1);
  const yawBetween=(a,b,t)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;
  function sample(distance){
    const d=T.MathUtils.clamp(distance,0,total);
    let i=0;while(i<angles.length-1&&d>stops[i+1])i++;
    const point=points[i].clone().lerp(points[i+1],(d-stops[i])/(stops[i+1]-stops[i]));
    const turn=Math.min(.32*size,(stops[i+1]-stops[i])*.36);
    let yaw=angles[i];
    if(d<stops[i]+turn)yaw=yawBetween(i?yawBetween(angles[i-1],yaw,.5):startYaw,yaw,ease(d,stops[i],stops[i]+turn));
    if(d>stops[i+1]-turn)yaw=yawBetween(yaw,i===angles.length-1?endYaw:yawBetween(yaw,angles[i+1],.5),ease(d,stops[i+1]-turn,stops[i+1]));
    if(Array.isArray(facingYaw))yaw=yawBetween(facingYaw[i],facingYaw[i+1],(d-stops[i])/(stops[i+1]-stops[i]));
    else if(facingYaw!==undefined)yaw=facingYaw;
    return {point,yaw};
  }
  function footprint(distance,side){
    const {point,yaw}=sample(distance);
    point.x+=Math.cos(yaw)*side*.104*size;point.z-=Math.sin(yaw)*side*.104*size;
    if(surface)point.y=surface(point.x,point.z);
    return {point,yaw};
  }
  // The first foot leaves a closed stance, and the last one closes it.
  // Half-length intervals at either end keep the trailing leg in reach.
  const count=Math.max(3,1+Math.ceil(total/(.49*size))),step=total/(count-1);
  const strikes=Array.from({length:count+1},(_,k)=>k===0?0:k===count?total:(k-.5)*step);
  const footprints=[-1,1].map((side,leg)=>{
    const marks=[{s:0,d:0}];
    for(let k=leg;k<count;k+=2){
      const end=strikes[k+1],landing=k>=count-2?total:(end+strikes[k+2])/2;
      marks.push({s:strikes[k],end,d:landing});
    }
    return marks.map(mark=>({...mark,...footprint(mark.d,side)}));
  });
  function feet(distance){
    return footprints.map(marks=>{
      let foot=marks[0],lift=0,roll=0;
      for(let i=1;i<marks.length;i++){
        const m=marks[i];if(distance<m.s)break;
        const doubleSupport=(m.end-m.s)*.10;
        const t=ease(distance,m.s+doubleSupport,m.end-doubleSupport),arc=Math.sin(Math.PI*t);
        foot={point:foot.point.clone().lerp(m.point,t),yaw:yawBetween(foot.yaw,m.yaw,t)};
        lift=.063*size*arc;roll=.17*Math.sin(t*Math.PI*2);if(t<1)break;
      }
      foot={point:foot.point.clone(),yaw:foot.yaw,roll};foot.point.y+=lift;
      return foot;
    });
  }
  return {sample,feet,strikes,step,total};
}

export function plantFeet(actor,marks,upright=0){
  const {root,legs}=actor,size=root.scale.y;
  const targets=marks.map(mark=>{
    const p=mark.point.clone();p.y+=.075*size;return root.parent.localToWorld(p);
  });
  let correction=Infinity;
  for(const [i,{hip,knee,ankle}] of legs.entries()){
    const delta=hip.getWorldPosition(vec()).sub(targets[i]);
    const reach=(knee.position.length()+ankle.position.length()-.006)*size;
    const available=Math.sqrt(Math.max(0,reach**2-delta.x**2-delta.z**2));
    correction=Math.min(correction,(available-delta.y)/size);
  }
  actor.body.position.y+=correction<0?correction:correction*upright;
  legs.forEach(({hip,knee,ankle},i)=>{
    const mark=marks[i];
    solve(hip,knee,targets[i],vec(i?.11:-.11,0,1),knee.position.length(),ankle.position.length());
    const shoe=new T.Quaternion().setFromEuler(new T.Euler(mark.roll,mark.yaw,0,'YXZ'));
    ankle.quaternion.copy(knee.getWorldQuaternion(new T.Quaternion()).invert().multiply(root.parent.getWorldQuaternion(new T.Quaternion())).multiply(shoe));
  });
}
