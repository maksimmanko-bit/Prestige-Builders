import * as T from './vendor/three.module.js';

export const between=(value,start,end)=>Math.max(0,Math.min(1,(value-start)/(end-start)));
export function ease(value,start,end){const t=between(value,start,end);return t*t*(3-2*t);}
export const mix=T.MathUtils.lerp;
// Seconds in the montage, position on the original architectural build,
// navigation label, caption, and a representative moment to inspect when paused.
export const chapters=[
  [0,0,'Drawing','The plan on site',.42],
  [.50,.08,'Groundwork','Excavate, form and reinforce',.77],
  [.95,.163,'Concrete','Pump concrete into the slab',.42],
  [1.60,.18,'Wall framing','Lay out and nail the wall frame',.62],
  [2.45,.264,'Wall raising','Raise, plumb and brace the walls',.52],
  [3.10,.3325,'Roof','Set and brace the roof truss',.59],
  [3.95,.555,'Electrical','Pull the cable into the outlet box',.59],
  [4.35,.56,'Plumbing','Fit and press a water line',.65],
  [4.70,.565,'Insulation','Fit mineral wool between the studs',.51],
  [5.10,.57,'Drywall','Fasten the last drywall sheet',.49],
  [5.50,.58,'Painting','Roll the finish coat',.39],
  [5.90,.625,'Garage door','Seat the final garage door section',.62],
  [6.60,.648,'Exterior','The finished residence',.50],
  [7.40,.685,'Keys','The keys change hands',.58],
  [8.25,.815,'Fireside','Together by the fire',1]
];
export const lengthSeconds=10;

