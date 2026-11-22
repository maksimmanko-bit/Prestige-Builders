import * as THREE from './vendor/three.module.js';

export function planting(add,parent){
  let seed=83;const random=()=>((seed=seed*16807%2147483647)-1)/2147483646;
  const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');g.strokeStyle='#c5d0ae';
  g.lineWidth=2;g.beginPath();g.moveTo(64,127);g.lineTo(64,8);g.stroke();
  for(let i=0;i<32;i++){const y=14+i*3.3,l=6+i*.65;g.strokeStyle=i%3?'#879c71':'#b6c998';g.lineWidth=1.4;g.beginPath();g.moveTo(64,y+12);g.lineTo(64-l,y);g.moveTo(64,y+12);g.lineTo(64+l,y);g.stroke();}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
  const leaf=new THREE.MeshStandardMaterial({map:t,transparent:false,alphaTest:.35,side:THREE.DoubleSide,roughness:.9,color:'#718465'}),dummy=new THREE.Object3D();
  for(const[x,z,h]of[[-7,-2.5,5.1],[6.8,-3.7,5.8],[-7.5,1.4,3.5],[10,-9,7],[-13,-9,7]]){
    const count=900,tree=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1.8),leaf,count);
    for(let i=0;i<count;i++){const y=random(),theta=random()*Math.PI*2,r=h*.24*(1-y)*Math.sqrt(random());dummy.position.set(Math.cos(theta)*r,h*(.08+y*.9),Math.sin(theta)*r);dummy.rotation.set((random()-.5)*1.7,theta,random()*.6);dummy.scale.setScalar((.2+random()*.18)*(1-y*.55));dummy.updateMatrix();tree.setMatrixAt(i,dummy.matrix);tree.setColorAt(i,new THREE.Color().setHSL(.27+random()*.07,.17+random()*.15,.35+random()*.2));}
    tree.position.set(x,-.15,z);tree.frustumCulled=false;add(tree,.895,.1,0,parent);
  }
  const blades=new THREE.SphereGeometry(1,5,3),shrubs=new THREE.InstancedMesh(blades,new THREE.MeshStandardMaterial({roughness:.83}),1950);
  for(let i=0;i<shrubs.count;i++){
    const bush=i%7,theta=random()*Math.PI*2,h=random(),radius=.39*Math.sqrt(1-h*h)*(.8+.2*random());
    dummy.position.set(-4.73+bush*.387+radius*Math.cos(theta),.12+(.38+(bush%3)*.055)*h,3.30+radius*Math.sin(theta));
    dummy.rotation.set(random(),theta,random());dummy.scale.set(.035+random()*.021,.023,.048);dummy.updateMatrix();
    shrubs.setMatrixAt(i,dummy.matrix);shrubs.setColorAt(i,new THREE.Color().setHSL(.22+random()*.07,.22+random()*.22,.20+random()*.19));
  }
  add(shrubs,.89,.08,0,parent);
  const grassGeo=new THREE.BufferGeometry();grassGeo.setAttribute('position',new THREE.Float32BufferAttribute([-.016,0,0,.016,0,0,.011,.3,.035,-.008,.3,.035,0,.64,.12],3));grassGeo.setIndex([0,1,2,0,2,3,3,2,4]);grassGeo.computeVertexNormals();
  const grassMat=new THREE.MeshStandardMaterial({color:'#b5ad78',side:THREE.DoubleSide,roughness:1});
  for(const[x,z]of[[-5.2,3.8],[-2,3.8],[.8,4.1],[5.3,3.9],[-6,5.2]]){
    const clump=new THREE.InstancedMesh(grassGeo,grassMat,110);
    for(let i=0;i<110;i++){dummy.position.set((random()-.5)*.55,0,(random()-.5)*.55);dummy.rotation.set((random()-.5)*.5,random()*Math.PI*2,0);dummy.scale.setScalar(.6+random()*.8);dummy.updateMatrix();clump.setMatrixAt(i,dummy.matrix);clump.setColorAt(i,new THREE.Color().setHSL(.14+random()*.08,.2+random()*.25,.3+random()*.25));}
    clump.position.set(x,-.12,z);add(clump,.9,.09,0,parent);
  }
}
