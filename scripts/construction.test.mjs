import test from 'node:test';
import assert from 'node:assert/strict';
import { constructionSite } from '../construction.js';
import { homecoming } from '../homecoming.js';
import { Group, MeshStandardMaterial, Vector3 } from '../vendor/three.module.js';
import { framing } from '../framing.js';
import { concretePour } from '../concrete.js';
import { wallTrades } from '../wall-trades.js';
import { garageInstallation } from '../garage.js';
import { chapters,chapterProgress,visitAt,lengthSeconds } from '../story.js';
import { walkRoute } from '../footsteps.js';
import { gloveContact } from '../site-work.js';
import { phases, roofPose, sampleTimeline, groundOpening } from '../construction-backdrop.js';

test('the paper unrolls on the ground before the foundation rises and hands off to the crew', () => {
  assert.deepEqual(groundOpening(0), { unroll: 0, paper: 1, height: 0, detail: 1, ink: 1, photo: 0 });
  const halfway = groundOpening(.30);
  assert.ok(halfway.unroll > 0 && halfway.unroll < 1);
  assert.equal(halfway.height, 0);
  const flat = groundOpening(.63);
  assert.equal(flat.unroll, 1);
  assert.equal(flat.paper, 1);
  assert.equal(flat.height, 0);
  const rising = groundOpening(.80);
  assert.ok(rising.height > 0 && rising.height < 36);
  assert.ok(rising.paper > 0 && rising.paper < 1);
  assert.equal(rising.photo, 0);
  const overlap = groundOpening(.97);
  assert.ok(overlap.height > rising.height && overlap.photo > 0 && overlap.photo < 1);
  assert.deepEqual(groundOpening(phases[0].change), { unroll: 1, paper: 0, height: 36, detail: 0, ink: 0, photo: 1 });
});

test('the crane releases only after seating, before roof sheathing begins', () => {
  const seated = roofPose(5.57);
  assert.equal(seated.contact, 1);
  assert.equal(seated.retract, 0);
  assert.ok(roofPose(5.2).y < seated.y);
  const hold = roofPose(5.84);
  assert.deepEqual(hold, seated);
  const released = roofPose(phases.find(p => p.name === 'frame').change);
  assert.equal(released.y, seated.y);
  assert.equal(released.retract, 58);
  assert.ok(released.slingWidth < hold.slingWidth);
  const liftingHook = roofPose(6.02);
  assert.equal(liftingHook.y, seated.y);
  assert.ok(liftingHook.retract > 0 && liftingHook.retract < released.retract);
});

test('scroll reaches the same stage and blend in either direction over ten seconds', () => {
  const positions = [.03, .112, .19, .321, .437, .586, .661, .791, .921, .98];
  const forward = positions.map(sampleTimeline);
  const backward = [...positions].reverse().map(sampleTimeline).reverse();
  assert.deepEqual(forward, backward);
  for (const [index, phase] of phases.slice(0, -1).entries()) {
    const middle = (phase.change + phases[index + 1].start) / 20;
    const sample = sampleTimeline(middle);
    assert.equal(sample.current, index);
    assert.ok(Math.abs(sample.fraction - .5) < 1e-10);
  }
  assert.equal(sampleTimeline(-1).time, 0);
  assert.equal(sampleTimeline(2).time, 10);
  assert.equal(forward.at(-1).current, phases.length - 1);
});

test('chapter links enter the right shot after converting through slider percentages',()=>{
  for(const [i,[start]] of chapters.entries()){
    const percent=start/lengthSeconds*100;
    assert.equal(visitAt(percent*lengthSeconds/100).i,i);
    if(i>0)assert.equal(visitAt(start-.001).i,i-1);
  }
});

test('a planted shoe holds its print through a turn and the last step',()=>{
  const route=walkRoute([new Vector3(0,0,2),new Vector3(0,.12,0),new Vector3(1,.12,0)],.72,Math.PI,0);
  for(let k=0;k<route.strikes.length-1;k++){
    const stance=1-k%2;
    const start=route.strikes[k],interval=route.strikes[k+1]-start;
    const a=route.feet(start+.12*interval)[stance],b=route.feet(start+.83*interval)[stance];
    assert.ok(a.point.distanceTo(b.point)<1e-8);
    assert.equal(a.yaw,b.yaw);assert.equal(a.roll,b.roll);
  }
});

