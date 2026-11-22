import * as T from './vendor/three.module.js';

import { faceGeometry, loadHair } from './anatomy.js';
const faceMaterials=[];
const lids=[];
const necks=[];
const neckPoint=new T.Vector3(),unturn=new T.Quaternion();
export function animateFaces(seconds){
  lids.forEach((lid,i)=>{
    const phase=(seconds+i*.91)%(3.3+i*.27);
    lid.value=1-T.MathUtils.smoothstep(Math.abs(phase-.15),.018,.105);
  });
  for(const {head,rest,weights,indices} of necks){
    let ancestor=head;while(ancestor&&ancestor.visible)ancestor=ancestor.parent;if(ancestor)continue;
    const pos=head.geometry.attributes.position;
    unturn.copy(head.parent.quaternion).invert();
    for(const [j,i] of indices.entries()){
      neckPoint.fromBufferAttribute(rest,i).multiplyScalar(head.scale.x).add(head.position);
      neckPoint.applyQuaternion(unturn).sub(head.position).divideScalar(head.scale.x);
      const w=weights[j];pos.setXYZ(i,T.MathUtils.lerp(rest.getX(i),neckPoint.x,w),T.MathUtils.lerp(rest.getY(i),neckPoint.y,w),T.MathUtils.lerp(rest.getZ(i),neckPoint.z,w));
    }
    pos.needsUpdate=true;
  }
}

function atlasTile(atlas,column,row,columns,rows){
  const tile=atlas.clone();
  // Keep the linear filter inside each character's own tile at grazing angles.
  const u=.6/atlas.image.width,v=.6/atlas.image.height;
  tile.offset.set(column/columns+u,1-(row+1)/rows+v);
  tile.repeat.set(1/columns-2*u,1/rows-2*v);tile.needsUpdate=true;
  return tile;
}
export function loadPortraits(onReady){
  for(const [file,start,rows,count] of [['portraits',0,2,5],['crew-faces',5,1,3]])new T.TextureLoader().load('./assets/'+file+'.jpg',atlas=>{
    atlas.colorSpace=T.SRGBColorSpace;atlas.anisotropy=4;
    for(let i=0;i<count;i++){
      const m=faceMaterials[start+i];
      if(!m)continue;
      m.map=atlasTile(atlas,i%3,Math.floor(i/3),3,rows);m.color.set('#fff7f0');m.needsUpdate=true;
    }
    onReady();
  });
}

export function portrait(parent,index,center,scale=1){
  if(!faceMaterials[index]){
    const face=new T.MeshStandardMaterial({color:'#c99372',roughness:.77});
    const lid=lids[index]={value:0};
    face.onBeforeCompile=shader=>{
      shader.uniforms.lidClosure=lid;
      shader.uniforms.hairTint={value:new T.Color(['#403328','#694e35','#715239','#47352b','#6c655d','#241e1b','#665548','#2b2422'][index])};
      shader.uniforms.skinTint={value:new T.Color(['#bd9174','#ce9f7f','#ca9a7c','#cfa085','#ae836c','#935e45','#bf9282','#c59881'][index])};
      shader.vertexShader='attribute float scalp,faceCoverage; varying float hairRegion,coverage; varying vec2 headUV;\n'+shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\nheadUV=uv; hairRegion=scalp;coverage=faceCoverage;');
      shader.fragmentShader='uniform vec3 hairTint,skinTint; varying float hairRegion,coverage; uniform float lidClosure; varying vec2 headUV;\n'+shader.fragmentShader.replace('#include <map_fragment>',`
        #ifdef USE_MAP
          vec2 eye = (headUV - vec2(headUV.x < .5 ? .432 : .563, .525)) / vec2(.044,.028);
          float mask = (1.0-smoothstep(.56,1.0,dot(eye,eye)))*lidClosure;
          vec2 tileSize=vec2(1./3.,${index<5?'.5':'1.'});
          vec4 portraitColour=texture2D(map, vMapUv + vec2(0.,.023*mask)*tileSize);
          vec2 cheek=vec2(.593,.418)+.026*sin(headUV*vec2(31.,23.));
          vec3 sideSkin=texture2D(map,vMapUv+(cheek-headUV)*tileSize).rgb;
          portraitColour.rgb=mix(mix(skinTint,sideSkin,.38),portraitColour.rgb,coverage);
          float fibres=.79+.17*sin(headUV.x*820.+headUV.y*69.)+.09*cos(headUV.y*346.);
          portraitColour.rgb=mix(portraitColour.rgb,hairTint*fibres,hairRegion*.97);
          diffuseColor*=portraitColour;
        #endif`);
    };
    face.customProgramCacheKey=()=>index<5?'family-portrait':'crew-portrait';
    faceMaterials[index]=face;
  }
  const material=faceMaterials[index];
  const template=faceGeometry(index),geo=template.clone();
  const head=new T.Mesh(geo,material);head.scale.setScalar(scale);head.position.copy(center);head.castShadow=true;head.receiveShadow=true;parent.add(head);
  const rest=template.attributes.position,weights=[],indices=[];
  for(let i=0;i<rest.count;i++){
    const w=1-T.MathUtils.smoothstep(rest.getY(i),-.15,-.080);
    if(w>0){indices.push(i);weights.push(w);}
  }
  necks.push({head,rest,weights,indices});
  return head;
}

