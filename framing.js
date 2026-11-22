import * as T from './vendor/three.module.js';
import { ease,between,mix } from './story.js';
import { vec,finish,group,block,rod,poseWorker } from './site-work.js';
import { walkRoute } from './footsteps.js';

const stud=.044,depth=.138,height=2.37;
const iron=finish('#454b47',.55,.60),safety=finish('#b9914a',.57,.18);
const rubber=finish('#323432',.89);
const clamp=T.MathUtils.clamp;

// Footprints belong to the deck while the timber and the carrier turn.
// Plan the approach from the same board centre, long edge and swivel used
// by the hand grips. Only a swinging boot turns towards the new heading.
function carrierRoute(member,next){
  function stance(p,move,clearance){
    const horizontal=p.w>p.l,angle=p.stockAngle*(1-move);
    const yaw=horizontal?Math.PI:Math.PI/2+angle;
    const edge=Math.min(p.w,p.l)*.5;
    const x=mix(p.stack.x,p.rest.x,move)+(horizontal?Math.sin(angle):-Math.cos(angle))*edge;
    const z=-mix(p.stack.y,p.rest.y,move)+(horizontal?Math.cos(angle):Math.sin(angle))*edge;
    return {point:vec(x-Math.sin(yaw)*clearance,0,z-Math.cos(yaw)*clearance),yaw};
  }
  const poses=[0,.5,1].map(t=>stance(member,t,.40)),start=poses[0],end=poses[2];
  const carry=walkRoute(poses.map(p=>p.point),1,start.yaw,end.yaw,undefined,poses.map(p=>p.yaw));
  if(!next)return {carry};
  const stock=stance(next,0,.40);
  const back=walkRoute([end.point,stock.point],1,end.yaw,stock.yaw,undefined,[end.yaw,stock.yaw]);
  return {carry,back};
}