function kneeFlexion(leg){
  const joint=o=>o.getWorldPosition(new Vector3());
  const knee=joint(leg.knee);
  return 180-joint(leg.hip??leg.thigh).sub(knee).angleTo(joint(leg.ankle).sub(knee))*180/Math.PI;
}

test('the ten-second montage visits all chapters in order and holds on the family at the end',()=>{
  const seen=new Set();let previous=0;
  for(let frame=0;frame<=600;frame++){
    const {i,architecturalTime}=visitAt(frame/60);seen.add(i);
    assert.ok(architecturalTime>=previous);previous=architecturalTime;
  }
  assert.equal(lengthSeconds,10);assert.equal(seen.size,chapters.length);
  assert.equal(visitAt(0).architecturalTime,0);
  assert.equal(visitAt(9.5).architecturalTime,1);
  assert.equal(visitAt(10).architecturalTime,1);
});

test('parents and children keep a planted foot and extend a leg while walking the hall',()=>{
  const mat=new MeshStandardMaterial(),home=homecoming({wood:mat,stone:mat});
  for(const [i,person] of home.family.entries()){
    let previous;
    for(let k=0;k<=50;k++){
      home.update(.852+i*.0105+k*.00045);
      const feet=person.legs.map(l=>l.ankle.getWorldPosition(new Vector3()));
      assert.ok(Math.min(...person.legs.map(kneeFlexion))<23);
      if(previous)assert.ok(Math.min(...feet.map((p,j)=>p.distanceTo(previous[j])))<.002);
      previous=feet;
    }
  }
});

test('carpenters and both door installers walk upright while carrying a member',()=>{
  const m=testMaterials(),create=constructionSite(m).createWorker;
  const crew=framing(new Group(),m,create),garage=garageInstallation(new Group(),m,create);
  for(let k=0;k<=50;k++){
    const u=.33+.25*k/50;
    crew.update(3,(7+u)/crew.panels[0].pieces.length);
    assert.ok(Math.min(...crew.carpenters[0].legs.map(kneeFlexion))<24);
    for(let section=0;section<4;section++){
      garage.update(11,.015+.77*(section+u)/4);
      for(const installer of garage.pair)assert.ok(Math.min(...installer.legs.map(kneeFlexion))<24);
    }
  }
});

test('both seated parents reach the near shoulder of their child after a rewind',()=>{
  const m=new MeshStandardMaterial(),story=homecoming({wood:m,stone:m});
  const position=o=>o.getWorldPosition(new Vector3());
  for(const t of [1,.762,1]){
    story.update(t);if(t!==1)continue;
    for(const [adult,child,arm] of [[0,1,1],[3,2,0]]){
      const wrist=position(story.family[adult].arms[arm].hand);
      const shoulder=position(story.family[child].arms[1-arm].shoulder);
      assert.ok(wrist.distanceTo(shoulder)<.075);
    }
    for(const child of story.family.slice(1,3))for(const leg of child.legs){
      assert.ok(position(leg.knee).y>.79);
      assert.ok(position(leg.ankle).y<position(leg.knee).y-.19);
    }
  }
});

test('construction site is removed at both ends of the timeline',()=>{
  const site=constructionSite();
  for(const p of[0,.1,1]){site.update(p);assert.equal(site.root.visible,false);}
  for(const p of[.2,.4,.6,.8]){site.update(p);assert.equal(site.root.visible,true);}
});
test('seeking backwards restores identical machine and worker transforms',()=>{
  const site=constructionSite();
  const snapshot=()=>{const values=[];site.root.traverse(o=>values.push([...o.position,...o.quaternion,...o.scale,o.visible]));return values;};
  site.update(.42);const before=snapshot();site.update(.82);site.update(.42);assert.deepEqual(snapshot(),before);
});
test('full build sequence keeps every position and geometry finite',()=>{
  const site=constructionSite();
  for(let frame=0;frame<=240;frame++){
    site.update(frame/240);
    site.root.traverse(o=>{assert.ok([...o.position,...o.quaternion,...o.scale].every(Number.isFinite));if(o.geometry)assert.ok(o.geometry.attributes.position.array.every(Number.isFinite));});
  }
});