const wardrobe=[];
export function garment(identity,part,fallback){
  const liner=part==='liner',work=identity>=4&&!liner,denim=part==='leg',knit=!work&&!denim&&(identity===2||identity===3);
  const tile=denim?0:work?1:knit?2:3;
  const mat=new T.MeshStandardMaterial({color:fallback,roughness:denim?.94:.85,side:T.DoubleSide});
  // Surface coordinates stay attached to the cut fabric while it deforms.
  mat.onBeforeCompile=s=>{
    s.vertexShader='varying vec3 cut;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ncut=position;');
    const reference=work?(denim?.54:.92):(denim?.39:.295);
    s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',`#ifdef USE_MAP
      vec3 pigment=texture2D(map,vMapUv).rgb;
      float value=dot(pigment,vec3(.24,.57,.19));
      #endif`);
    s.fragmentShader='varying vec3 cut;\n'+s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      ${work?`float chest=smoothstep(.16,.175,cut.y);
        vec3 dye=vec3(${identity%3===1?'0.47,0.52,0.073':identity%3===2?'0.54,0.22,0.032':'0.73,0.27,0.039'});
        ${denim?'diffuseColor.rgb=mix(diffuseColor.rgb,dye,chest);':''}
        float band=1.-smoothstep(.015,.019,abs(cut.y-.313));
        ${denim?'band=max(band,1.-smoothstep(.013,.017,abs(cut.y+.56)));':'band*=smoothstep(.215,.245,abs(cut.x));'}
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.58,.61,.55),band*.91);`:''}
      ${!work&&!denim&&identity===0?`vec2 plaid=cut.xy*23.;vec2 aa=fwidth(plaid)*.8+.012;
        vec2 line=1.-smoothstep(vec2(.09)-aa,vec2(.09)+aa,abs(fract(plaid)-.5));
        diffuseColor.rgb*=1.-.24*line.x-.17*line.y;
        vec2 fine=1.-smoothstep(vec2(.018),.018+aa,abs(fract(plaid+.19)-.5));
        diffuseColor.rgb+=vec3(.034,.027,.018)*max(fine.x,fine.y);`:''}
      #ifdef USE_MAP
        diffuseColor.rgb*=clamp(pow(max(.025,value)/${reference},1.32),.16,1.75);
      #endif
    `);
  };
  mat.customProgramCacheKey=()=>'tailored-'+identity+'-'+part;
  wardrobe.push({tile,mat,outfit:work?'work-overalls':identity<2||liner?'casual-long':'casual-short'});return mat;
}
export function loadWardrobe(onReady){
  loadHair(onReady);
  for(const outfit of new Set(wardrobe.map(item=>item.outfit))){
    new T.TextureLoader().load('./assets/'+outfit+'.jpg',map=>{
      map.anisotropy=4;
      for(const garment of wardrobe)if(garment.outfit===outfit){garment.mat.map=map;garment.mat.needsUpdate=true;}
      onReady();
    });
  }
  new T.ImageLoader().load('./assets/wardrobe-weave.jpg',atlas=>{
    const tiles=Array.from({length:4},(_,i)=>{
      const c=document.createElement('canvas');c.width=c.height=384;
      const ctx=c.getContext('2d');ctx.drawImage(atlas,(i%2)*atlas.width/2+2,Math.floor(i/2)*atlas.height/2+2,atlas.width/2-4,atlas.height/2-4,0,0,384,384);
      const layer=ctx.getImageData(0,0,384,384),pixels=layer.data;
      let total=0;for(let k=0;k<pixels.length;k+=4)total+=.25*pixels[k]+.55*pixels[k+1]+.2*pixels[k+2];
      const average=total/(pixels.length/4);
      for(let k=0;k<pixels.length;k+=4){
        const value=208+(.25*pixels[k]+.55*pixels[k+1]+.2*pixels[k+2]-average)*(i===0?1.7:1.15);
        pixels[k]=pixels[k+1]=pixels[k+2]=value;
      }
      ctx.putImageData(layer,0,0);
      const map=new T.CanvasTexture(c);map.wrapS=map.wrapT=T.RepeatWrapping;map.repeat.set(5,5);map.anisotropy=4;return map;
    });
    for(const {tile,mat} of wardrobe){
      mat.bumpMap=tiles[tile];mat.bumpScale=tile===2?.0013:.00065;mat.needsUpdate=true;
    }
    onReady();
  });
}

export function limbRig(parent,anchor,hinge){
  const socket=new T.Group(),upper=new T.Bone(),lower=new T.Bone();
  socket.position.copy(anchor);lower.position.y=-hinge;
  upper.add(lower);socket.add(upper);parent.add(socket);
  return {upper,lower};
}