function framePanel(root,mats,{x,y,z,yaw=0,width,openings=[],h=height,storey=0}){
  const area=group(root,x,y,z);area.rotation.y=yaw;
  const frame=group(area,0,.072,0),pieces=[];
  function timber(label,px,py,w,l){
    if(w<.012||l<.012)return;
    const board=block(frame,mats.timber,px,py,0,w,l,depth);
    board.name=label;
    const pos=board.geometry.attributes.position,normal=board.geometry.attributes.normal,uv=board.geometry.attributes.uv;
    for(let k=0;k<pos.count;k++){
      const along=w>l?pos.getX(k):pos.getY(k),cross=w>l?pos.getY(k):pos.getX(k);
      const across=Math.abs(normal.getZ(k))>.5?cross:pos.getZ(k);
      uv.setXY(k,along*1.32+pieces.length*.21,across*3.14+pieces.length*.19);
    }
    pieces.push({board,rest:board.position.clone(),w,l});
  }
  timber('Bottom plate',0,stud/2,width,stud);
  timber('Top plate',0,h-stud/2,width,stud);
  function standing(px){
    const opening=openings.find(o=>Math.abs(px-o.x)<o.w/2+.015);
    if(!opening){timber('Wall stud',px,h/2,stud,h-2*stud);return;}
    if(opening.sill>stud)timber('Cripple stud below window',px,(opening.sill+stud)/2,stud,opening.sill-stud);
    const top=opening.top+.14;
    timber('Cripple stud above header',px,(h-stud+top)/2,stud,h-stud-top);
  }
  const bays=Math.ceil((width-stud)/.51);
  for(let i=bays;i>=0;i--)standing(mix(-width/2+stud/2,width/2-stud/2,i/bays));
  for(const o of openings){
    for(const side of [-1,1]){
      timber('King stud',o.x+side*(o.w/2+1.5*stud),h/2,stud,h-2*stud);
      timber('Jack stud',o.x+side*(o.w/2+.5*stud),(o.top+stud)/2,stud,o.top-stud);
    }
    timber('Opening header',o.x,o.top+.068,o.w+2*stud,.136);
    if(o.sill>0)timber('Rough sill',o.x,o.sill-.023,o.w,stud);
  }
  const dunnage=group(area),rows=[];
  const tableHeight=.48;
  let distance=h+.56;
  for(const p of pieces){
    const length=Math.max(p.w,p.l),breadth=Math.min(p.w,p.l);
    let row=rows.at(-1);
    if(!row||row.length!==length||row.breadth!==breadth||row.boards.length===3){
      distance+=breadth/2+.046;row={length,breadth,boards:[],distance};rows.push(row);distance+=breadth/2;
      for(const sign of [-1,1])block(dunnage,mats.timber,sign*length*.29,tableHeight+.038,-row.distance,.082,.076,breadth+.038);
    }
    row.boards.push(p);
  }
  for(const row of rows)row.boards.forEach((p,i)=>{
    p.stack=vec(0,row.distance,tableHeight+.076+(row.boards.length-1-i)*depth);
    p.stockAngle=p.l>p.w?Math.PI/2:0;
  });
  const rackLength=Math.max(...rows.map(r=>r.length))*.72;
  const nearRow=rows[0],farRow=rows.at(-1);
  const nearEdge=nearRow.distance-nearRow.breadth/2-.12,farEdge=farRow.distance+farRow.breadth/2+.12;
  block(dunnage,mats.timber,0,tableHeight-.022,-(nearEdge+farEdge)/2,rackLength,.044,farEdge-nearEdge);
  for(const x of [-rackLength*.43,rackLength*.43])for(const z of [nearEdge+.06,farEdge-.06])
    block(dunnage,iron,x,(tableHeight-.044)/2,-z,.055,tableHeight-.044,.055);
  const fullStuds=pieces.filter(p=>p.l>h-.12).map(p=>p.rest.x);
  const grips=[-1,1].map(side=>fullStuds.reduce((a,b)=>Math.abs(a-side*width*.32)<Math.abs(b-side*width*.32)?a:b));
  const brace=group(area,width/2+.18,.022,-1.12);
  const run=Math.hypot(grips[1]-brace.position.x,1.12-depth/2);
  const braceLength=Math.hypot(run,1.60);
  brace.rotation.order='YXZ';brace.rotation.y=Math.atan2(grips[1]-brace.position.x,1.12-depth/2);
  block(brace,mats.timber,0,braceLength/2,0,.069,braceLength,.044);
  const nails=pieces.filter(p=>p.l>p.w&&p.rest.y-p.l/2<.07).map(p=>{
    const cap=rod(frame,iron,vec(p.rest.x,.047,.068),vec(p.rest.x,.047,.072),.007,10);
    return {cap,index:pieces.indexOf(p)};
  });
  return {area,frame,pieces,brace,braceLength,braceAngle:Math.atan2(run,1.60),nails,storey,width,h,grips,dunnage};
}

