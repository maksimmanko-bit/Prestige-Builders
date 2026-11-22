// Usage: node scripts/prepare-wardrobe.mjs path/to/base.obj path/to/system-assets
// The second directory contains the original CC0 OBJ and MHClO pairs.
import fs from 'node:fs';
import path from 'node:path';

const [baseFile,folder]=process.argv.slice(2);
const lines=file=>fs.readFileSync(file,'utf8').split(/\r?\n/);
const numbers=line=>line.trim().split(/\s+/).map(Number);
const base=lines(baseFile).filter(s=>s.startsWith('v ')).map(s=>numbers(s.slice(2)));
const names=['male_worksuit01','male_casualsuit02','female_casualsuit01','short02','ponytail01','shoes05'];
const b64=a=>Buffer.from(a.buffer).toString('base64');
const result={};
for(const name of names){
  const vertices=[],uv=[],faces=[];
  for(const line of lines(path.join(folder,name+'.obj'))){
    if(line.startsWith('v '))vertices.push(numbers(line.slice(2)));
    if(line.startsWith('vt '))uv.push(numbers(line.slice(3)));
    if(line.startsWith('f '))faces.push(line.slice(2).trim().split(/\s+/).map(p=>p.split('/').slice(0,2).map(k=>Number(k)-1)));
  }
  const fit=name==='shoes05'?[]:lines(path.join(folder,name+'.mhclo')),scale=[1,1,1];
  for(const line of fit){
    const match=line.match(/^([xyz])_scale\s+(\d+)\s+(\d+)\s+([\d.]+)/);
    if(match){const axis='xyz'.indexOf(match[1]);scale[axis]=Math.abs(base[match[2]][axis]-base[match[3]][axis])/Number(match[4]);}
  }
  const coords=!fit.length?vertices:fit.slice(fit.findIndex(l=>/^verts\s/.test(l))+1).filter(l=>/^\s*\d/.test(l)).slice(0,vertices.length).map(l=>{
    const a=numbers(l);
    if(a.length===1)return base[a[0]];
    if(a.length<9)throw Error('Missing fit coordinates in '+name);
    return [0,1,2].map(k=>a[6+k]*scale[k]+base[a[0]][k]*a[3]+base[a[1]][k]*a[4]+base[a[2]][k]*a[5]);
  });
  if(coords.length!==vertices.length)throw Error('Incomplete fit for '+name);
  // Keep separate garment pieces (shirt, trousers, pockets etc.) for material
  // assignment. UV seams use split render vertices, not disconnected pieces.
  const parent=coords.map((_,i)=>i);
  function find(id){while(parent[id]!==id){parent[id]=parent[parent[id]];id=parent[id];}return id;}
  for(const f of faces)for(const [v] of f)parent[find(v)]=find(f[0][0]);
  const components=new Map();
  for(const face of faces){
    const id=find(face[0][0]);if(!components.has(id))components.set(id,[]);
    components.get(id).push(face);
  }
  const parts=[...components.values()].sort((a,b)=>b.length-a.length);
  const xyz=[],tex=[],tri=[],ranges=[],mapped=new Map();
  for(const [part,polygons] of parts.entries()){
    const start=tri.length,min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
    for(const polygon of polygons){
      const corners=polygon.map(([v,u])=>{
        const key=v+'/'+u;
        if(!mapped.has(key)){
          mapped.set(key,xyz.length/3);xyz.push(...coords[v].map(n=>Math.round(n*3000)));
          tex.push(...uv[u].slice(0,2).map(n=>Math.round(n*8192)));
        }
        for(let k=0;k<3;k++){min[k]=Math.min(min[k],coords[v][k]);max[k]=Math.max(max[k],coords[v][k]);}
        return mapped.get(key);
      });
      for(let j=1;j<corners.length-1;j++)tri.push(corners[0],corners[j],corners[j+1]);
    }
    ranges.push([start,tri.length-start]);
    if(part<12)console.log(name,part,polygons.length,min.map(n=>n.toFixed(1)).join(','),max.map(n=>n.toFixed(1)).join(','));
  }
  result[name]=[b64(new Int16Array(xyz)),b64(new Uint16Array(tri)),b64(new Int16Array(tex)),ranges];
}
fs.writeFileSync(new URL('../assets/tailoring.js',import.meta.url),'// MakeHuman system assets, CC0. See README.md.\nexport default '+JSON.stringify(result)+';\n');