test('the roof truss stays installed after workers and rigging leave',()=>{
  const site=constructionSite();
  const beam=site.installed.getObjectByName('Garage roof truss');
  site.update(.655);const suspended=beam.position.clone();
  site.update(.744);const seated=beam.position.clone();
  assert.ok(suspended.y>seated.y+1);
  assert.ok(suspended.z>seated.z+2);
  const drivers=[];
  site.root.traverse(object=>{if(object.name==='Impact driver')drivers.push(object);});
  assert.equal(drivers.length,2);
  for(const [i,tool] of drivers.entries()){
    const tip=tool.localToWorld(new Vector3(0,0,.27));
    assert.ok(tip.distanceTo(new Vector3([2.30,7.74][i],2.86,1.15))<.015);
  }
  site.update(1);assert.equal(site.root.visible,false);
  assert.equal(beam.visible,true);
  assert.ok(beam.position.equals(seated));
  site.update(.26);assert.equal(beam.visible,false);
});

test('the key passes between meeting hands and the family enters before sitting',()=>{
  const roomMaterial=new MeshStandardMaterial(),story=homecoming({wood:roomMaterial,stone:roomMaterial});
  const hand=actor=>actor.arms[1].hand.getWorldPosition(new Vector3());
  story.update(.762);
  assert.ok(hand(story.foreman).distanceTo(hand(story.family[0]))<.002);
  story.update(.784);
  const held=hand(story.family[0]);held.y-=.056;
  assert.ok(story.key.position.distanceTo(held)<.001);
  for(const f of story.family)assert.ok(f.root.position.z>3.5);
  story.update(1);
  const seated=story.family.map(f=>f.root.position.toArray());
  assert.equal(story.key.visible,false);
  assert.equal(story.foreman.root.visible,false);
  for(const f of story.family){
    assert.ok(f.root.position.z< -1.9);
    assert.ok(f.body.position.y< -.39);
    assert.ok(Number.isFinite(f.arms[0].hand.getWorldPosition(new Vector3()).length()));
  }
  story.update(.861);story.update(1);
  assert.deepEqual(story.family.map(f=>f.root.position.toArray()),seated);
});

test('the sling tensions before lift-off and rises free only after the truss is secured',()=>{
  const site=constructionSite();
  const truss=site.installed.getObjectByName('Garage roof truss');
  const master=site.root.getObjectByName('Master link');
  const brace=site.installed.getObjectByName('Temporary diagonal brace 0');
  const seek=t=>site.update(.5+.3*t);
  seek(0);const rest=truss.position.clone(),slackHeight=master.position.y;
  seek(.29);
  assert.ok(truss.position.equals(rest));
  assert.ok(master.position.y>slackHeight+.9);
  seek(.73);const onBearings=truss.position.clone(),tautHeight=master.position.y;
  seek(.83);assert.ok(brace.visible);assert.equal(brace.rotation.x,0);
  assert.ok(truss.position.equals(onBearings));
  seek(.895);assert.ok(master.position.y<tautHeight-.2);
  seek(1);assert.ok(master.position.y>tautHeight+1);
  assert.ok(truss.position.equals(onBearings));
  seek(0);assert.ok(truss.position.equals(rest));assert.equal(master.position.y,slackHeight);
});

const testMaterials=()=>Object.fromEntries(['concrete','timber','wood','glass','trim'].map(k=>[k,new MeshStandardMaterial()]));

test('stock is carried into the frame, nailed to the plate, then lifted as one assembly',()=>{
  const world=new Group(),mats=testMaterials(),builders=framing(world,mats,constructionSite(mats).createWorker);
  const first=builders.panels[0],member=first.pieces[2];
  builders.update(3,0);const stock=member.board.getWorldPosition(new Vector3());
  builders.update(3,(2+.81)/first.pieces.length);
  assert.ok(member.board.position.distanceTo(member.rest)<.0001);
  assert.ok(stock.distanceTo(member.board.getWorldPosition(new Vector3()))>.10);
  const tip=builders.tool.localToWorld(new Vector3(0,-.079,-.043));
  const joint=member.board.localToWorld(new Vector3(0,-member.l/2-.044,.012));
  assert.ok(tip.distanceTo(joint)<.001);
  builders.update(3,.304);
  const heels=builders.carpenters[1].legs.map(l=>l.ankle.localToWorld(new Vector3(0,-.084,.029)));
  const garageFoot=heels.find(p=>p.x>2.21),yardFoot=heels.find(p=>p.x<2.21);
  assert.ok(garageFoot.y>=.20&&yardFoot.y<-.12);
  builders.update(4,.111);
  assert.ok(first.frame.rotation.x<-.25&&first.frame.rotation.x>-1.35);
  for(const [i,w] of builders.carpenters.entries()){
    const hand=first.frame.worldToLocal(w.arms[0].hand.getWorldPosition(new Vector3()));
    assert.ok(Math.abs(hand.x-first.grips[i])<.19);
    assert.ok(Math.abs(hand.z)<.17);
  }
  const angle=first.frame.rotation.x;
  builders.update(5,1);assert.equal(first.frame.rotation.x,0);assert.ok(first.brace.rotation.x>0);
  builders.update(4,.111);assert.equal(first.frame.rotation.x,angle);
  builders.update(3,0);assert.ok(member.board.getWorldPosition(new Vector3()).equals(stock));
});

