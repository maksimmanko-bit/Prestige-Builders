// Rebuild the local, quantised CC0 anatomy data from MakeHuman's hm08 base.obj.
// Usage: node scripts/prepare-anatomy.mjs path/to/base.obj
import fs from 'node:fs';

const vertices=[],faces={};let group;
for(const line of fs.readFileSync(process.argv[2],'utf8').split(/\r?\n/)){
  const [type,...args]=line.trim().split(/\s+/);
  if(type==='v')vertices.push(args.slice(0,3).map(Number));
  if(type==='g'){group=args[0];faces[group]??=[];}
  if(type==='f')faces[group].push(args.map(f=>Number(f.split('/')[0])-1));
}
function pack(groups,include){
  const mapping=new Map(),coords=[],indices=[];
  for(const key of groups)for(const face of faces[key]){
    if(!face.every(id=>include(...vertices[id])))continue;
    const f=face.map(id=>{
      if(!mapping.has(id)){mapping.set(id,coords.length/3);coords.push(...vertices[id].map(v=>Math.round(v*3000)));}
      return mapping.get(id);
    });
    for(let i=1;i<f.length-1;i++)indices.push(f[0],f[i],f[i+1]);
  }
  return [new Int16Array(coords),new Uint16Array(indices)].map(array=>Buffer.from(array.buffer).toString('base64'));
}
const assets={
  head:pack(['body','helper-r-eye','helper-l-eye'],(x,y)=>y>5.22&&(y>6.1||Math.abs(x)<.91)),
  hand:pack(['body'],(x,y,z)=>x>3.45&&y<3.02&&(x-4.312)*.26-(y-2.452)*.65+(z-1.757)*.716>-.25),
  underlayer:pack(['body'],(x,y,z)=>y>1.5&&y<6.1&&(Math.abs(x)-4.312)*.26-(y-2.452)*.65+(z-1.757)*.716<.07)
};
fs.writeFileSync(new URL('../assets/anatomy.js',import.meta.url),'// Adapted from MakeHuman hm08, CC0. See README.md.\nexport default '+JSON.stringify(assets)+';\n');
