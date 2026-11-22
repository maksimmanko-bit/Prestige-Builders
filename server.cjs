const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.jpg':'image/jpeg','.hdr':'application/octet-stream'};
const files=new Set(['index.html','page.js','roof-camera.js','assets/finish-selection.jpg','style.css','scene.js','anatomy.js','assets/anatomy.js','assets/osb.jpg','assets/mineral-wool.jpg','assets/cast-concrete.jpg','assets/fleet-enamel.jpg','framing.js','site-work.js','concrete.js','wall-trades.js','garage.js','materials.js','landscape.js','construction.js','story.js','people.js','assets/portraits.jpg','assets/workwear.jpg','assets/spruce.jpg','assets/concrete.jpg','assets/enamel.jpg','assets/stucco.jpg','assets/oak.jpg','assets/cedar.jpg','assets/limestone.jpg','assets/lawn.jpg','assets/linen.jpg','assets/shingle.jpg','assets/prairie-daylight.jpg','assets/site-gravel.jpg','homecoming.js','vendor/three.module.js','vendor/three.core.js','assets/venice-sunset-1k.hdr']);
types['.png']='image/png';
types['.mp4']='video/mp4';
types['.webp']='image/webp';
files.add('construction-backdrop.js');
files.add('assets/wall-inspection.webp');
for(const name of ['landscape','foundation','deck','bare','walls','frame','envelope','cladding','complete']){
  files.add('assets/woodland/'+name+'.webp');
  files.add('assets/woodland/'+name+'-sm.webp');
}
for(const name of ['wall-lift','rig'])files.add('assets/woodland/'+name+'.webp');
for(const room of ['kitchen','living','entry','facade','roof','new-build']){
  for(const stage of ['before','after'])files.add('assets/restoration/'+room+'-'+stage+'.webp');
}
for(const asset of ['assets/site-build.mp4','assets/site-build-start.jpg','assets/site-build-finished.jpg'])files.add(asset);
for(const asset of ['footsteps.js','assets/wardrobe-weave.jpg','assets/tailoring.js','assets/casual-long.jpg','assets/casual-short.jpg','assets/work-overalls.jpg','assets/hair-short.png','assets/hair-tied.png','assets/crew-faces.jpg'])files.add(asset);
http.createServer((req,res)=>{
  let name;try{name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||'index.html';}catch{res.writeHead(400);return res.end();}
  const absolute=path.resolve(__dirname,name),addonRoot=path.resolve(__dirname,'vendor/addons')+path.sep;
  if(!files.has(name)&&!(name.startsWith('vendor/addons/')&&name.endsWith('.js')&&absolute.startsWith(addonRoot))){res.writeHead(404);return res.end('Not found');}
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405,{Allow:'GET, HEAD'});return res.end();}
  fs.stat(absolute,(err,stat)=>{
    if(err||!stat.isFile()){res.writeHead(404);return res.end('Not found');}
    const size=stat.size,headers={'Content-Type':types[path.extname(name)],'Cache-Control':'no-cache','Accept-Ranges':'bytes'};
    let start=0,end=size-1,status=200;
    if(req.headers.range){
      const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
      if(match&&(match[1]||match[2])){
        if(match[1]){start=Number(match[1]);end=match[2]?Math.min(end,Number(match[2])):end;}
        else start=Math.max(0,size-Number(match[2]));
      }else start=size;
      if(start>=size||end<start){res.writeHead(416,{...headers,'Content-Range':'bytes */'+size});return res.end();}
      status=206;headers['Content-Range']='bytes '+start+'-'+end+'/'+size;
    }
    headers['Content-Length']=end-start+1;res.writeHead(status,headers);
    if(req.method==='HEAD'||size===0)return res.end();
    const stream=fs.createReadStream(absolute,{start,end});
    stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);
  });
}).listen(4173,'127.0.0.1',()=>console.log('Preview: http://127.0.0.1:4173'));