test('timbers rest on skids or other timbers before pickup and both gloves stay on the moving member',()=>{
  const mats=testMaterials(),builders=framing(new Group(),mats,constructionSite(mats).createWorker);
  const panel=builders.panels[0];
  builders.update(3,0);
  for(const p of panel.pieces){
    const centre=panel.area.worldToLocal(p.board.getWorldPosition(new Vector3()));
    const below=centre.y-.069;
    const supported=panel.dunnage.children.filter(o=>Math.abs(o.position.z-centre.z)<.001&&Math.abs(below-o.position.y-.038)<.001);
    const stacked=panel.pieces.some(q=>q!==p&&q.stack.y===p.stack.y&&Math.abs(q.stack.z+.138-p.stack.z)<.001);
    assert.ok(supported.length===2||stacked);
  }
  for(const [i,p] of panel.pieces.entries())for(let k=0;k<=30;k++){
    builders.update(3,(i+.12+.60*k/30)/panel.pieces.length);
    for(const [j,arm] of builders.carpenters[0].arms.entries()){
      const point=p.board.worldToLocal(gloveContact(arm,true));
      const parallel=p.w>p.l,d=(j?1:-1)*Math.min(.175,Math.max(p.w,p.l)*.28);
      const expected=parallel?new Vector3(-d,-p.l/2,.052):new Vector3(-p.w/2,d,.052);
      assert.ok(point.distanceTo(expected)<.003);
    }
  }
  const sill=builders.panels[1].pieces.find(p=>p.board.name==='Rough sill');
  builders.update(4,.36);const loose=sill.board.getWorldPosition(new Vector3());
  builders.update(5,1);const seated=sill.board.getWorldPosition(new Vector3());
  assert.ok(seated.distanceTo(loose)>.45);
  builders.update(4,.36);assert.ok(sill.board.getWorldPosition(new Vector3()).equals(loose));
});

test('garage sections stay supported and crew clothing clears the panels throughout installation',()=>{
  const mats=testMaterials(),garage=garageInstallation(new Group(),mats,constructionSite(mats).createWorker);
  const point=new Vector3(),h=.535;
  for(const [i,panel] of garage.panels.entries())for(let k=0;k<=50;k++){
    const u=k/50;garage.update(11,.015+.77*(i+u)/4);
    garage.root.updateMatrixWorld(true);
    for(const [j,other] of garage.panels.entries()){
      if(j>i||j===i&&u<=.11)assert.ok(Math.abs(other.position.y-h/2-.0035-garage.rackTop)<.001);
      if(j<i||j===i&&u>=.81)assert.ok(Math.abs(other.position.y-(j+.5)*h)<.002);
    }
    for(const [side,worker] of garage.pair.entries()){
      if(u>=.11&&u<=.81)for(const [hand,arm] of worker.arms.entries()){
        const contact=panel.worldToLocal(gloveContact(arm,true));
        assert.ok(contact.distanceTo(garage.handles[i][side][hand])<.004,`section ${i}, grip ${hand}, phase ${u}`);
      }
      for(const name of ['site-bib','work-shirt']){
        const garment=worker.g.getObjectByName(name),indices=garment.geometry.index;
        for(let v=0;v<indices.count;v+=31){
          garment.getVertexPosition(indices.getX(v),point);garment.localToWorld(point);garage.root.worldToLocal(point);
          assert.ok(point.x>-2.60&&point.x<2.61,'both end aisles clear the side walls');
          for(const other of garage.panels){
            const inside=Math.abs(point.x)<2.06&&Math.abs(point.y-other.position.y)<h/2&&Math.abs(point.z-other.position.z)<.032;
            assert.ok(!inside,`${name} inside section during ${i} at ${u}`);
          }
        }
      }
    }
  }
});

