import * as THREE from './vendor/three.module.js';

export function detailedMaterials(mats,onReady){
  const loader=new THREE.TextureLoader();
  function tile(name){
    const map=loader.load('./assets/'+name+'.jpg',onReady);
    map.colorSpace=THREE.SRGBColorSpace;
    map.wrapS=map.wrapT=THREE.RepeatWrapping;map.anisotropy=8;
    return map;
  }
  for(const [key,file,bump] of [['stone','limestone',.035],['wood','cedar',.012],['roof','shingle',.028],['grass','lawn',.018],['plaster','stucco',.012],['concrete','cast-concrete',.005],['paving','concrete',.012],['timber','spruce',.009]]){
    const mat=mats[key],map=tile(file);
    mat.map=mat.bumpMap=map;mat.bumpScale=bump;mat.color.set('#ffffff');
    mat.needsUpdate=true;
  }
  mats.fabric=tile('linen');mats.fabric.repeat.set(2,2);
  mats.sheathing=tile('osb');mats.sheathing.repeat.set(6,3);
  mats.insulation=tile('mineral-wool');mats.insulation.repeat.set(1,3.7);
  mats.fleet=tile('fleet-enamel');
  mats.wood.color.set('#c6ae96');mats.paving.color.set('#c3bcab');
  mats.oak=tile('oak');mats.enamel=tile('enamel');
  mats.roof.metalness=.025;mats.roof.roughness=.94;
  mats.glass=new THREE.MeshPhysicalMaterial({color:'#dbe7e9',roughness:.055,metalness:.33,transparent:true,opacity:.44,reflectivity:.95,envMapIntensity:1.65,depthWrite:false,side:THREE.DoubleSide});
}
