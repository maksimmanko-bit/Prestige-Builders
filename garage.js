import * as T from './vendor/three.module.js';
import { ease,between,mix } from './story.js';
import { vec,group,mesh,block,rod,tubing,finish,poseWorker } from './site-work.js';
import { walkRoute } from './footsteps.js';

const zinc=finish('#a4adac',.38,.69),steel=finish('#495453',.59,.52),gasket=finish('#323737',.86);
const radius=.28,turn=2.07,panelH=.535,width=4.12;
function rail(s,x=0){
  if(s<=turn)return vec(x,s,0);
  const angle=Math.min((s-turn)/radius,Math.PI/2);
  return vec(x,turn+Math.sin(angle)*radius,-radius*(1-Math.cos(angle))-Math.max(0,s-turn-radius*Math.PI/2));
}
function nextHinge(start){
  const a=rail(start);let lo=start+panelH,hi=lo+.20;
  for(let i=0;i<15;i++){const mid=(lo+hi)*.5;if(rail(mid).distanceTo(a)<panelH)lo=mid;else hi=mid;}
  return (lo+hi)*.5;
}
export function garageInstallation(parent,mats,createWorker){
  const root=group(parent,5.03,.207,3.065),crew=group(root),tracks=group(root);
  const daylight=new T.SpotLight('#fff2de',19,9,1.02,.94,2);
  daylight.position.set(-.85,2.27,-3.45);daylight.target.position.set(.32,.9,-.80);
  daylight.castShadow=true;daylight.shadow.mapSize.set(512,512);daylight.shadow.normalBias=.008;
  crew.add(daylight,daylight.target);
  const enamel=finish('#c9c7ba',.49,.18);
  if(mats.fleet){enamel.map=enamel.bumpMap=mats.fleet;enamel.bumpScale=.0014;}
  for(const sign of [-1,1]){
    const x=sign*(width/2+.035),points=[];
    for(let j=0;j<58;j++)points.push(rail(j*.09,x));
    tubing(tracks,zinc,points,.028,72);
    for(const y of [.26,.98,1.72,2.12])block(tracks,steel,x+sign*.035,y,.022,.108,.044,.086,.004);
    rod(tracks,zinc,vec(x,2.35,-1.49),vec(x,2.63,-1.49),.021);
  }
  rod(tracks,steel,vec(-2.18,2.37,.016),vec(2.18,2.37,.016),.027);
  for(const side of [-1,1]){
    const coil=[];
    for(let i=0;i<=178;i++){const phase=2*Math.PI*i/8;coil.push(vec(side*(.14+i*.003),2.37+.054*Math.sin(phase),.016+.054*Math.cos(phase)));}
    tubing(tracks,steel,coil,.008,175);
  }
  const panels=[],handles=[],rackTop=.62,slotSpacing=.51;
  const slot=i=>-1.27-i*slotSpacing;
  for(let n=0;n<4;n++){
    const panel=group(root);panel.name='Sectional door panel '+(n+1);
    // Rear skin faces the camera during installation. The cedar front remains
    // on the very same section when the camera goes back outside.
    if(n===3){
      block(panel,mats.wood,0,-.203,.018,width,.126,.052);
      block(panel,mats.wood,0,.174,.018,width,.182,.052);
      for(let b=0;b<4;b++){
        const x=-width/2+(b+.5)*width/4;
        for(const sign of [-1,1])block(panel,mats.wood,x+sign*.409,-.025,.018,.209,.226,.052);
        for(const h of [-.132,.085])block(panel,mats.trim,x,h,.012,.634,.018,.046);
        for(const s of [-1,1])block(panel,mats.trim,x+s*.309,-.024,.012,.018,.23,.046);
        block(panel,mats.glass,x,-.024,-.018,.587,.184,.012);
        block(panel,mats.glass,x,-.024,.040,.587,.184,.012);
      }
    }else{
      block(panel,mats.wood,0,0,.013,width,panelH-.009,.063,.009);
      block(panel,enamel,0,0,-.024,width-.019,panelH-.021,.021,.006);
      for(const h of [-.16,.14])block(panel,zinc,0,h,-.040,width-.04,.015,.022,.003);
      for(const x of [-1.37,0,1.37]){
        block(panel,enamel,x,0,-.039,.051,.437,.018,.008);
        for(const y of [-.163,.145])rod(panel,zinc,vec(x,y,-.050),vec(x,y,-.055),.013,6);
      }
    }
    block(panel,gasket,0,-panelH/2+.004,0,width,.015,.066,.004);
    for(const x of [-1.99,-.69,.69,1.99]){
      block(panel,zinc,x,.197,-.051,.068,.112,.012,.006);
      rod(panel,steel,vec(x-.038,.189,-.060),vec(x+.038,.189,-.060),.014,12);
    }
    for(const s of [-1,1]){
      rod(panel,zinc,vec(s*(width/2-.095),.21,-.026),vec(s*(width/2+.041),.21,-.026),.012,12);
      rod(panel,gasket,vec(s*(width/2+.022),.21,-.026),vec(s*(width/2+.052),.21,-.026),.036,16);
    }
    const handleY=[.135,.025,-.085,-.236][n];
    const ends=[-1,1].map(sign=>[0,1].map(j=>{
      // Two inward-facing steel grips near each stile. The crew can reach
      // the nearest section from the ends without entering the rack.
      const x=sign*(2.04-j*.021),y=handleY+j*.081,z=-.114;
      const inner=x-sign*.072,outer=x+sign*.026;
      rod(panel,zinc,vec(inner,y,-.043),vec(inner,y,z),.009);
      rod(panel,zinc,vec(outer,y+.024,-.032),vec(outer,y,z),.009);
      rod(panel,steel,vec(inner,y,z),vec(outer,y,z),.012);
      return vec(x,y,z-.012);
    }));
    handles.push(ends);panels.push(panel);
  }
  const trolley=group(crew),centreZ=(slot(0)+slot(3))/2;
  trolley.name='Padded section rack';
  for(const x of [-1.36,1.36])for(const z of [slot(0)+.13,slot(3)-.13]){
    rod(trolley,gasket,vec(x-.026,.077,z),vec(x+.026,.077,z),.077,20);
    block(trolley,zinc,x,.145,z,.095,.11,.083,.008);
  }
  const rackDepth=slot(0)-slot(3)+.32;
  for(const x of [-1.36,1.36])for(const z of [slot(0)+.13,slot(3)-.13])
    block(trolley,zinc,x,(.18+rackTop)/2-.025,z,.062,rackTop-.18,.062,.006);
  block(trolley,steel,0,rackTop-.048,centreZ,3.12,.076,rackDepth,.017);
  for(const x of [-1.34,1.34]){
    block(trolley,gasket,x,rackTop-.009,centreZ,.14,.018,rackDepth-.008,.004);
    for(let j=0;j<4;j++)for(const side of [-1,1]){
      const z=slot(j)+side*.087;
      block(trolley,zinc,x,rackTop+.039,z,.14,.096,.023,.005);
      block(trolley,gasket,x,rackTop+.047,z-side*.016,.14,.086,.016,.006);
    }
  }
  const pair=[createWorker(crew,1),createWorker(crew,2)];
  const routes=pair.map((_,side)=>panels.map((_,i)=>{
    const sign=side?1:-1,yaw=-sign*.93;
    const start=vec(sign*2.39,0,slot(i)-.34);
    const end=vec(sign*(2.39-.10*ease((i+.5)*panelH,1.32,1.70)),0,-.34);
    const next=vec(sign*2.39,0,(i===3?-.96:slot(i+1))-.34);
    return [walkRoute([start,end],1,yaw,yaw,undefined,yaw),walkRoute([end,next],1,yaw,yaw,undefined,yaw)];
  }));
  function update(stage,t){
    root.visible=stage>=11;if(!root.visible)return;
    crew.visible=stage===11;
    const cycle=stage===11?4*between(t,.015,.785):4;
    const active=Math.min(3,Math.floor(cycle)),local=cycle-active;
    const test=stage===11?ease(t,.79,.895)*(1-ease(t,.91,1)):0;
    let hinge=test*1.95;
    for(const [i,panel] of panels.entries()){
      const top=nextHinge(hinge),a=rail(hinge),b=rail(top);
      const rest=a.clone().lerp(b,.5),angle=Math.atan2(b.z-a.z,b.y-a.y);
      hinge=top;
      const u=T.MathUtils.clamp(cycle-i,0,1);
      const stockY=rackTop+panelH/2+.0035;
      const carryHeight=Math.max(1.02,1.04-handles[i][0][0].y);
      const high=Math.max(carryHeight,rest.y+.070);
      const raised=mix(stockY,carryHeight,ease(u,.115,.285));
      const overhead=mix(raised,high,ease(u,.39,.59));
      const fromRack=mix(slot(i),-.40,ease(u,.29,.59));
      panel.position.set(0,mix(overhead,rest.y,ease(u,.72,.81)),mix(fromRack,rest.z,ease(u,.60,.72)));
      panel.rotation.x=angle*ease(u,.72,.81);
    }
    if(crew.visible){
      const panel=panels[active];
      const take=ease(local,.015,.11),release=ease(local,.815,.885),hold=take*(1-release);
      for(const [i,w] of pair.entries()){
        const sign=i?1:-1;
        const back=ease(local,.86,1),next=active===3?-.96:slot(active+1);
        const z=mix(panel.position.z-.34,next-.34,back);
        const x=sign*(2.39-.10*ease(panel.position.y,1.32,1.70)*(1-back));
        const [carry,returnTrip]=routes[i][active];
        const marks=back>0?returnTrip.feet(back*returnTrip.total):carry.feet(between(panel.position.z,slot(active),0)*carry.total);
        const yaw=-sign*.93,grips=handles[active][i].map(p=>root.worldToLocal(panel.localToWorld(p.clone())));
        const idle=grips.map((_,j)=>vec(x-sign*.12,.79,z+(j?.13:-.13)*sign));
        const targets=idle.map((p,j)=>p.lerp(grips[j],hold));
        const level=(targets[0].y+targets[1].y)/2,squat=hold*T.MathUtils.clamp(.99-level,0,.60);
        const checkPartner=ease(local,.14+i*.025,.26+i*.025)*(1-ease(local,.40,.52));
        const watchTrack=ease(local,.43,.59)*(1-ease(local,.80,.87));
        const look=grips[1].clone().lerp(vec(-x,1.48-.66*squat,panel.position.z-.25),checkPartner)
          .lerp(vec(sign*2.09,Math.max(.65,panel.position.y+.18),-.025),watchTrack);
        poseWorker(w,{x,z,yaw,drop:squat,lean:.10+.72*squat,footMarks:marks,
          left:targets[0],right:targets[1],contact:true,hold,look});
      }
      root.userData.focus=panel.position.clone().add(root.position);
      root.userData.section=active;root.userData.phase=local;
    }
  }
  return {root,panels,pair,handles,trolley,rackTop,update};
}