test('the carpenters’ trouser legs clear the stock and the flat wall as they carry and return',()=>{
  const mats=testMaterials(),crew=framing(new Group(),mats,constructionSite(mats).createWorker);
  const panel=crew.panels[0],point=new Vector3(),local=new Vector3();
  for(let step=0;step<panel.pieces.length*40;step++){
    crew.update(3,step/(panel.pieces.length*40));crew.root.updateMatrixWorld(true);
    const inverse=panel.pieces.map(p=>p.board.matrixWorld.clone().invert());
    for(const w of crew.carpenters){
      const suit=w.g.getObjectByName('site-bib'),verts=suit.geometry.attributes.position,idx=suit.geometry.index;
      for(let v=0;v<idx.count;v+=37){
        const id=idx.getX(v);if(verts.getY(id)>.15)continue;
        suit.getVertexPosition(id,point);suit.localToWorld(point);
        for(const [j,{w,l}] of panel.pieces.entries()){
          local.copy(point).applyMatrix4(inverse[j]);
          assert.ok(Math.abs(local.x)>=w/2-.001||Math.abs(local.y)>=l/2-.001||Math.abs(local.z)>=.068);
        }
      }
    }
  }
});

test('the active wire passes through both glove contacts and stays in the socket when released and after a seek',()=>{
  const mats=testMaterials(),trades=wallTrades(new Group(),mats,constructionSite(mats).createWorker);
  const pos=trades.cable.geometry.attributes.position;
  function ring(n){
    const centre=new Vector3();
    for(let j=0;j<8;j++)centre.add(new Vector3().fromBufferAttribute(pos,n*8+j));
    return centre.multiplyScalar(1/8);
  }
  for(let i=0;i<=85;i++){
    trades.update(6,i/100);
    for(const [j,arm] of trades.electrician.arms.entries()){
      const palm=trades.bay.worldToLocal(gloveContact(arm,true));
      const jacket=new Vector3().fromBufferAttribute(pos,(j?32:24)*8);
      assert.ok(palm.distanceTo(jacket)<.0001);
    }
  }
  trades.update(6,.86);
  const socket=new Vector3(-1.69,1.044,.083);
  assert.ok(ring(40).distanceTo(socket)<.0001);
  trades.update(6,1);const fixed=pos.array.slice();
  trades.update(7,.4);assert.deepEqual(pos.array,fixed);
  trades.update(6,.36);assert.ok(ring(40).distanceTo(socket)>.1);
  trades.update(6,1);assert.deepEqual(pos.array,fixed);
});

test('concrete accumulates first on the active footprint and can be rewound',()=>{
  const mats=testMaterials(),pour=concretePour(new Group(),mats,constructionSite(mats).createWorker);
  const surfaces=pour.root.children.filter(c=>c.isMesh);
  const heights=o=>Array.from({length:o.geometry.attributes.position.count},(_,i)=>o.geometry.attributes.position.getY(i));
  pour.update(.23);const partial=heights(surfaces[0]);
  assert.ok(Math.max(...partial)>.16&&Math.min(...partial)<-.19);
  assert.ok(Math.max(...heights(surfaces[1]))<-.19);
  pour.update(1);assert.ok(Math.min(...heights(surfaces[0]))>.19);
  pour.update(.23);assert.deepEqual(heights(surfaces[0]),partial);
});

test('wall finishes cover the installed services and the garage panels follow linked hinges',()=>{
  const mats=testMaterials(),world=new Group(),factory=constructionSite(mats).createWorker;
  const trades=wallTrades(world,mats,factory),garage=garageInstallation(world,mats,factory);
  trades.update(6,.31);const laid=trades.cable.geometry.drawRange.count;
  trades.update(10,.51);assert.ok(trades.boards.every(b=>b.visible&&b.position.z===0));
  assert.ok(trades.paint.value>0&&trades.paint.value<1);
  trades.update(6,.31);assert.equal(trades.cable.geometry.drawRange.count,laid);assert.ok(trades.boards.every(b=>!b.visible));
  garage.update(11,.90);const raised=garage.panels[0].position.clone();
  assert.ok(raised.y>2);
  for(let i=0;i<3;i++){
    const upper=garage.panels[i].localToWorld(new Vector3(0,.535/2,0));
    const lower=garage.panels[i+1].localToWorld(new Vector3(0,-.535/2,0));
    assert.ok(upper.distanceTo(lower)<.0001);
  }
  garage.update(12,.5);assert.ok(garage.panels[0].position.y<.28);assert.equal(garage.panels[0].rotation.x,0);
  garage.update(11,.90);assert.ok(raised.equals(garage.panels[0].position));
  for(let i=0;i<chapters.length;i++)assert.equal(visitAt(chapterProgress(i)/100*lengthSeconds).i,i);
});