// Use excerpts from the original choreography so repeated sheets, pipes and
// roller strokes do not have to play in fast-forward. The camera and the
// crew sample the same pose whether the viewer is playing or seeking.
function actionTime(chapter,t){
  switch(chapter){
    case 'Concrete':return mix(.17,.215,t);
    case 'Wall framing':return mix(.956,.983,t); // Seat and nail the last stud.
    case 'Wall raising':return mix(.084,.168,t);
    case 'Roof':return mix(.646,.741,t); // Guide the truss onto its bearings.
    case 'Electrical':return mix(.685,.884,t);
    case 'Plumbing':return mix(.905,.981,t);
    case 'Insulation':return mix(.802,.850,t);
    case 'Drywall':return mix(.752,.776,t);
    case 'Painting':return mix(.943,.956,t);
    case 'Garage door':return mix(.719,.763,t);
    default:return t;
  }
}
export function visitAt(seconds){
  // A chapter start can round down when it passes through the percent slider.
  const i=Math.max(0,chapters.findLastIndex(chapter=>seconds+1e-9>=chapter[0]));
  const current=chapters[i],next=chapters[i+1]??[lengthSeconds,1];
  const t=between(seconds,current[0],next[0]);
  const pose=actionTime(current[2],t);
  let architecturalTime=mix(current[1],next[1],t);
  if(current[2]==='Roof')architecturalTime=.665*(.50+.30*pose);
  if(current[2]==='Exterior')architecturalTime=mix(.665,.677,t);
  if(current[2]==='Keys')architecturalTime=mix(.746,.783,t);
  if(current[2]==='Fireside'){
    // Match cut at the threshold, then keep the final pose on screen.
    architecturalTime=t<.24?mix(.836,.843,t/.24):mix(.965,1,between(t,.24,.71));
  }
  return {i,t:pose,architecturalTime};
}
export function chapterProgress(i){
  const [start,,,,sample]=chapters[i],end=chapters[i+1]?.[0]??lengthSeconds;
  return mix(start,end,sample)/lengthSeconds*100;
}
export function floorDrawing(){
  // The paper, wall sections and footing use matching house-local coordinates.
  const sheet=document.createElement('canvas');sheet.width=1536;sheet.height=1024;
  const g=sheet.getContext('2d'),scale=94,ox=725,oy=485;
  const X=x=>ox+x*scale,Z=z=>oy+z*scale;
  g.fillStyle='#eee9d8';g.fillRect(0,0,1536,1024);
  g.strokeStyle='#bac8c3';g.lineWidth=.65;
  for(let x=ox%47;x<1536;x+=47){g.beginPath();g.moveTo(x,0);g.lineTo(x,1024);g.stroke();}
  for(let y=oy%47;y<1024;y+=47){g.beginPath();g.moveTo(0,y);g.lineTo(1536,y);g.stroke();}
  function wall(x,z,w,d){g.strokeStyle='#254955';g.lineWidth=7;g.strokeRect(X(x),Z(z),w*scale,d*scale);g.strokeStyle='#d4d9cf';g.lineWidth=2;g.strokeRect(X(x),Z(z),w*scale,d*scale);}
  wall(-5,-3.6,6.7,6.1);wall(1.7,-2.25,4.34,5.5);wall(-1.81,2.5,2.12,.67);
  wall(-5,-3.6,3.2,2.8);wall(-1.8,-3.6,3.5,2.8);
  g.strokeStyle='#66838a';g.lineWidth=2;
  for(const [x,z] of [[-2.6,-.8],[-.85,2.5],[1.7,-1]]){g.beginPath();g.moveTo(X(x),Z(z));g.lineTo(X(x),Z(z-.8));g.arc(X(x),Z(z),.8*scale,-Math.PI/2,0);g.stroke();}
  function dim(x0,x1,z,label){g.beginPath();g.moveTo(X(x0),Z(z));g.lineTo(X(x1),Z(z));for(const x of [x0,x1]){g.moveTo(X(x)-6,Z(z)+7);g.lineTo(X(x)+6,Z(z)-7);}g.stroke();g.fillText(label,(X(x0)+X(x1))/2-28,Z(z)-8);}
  g.fillStyle='#305363';g.font='16px monospace';dim(-5,1.7,-4.05,'6 700');dim(1.7,6.04,-4.05,'4 340');
  for(const [name,x,z] of [['LIVING',-3.4,1],['KITCHEN',-4.5,-2.05],['DINING',-.9,-2.05],['GARAGE',3,1]])g.fillText(name,X(x),Z(z));
  // Thin fixtures and window openings distinguish partitions from structural walls.
  g.lineWidth=1.6;g.strokeStyle='#536c70';
  function fixture(x,z,w,d){g.strokeRect(X(x),Z(z),w*scale,d*scale);}
  fixture(-4.79,-3.4,2.76,.58);fixture(-4.79,-2.82,.58,1.6);
  fixture(-4.65,-3.32,.76,.37);fixture(-3.72,-3.32,.53,.42);
  for(const x of [-3.59,-3.38])for(const z of [-3.20,-3.02]){g.beginPath();g.arc(X(x),Z(z),5,0,Math.PI*2);g.stroke();}
  fixture(-4.76,-.3,.62,1.98);for(let j=0;j<3;j++)fixture(-4.72,-.26+j*.63,.50,.58);
  fixture(-3.77,.13,.57,1.20);fixture(-1.01,-2.83,1.47,.74);
  for(const x of [-.9,-.32,.22]){fixture(x,-3.09,.24,.22);fixture(x,-2.03,.24,.22);}
  for(const x of [-4.50,-2.99,-1.43,-.30]){
    g.fillStyle='#e4e7d9';g.fillRect(X(x),Z(2.5)-4,scale*.46,8);
    g.strokeRect(X(x),Z(2.5)-3,scale*.46,6);
  }
  g.save();g.setLineDash([8,7]);g.lineWidth=1;g.strokeStyle='#788887';
  for(const x of [-5,-1.8,1.7,6.04]){g.beginPath();g.moveTo(X(x),Z(-4.35));g.lineTo(X(x),Z(3.72));g.stroke();}
  g.restore();g.fillStyle='#305363';g.font='15px monospace';dim(-5,6.04,3.94,'11 040');
  g.strokeRect(21,20,1494,984);g.font='bold 24px monospace';g.fillText('A 01   /   GROUND FLOOR',53,965);g.font='14px monospace';g.fillText('PRESTIGE BUILDERS     /     DESIGN STUDY',1041,965);
  const texture=new T.CanvasTexture(sheet);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;
  const mat=new T.MeshStandardMaterial({map:texture,roughness:.98,transparent:true,depthWrite:false});
  const plane=new T.Mesh(new T.PlaneGeometry(sheet.width/scale,sheet.height/scale),mat);
  plane.rotation.x=-Math.PI/2;plane.position.set((768-ox)/scale,-.16,(512-oy)/scale);plane.receiveShadow=true;return plane;
}

export function siteSurface(){
  const c=document.createElement('canvas');c.width=c.height=512;const g=c.getContext('2d');
  let seed=92;const rand=()=>((seed=seed*16807%2147483647)/2147483647);
  g.fillStyle='#9b856b';g.fillRect(0,0,512,512);
  for(let i=0;i<32000;i++){const v=85+rand()*100;g.fillStyle='rgba('+[v+13,v+4,v-10,.42].join(',')+')';const r=.4+rand()*2.1;g.fillRect(rand()*512,rand()*512,r,r*.6);}
  for(let y=0;y<512;y+=32)for(const x of [67,85,347,365]){g.strokeStyle='#5f504333';g.lineWidth=5;g.beginPath();g.moveTo(x,y);g.lineTo(x+19,y+12);g.stroke();}
  const map=new T.CanvasTexture(c);map.wrapS=map.wrapT=T.RepeatWrapping;map.repeat.set(5,4);map.colorSpace=T.SRGBColorSpace;
  const mesh=new T.Mesh(new T.PlaneGeometry(34,24),new T.MeshStandardMaterial({map,roughness:1,bumpMap:map,bumpScale:.045,transparent:true,depthWrite:false}));
  mesh.rotation.x=-Math.PI/2;mesh.position.y=-.19;mesh.receiveShadow=true;return mesh;
}