function nailer(parent){
  const tool=group(parent);
  block(tool,safety,0,.084,-.085,.086,.169,.124,.018);
  block(tool,rubber,0,.162,-.092,.10,.036,.135,.012);
  rod(tool,rubber,vec(0,.069,-.120),vec(0,.163,-.180),.025);
  block(tool,safety,0,.173,-.172,.077,.054,.083,.007);
  rod(tool,iron,vec(0,-.049,-.039),vec(0,.208,-.147),.016);
  rod(tool,iron,vec(0,-.079,-.043),vec(0,.018,-.043),.012);
  return tool;
}
export function framing(parent,mats,createWorker){
  const root=group(parent),panels=[];
  const register=spec=>panels.push(framePanel(root,mats,spec));
  function front(a,b,y,storey,openings){
    const x=(a+b)/2;register({x,y,z:2.44,width:b-a,storey,openings:openings.map(o=>({...o,x:o.x-x}))});
  }
  front(-.45,2.13,.205,0,[]);
  front(-6.41,-2.74,.205,0,[{x:-4.615,w:2.45,sill:.664,top:2.09}]);
  front(-2.74,-.45,.205,0,[{x:-1.21,w:1.32,sill:0,top:2.20}]);
  function perimeter(y,level){
    for(const x of [-4.275,0])register({x,y,z:-3.54,yaw:Math.PI,width:4.27,storey:level});
    for(const x of [-6.43,2.13])for(const z of [-2.045,.945]){
      const side=x<0;
      register({x,y,z,yaw:side?-Math.PI/2:Math.PI/2,width:2.98,storey:level,
        openings:side?[{x:0,w:1.38,sill:level?.40:.68,top:level?1.82:1.96}]:[]});
    }
  }
  perimeter(.205,0);
  register({x:5.035,y:.205,z:3.19,width:5.58,h:2.54,openings:[{x:0,w:4.12,sill:0,top:2.17}]});
  for(const z of [-.87,1.85])register({x:7.81,y:.205,z,yaw:Math.PI/2,width:2.72,h:2.54});
  register({x:5.035,y:.205,z:-2.20,yaw:Math.PI,width:5.58,h:2.54});
  const lowerCount=panels.length;
  front(-6.41,-2.61,2.695,1,[{x:-5.265,w:.94,sill:.38,top:1.80},{x:-3.64,w:.94,sill:.38,top:1.80}]);
  front(-2.61,.01,2.695,1,[{x:-1.196,w:2.04,sill:.38,top:1.80}]);
  front(.01,2.13,2.695,1,[{x:.975,w:.94,sill:.38,top:1.80}]);
  perimeter(2.695,1);
  const crew=group(root),carpenters=[createWorker(crew,0),createWorker(crew,1)];
  const staging=group(root);
  for(const [x,z,yaw,len] of [[-2.14,2.52,0,8.62],[-2.14,-3.65,Math.PI,8.62],[2.20,-.54,Math.PI/2,6.10],[-6.50,-.54,-Math.PI/2,6.10]]){
    const row=group(staging,x,0,z);row.rotation.y=yaw;
    for(let p=0;p<3;p++)block(row,mats.timber,0,2.657,.15+p*.26,len,.070,.254);
    const bays=Math.ceil(len/2.4);
    for(let k=0;k<=bays;k++){
      const mark=mix(-len/2,len/2,k/bays);
      for(const edge of [.072,.78])rod(row,iron,vec(mark,-.17,edge),vec(mark,edge>.5?3.70:2.68,edge),.021);
      rod(row,iron,vec(mark,2.60,.03),vec(mark,2.60,.82),.023);
      if(k<bays)rod(row,iron,vec(mark,.24,.78),vec(mark+len/bays,2.51,.78),.017);
    }
    for(const rail of [3.21,3.68])rod(row,iron,vec(-len/2,rail,.78),vec(len/2,rail,.78),.022);
  }
  const tool=nailer(crew),level=group(crew),square=group(crew);
  block(square,iron,.10,0,0,.21,.007,.030);
  block(square,iron,0,0,.088,.024,.007,.18);
  const ticks=[];
  for(const p of panels[0].pieces.filter(p=>p.l>p.w)){
    const mark=block(panels[0].frame,iron,p.rest.x,.022,.070,.004,.034,.002);
    ticks.push(mark);
  }
  block(level,safety,0,0,0,.045,.72,.034,.008);
  block(level,rubber,0,.012,.019,.046,.075,.008,.004);
  block(level,finish('#a8ba82',.25),0,.012,.025,.018,.049,.010,.005);
  const state={eye:vec(),look:vec(),deck:0,upperDeck:0,focusPanel:0};
  let lastStaticChapter=-1;
  function update(chapter,t){
    root.visible=chapter>=3;crew.visible=chapter===3||chapter===4;
    if(!root.visible){state.deck=state.upperDeck=0;lastStaticChapter=-1;return;}
    if(chapter>=5&&lastStaticChapter===chapter)return;
    lastStaticChapter=chapter>=5?chapter:-1;
    const remaining=panels.length-1;
    // Reserve a beat for the first-floor deck before the crew starts the upper walls.
    const deckStart=.36+.50*(lowerCount-1)/remaining,deckEnd=deckStart+.08;
    staging.visible=chapter===4&&t>=deckStart||chapter===5;
    const run=chapter===4?(between(t,.36,deckStart)*(lowerCount-1)+between(t,deckEnd,.94)*(panels.length-lowerCount)):chapter>4?remaining:0;
    state.deck=chapter>4?1:chapter===4?ease(t,deckStart,deckEnd):0;
    state.upperDeck=chapter>4?1:chapter===4?ease(t,.94,1):0;
    const decking=chapter===4&&t>=deckStart&&t<deckEnd;
    const active=chapter===3||chapter===4&&t<.36?0:decking?lowerCount-1:Math.min(panels.length-1,1+Math.floor(run));
    const action=chapter===3?t*.63:chapter>4?1:active===0?.63+.37*between(t,0,.36):clamp(run-(active-1),0,1);
    state.focusPanel=active;
    for(const [index,panel] of panels.entries()){
      const a=index<active?1:index===active?action:0;
      panel.area.visible=index<=active;
      if(!panel.area.visible)continue;
      panel.dunnage.visible=index===active&&a<.652;
      const {frame,pieces,brace,braceLength}=panel;
      brace.visible=chapter<=5;
      if(panel.pose===a)continue;
      panel.pose=a;
      const assembly=between(a,0,.63)*pieces.length;
      for(const [j,p] of pieces.entries()){
        const u=clamp(assembly-j,0,1),move=ease(u,.32,.59);
        p.board.position.copy(p.stack).lerp(p.rest,move);
        const waist=mix(p.stack.z,Math.max(.99,p.stack.z+.15),ease(u,.12,.32));
        p.board.position.z=mix(waist,p.rest.z,ease(u,.60,.72));
        p.board.rotation.z=p.stockAngle*(1-move);
      }
      const raise=ease(a,.652,.830);
      frame.rotation.x=a>=.868?0:-(1-raise)*Math.PI/2+.014*Math.sin(Math.PI*ease(a,.830,.868));
      frame.position.y=Math.abs(Math.sin(frame.rotation.x))*depth/2;
      const fit=ease(a,.878,.946);
      // The brace starts as a loose timber resting on the deck. Its foot stays
      // planted while the carpenter swings its head against the plumb stud.
      brace.rotation.x=mix(-Math.PI/2,panel.braceAngle,fit);
      brace.position.y=.022*Math.abs(Math.sin(brace.rotation.x));
      for(const {cap,index:j} of panel.nails)cap.visible=assembly>=j+.87;
    }
    if(!crew.visible)return;
    const panel=panels[active],{frame,pieces,width,h,area}=panel;
    crew.position.copy(area.position);crew.quaternion.copy(area.quaternion);
    const assembly=between(action,0,.63)*pieces.length,j=Math.min(pieces.length-1,Math.floor(assembly)),u=clamp(assembly-j,0,1);
    const piece=pieces[j],localPoint=(object,point)=>area.worldToLocal(object.localToWorld(point));
    const center=localPoint(piece.board,vec()),side=piece.w>piece.l;
    const joint=localPoint(piece.board,side?vec(-piece.w*.36,0,.071):vec(0,-piece.l/2+.015,.071));
    ticks.forEach((m,k)=>m.visible=active>0||action>.63*(1+k/ticks.length)/panels[0].pieces.length);
    tool.visible=(action<.63&&j>=2)||action>.945;

    square.visible=action<.63&&j<2;level.visible=action>=.824&&action<.924;
    if(action<.63){
      // The carrier works from the open side of the next bay. Both palms
      // stay on the timber until it is fully supported on the deck.
      function carryMarks(member){
        const horizontal=member.w>member.l;
        const length=Math.max(member.w,member.l),width=Math.min(member.w,member.l);
        const half=Math.min(.175,length*.28),edge=width/2;
        const point=d=>localPoint(member.board,horizontal?vec(-d,-edge,.052):vec(-edge,d,.052));
        const grips=[point(-half),point(half)],axis=grips[1].clone().sub(grips[0]).normalize();
        const yaw=Math.atan2(-axis.z,axis.x);
        return {grips,yaw,centre:grips[0].clone().lerp(grips[1],.5)};
      }
      const from=carryMarks(piece),next=carryMarks(pieces[Math.min(j+1,pieces.length-1)]);
      const back=ease(u,.74,.995),hold=ease(u,0,.095)*(1-ease(u,.735,.82));
      const yaw=from.yaw+Math.atan2(Math.sin(next.yaw-from.yaw),Math.cos(next.yaw-from.yaw))*back;
      const hands=from.grips.map((p,k)=>p.clone().lerp(next.grips[k],back));
      const target=from.centre.clone().lerp(next.centre,back);
      const returning=Math.sin(Math.PI*back);
      const low=ease(1.02-target.y,.12,.82);
      const clearance=.39+.105*low+.13*returning;
      const base=target.clone().sub(vec(Math.sin(yaw)*clearance,0,Math.cos(yaw)*clearance));
      const drop=mix(clamp((1.10-target.y)*.74,.014,.72),.014,returning);
      for(const palm of hands)palm.y=mix(palm.y,.89,returning)+.06*(1-ease(u,0,.095))*(1-back);
      piece.steps??=carrierRoute(piece,pieces[j+1]);
      const returningToRack=piece.steps.back&&u>.74;
      const route=returningToRack?piece.steps.back:piece.steps.carry;
      const marks=route.feet(route.total*(returningToRack?back:ease(u,.32,.59)));
      // Allow for the entire boot as the carrier crosses the top plate on
      // the way out of a bay. The height follows the same installed boards
      // when seeking back into the middle of a carry.
      function stepOver(foot){
        let lift=0;
        for(let n=0;n<j+(u>.60?1:0);n++){
          const {rest,w,l}=pieces[n];
          const side=Math.max(0,Math.abs(foot.x-rest.x)-w/2);
          const end=Math.max(0,Math.abs(foot.z+rest.y)-l/2);
          lift=Math.max(lift,depth*(1-ease(Math.hypot(side,end),.16,.31)));
        }
        return lift;
      }
      poseWorker(carpenters[0],{x:base.x,z:base.z,yaw,lean:.10+1.30*drop,drop,kneeWidth:.72,
        footMarks:marks,stepOver,left:hands[0],right:hands[1],look:target,contact:true,hold});
      function fasteningMark(member){
        const p=member.rest.clone();
        if(member.l>member.w)p.y-=member.l/2+stud;
        else {p.x-=member.w*.32;p.y=0;}
        p.z+=.012;return area.worldToLocal(frame.localToWorld(p));
      }
      const near=fasteningMark(piece),previous=fasteningMark(pieces[Math.max(0,j-1)]);
      const walkDistance=near.distanceTo(previous);
      if(!piece.nailerSteps&&walkDistance>.05){
        const stances=[previous,near].map(p=>vec(p.x+.12,0,p.z+.47));
        piece.nailerSteps=walkRoute(stances,1,-2.90,-2.90,undefined,-2.90);
      }
      const mark=previous.lerp(near,ease(u,0,.47));
      const kneel=ease(u,.48,.73)*(1-ease(u,.89,.998));
      const press=ease(u,.65,.805)*(1-ease(u,.88,.99));
      square.position.copy(mark);square.position.y+=.86*(1-kneel);square.rotation.y=Math.PI/2;
      tool.rotation.x=Math.PI/2;
      tool.position.copy(mark).sub(vec(0,-.079,-.043).applyQuaternion(tool.quaternion))
        .add(vec(.04*(1-press),.34*(1-press)+.54*(1-kneel),.16*(1-press)));
      const handle=tool.visible?localPoint(tool,vec(0,.120,-.146)):square.position.clone().add(vec(.05,.028,.024));
      function deckDistance(point){
        const {x,z}=area.localToWorld(point.clone());
        const living=Math.max(-6.50-x,x-2.21,-3.60-z,z-2.50);
        const garage=Math.max(2.21-x,x-7.86,-2.25-z,z-3.25);
        return Math.min(living,garage);
      }
      const stance=vec(mark.x+.12,0,mark.z+.47);
      const footY=panel.storey?0:-.39*ease(deckDistance(stance),-.17,.17);
      // At the corner the carpenter straddles two different floor levels.
      // Solve the supporting height at each boot rather than at the belt.
      const deckAtBoot=panel.storey?undefined:foot=>(deckDistance(foot)<.065?0:-.39)-footY;
      const nailerFeet=piece.nailerSteps?.feet(piece.nailerSteps.total*ease(u,0,.47));
      nailerFeet?.forEach(foot=>{foot.point.y+=footY;});
      poseWorker(carpenters[1],{x:mark.x+.12,y:footY,z:mark.z+.47,yaw:-2.90,lean:.10+.51*kneel+.35*press,
        drop:mix(.015,.64+footY*.90,kneel),footMarks:nailerFeet,kneeWidth:.85,
        stepOver:deckAtBoot,left:mark.clone().add(vec(.14,.105+.20*(1-press)+.58*(1-kneel),.07)),right:handle,look:mark,contact:true});
    }else{
      const lift=ease(action,.652,.83),plumb=ease(action,.82,.86);
      for(const [i,w] of carpenters.entries()){
        const sign=i?1:-1;
        const lip=ease(lift,.01,.18);
        const grip=localPoint(frame,vec(panel.grips[i],Math.min(h+.006,1.52/Math.max(.04,Math.cos(frame.rotation.x))),mix(.045,-depth/2,lip)));
        // At pickup the crew grips the top plate, then walks its hands down
        // a stud as it tips upright, always pushing from the inside face.
        const drive=ease(action,.945,.973);
        const braceHead=localPoint(panel.brace,vec(0,mix(panel.braceLength*.82,panel.braceLength-.048,drive),-.022));
        if(i&&action>.83)grip.lerp(braceHead,ease(action,.83,.878));
        if(!i&&plumb>0){grip.y=mix(grip.y,1.28,plumb);level.position.set(grip.x,1.28,-.084);}
        const z=grip.z-.29,x=grip.x+sign*.085;
        const drop=clamp((1.20-grip.y)*.71,0,.75);
        const spacing=mix(.105,.030,lift);
        const spread=lip>.95?.014:spacing;
        const left=grip.clone().add(vec(-spread,0,0)),right=grip.clone().add(vec(spread,-.035-.14*lip,0));
        if(i&&tool.visible){
          tool.rotation.x=-Math.PI/2;
          tool.position.copy(grip).sub(vec(0,-.079,-.043).applyQuaternion(tool.quaternion));
          tool.position.z-=.10*(1-drive);
          right.copy(localPoint(tool,vec(0,.12,-.146)));
        }
        poseWorker(w,{x,z,yaw:sign*.22,drop,lean:.13+.93*drop,travel:z+2.68,walking:Math.sin(Math.PI*lift),stepAxis:vec(0,0,1),left,right,look:grip,contact:true});
      }
    }
    const wide=active>0&&action>=.63;
    const look=action<.63?center.clone().lerp(joint,.30).add(vec(0,.19,0)):vec(0,mix(.65,1.18,ease(action,.65,.83)),-.38);
    const eye=action<.63?look.clone().add(vec(2.62,1.43,-1.67)):vec(width*.54+1.80,1.73,wide?-4.46:-3.08);
    state.eye.copy(area.localToWorld(eye));state.look.copy(area.localToWorld(look));
  }
  return {root,panels,crew,carpenters,tool,state,update};
}
