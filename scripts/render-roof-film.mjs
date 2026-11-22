// Offline export of the same animated rig and house used in the interactive tour.
// CHROME_BIN and FFMPEG_BIN can select locally installed executables.
import http from 'node:http';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';

const root=fileURLToPath(new URL('../',import.meta.url));
const preview=process.argv.includes('--preview');
const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'prestige-roof-'));
const access=randomBytes(16).toString('hex');
const width=preview?768:1280,height=preview?432:720;
const frames=preview?[10,51,118,166,194,224,279]:Array.from({length:288},(_,i)=>i);
const chrome=process.env.CHROME_BIN||'C:/Program Files/Google/Chrome/Application/chrome.exe';
const ffmpeg=process.env.FFMPEG_BIN||'C:/Program Files/Tongbu/Codes/ffmpeg.exe';
const basename=f=>String(f).padStart(3,'0')+'.jpg';
let finish,fail;
const done=new Promise((resolve,reject)=>{finish=resolve;fail=reject;});
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.hdr':'application/octet-stream','.jpg':'image/jpeg'};
const receiver='/frames/'+access;

const capture=`
playing=false;turning=false;
async function exportFrames(){
  await window.texturesReady;
  renderer.setPixelRatio(1);renderer.setSize(${width},${height},false);
  camera.aspect=${width}/${height};renderer.shadowMap.autoUpdate=true;
  const {createFilmPass}=await import('./scripts/film-optics.js');
  const exposeFrame=createFilmPass(renderer,scene,camera,target);
  for(const frame of ${JSON.stringify(frames)}){
    const t=frame/287;
    progress=(.50+.30*t)*.665*100;apply();
    frameRoofLift(camera,target,t);
    camera.updateProjectionMatrix();camera.lookAt(target);
    exposeFrame();
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.96));
    const result=await fetch('${receiver}/'+frame,{method:'POST',body:blob});
    if(!result.ok)throw Error('Could not write frame '+frame);
  }
}
exportFrames().catch(e=>fetch('${receiver}/error',{method:'POST',body:String(e.stack||e)}));`;
const server=http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost');
    if(req.method==='POST'&&url.pathname.startsWith(receiver+'/')){
      const id=url.pathname.slice(receiver.length+1),parts=[];
      for await(const piece of req)parts.push(piece);
      if(id==='error')throw Error(Buffer.concat(parts).toString());
      const frame=Number(id);
      if(!frames.includes(frame))throw Error('Unexpected frame');
      await fs.writeFile(path.join(tmp,basename(frame)),Buffer.concat(parts));
      res.end('ok');
      if(preview||frame%48===0)console.log('Frame',frame);
      if(frame===frames.at(-1))finish();
      return;
    }
    if(req.method!=='GET'){res.writeHead(405);res.end();return;}
    if(url.pathname==='/'){
      let html=await fs.readFile(path.join(root,'scripts','roof-render.html'),'utf8');
      html=html.replace(/<script type="module" src="[^"]+"><\/script>/g,'');
      html=html.replace('</head>',`<style>.scene-window canvas{width:${width}px!important;height:${height}px!important}.tour-details{display:block}</style></head>`);
      html=html.replace('</body>',`<script type="module">import {DefaultLoadingManager} from 'three';document.querySelectorAll('details').forEach(d=>d.open=true);window.texturesReady=new Promise(r=>DefaultLoadingManager.onLoad=r);import('./scene.js').catch(e=>fetch('${receiver}/error',{method:'POST',body:e.stack}));</script></body>`);
      res.setHeader('Content-Type','text/html');res.end(html);return;
    }
    const name=decodeURIComponent(url.pathname.slice(1));
    const file=path.resolve(root,name);
    if(!file.startsWith(path.resolve(root)+path.sep))throw Error('Invalid resource');
    const mime=types[path.extname(name)];
    if(!mime){res.writeHead(404);res.end();return;}
    let data=await fs.readFile(file);
    if(name==='scene.js')data=Buffer.concat([data,Buffer.from('\n'+capture)]);
    res.setHeader('Content-Type',mime);res.end(data);
  }catch(e){res.writeHead(500);res.end();if(req.method==='POST')fail(e);}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
console.log('Frames:',tmp);
const url='http://127.0.0.1:'+server.address().port+'/';
const browser=spawn(chrome,['--headless','--no-first-run','--disable-extensions','--disable-background-networking','--disable-background-timer-throttling','--disable-renderer-backgrounding','--user-data-dir='+path.join(tmp,'profile'),'--window-size='+width+','+height,url],{windowsHide:true,stdio:['ignore','ignore','pipe']});
let errors='';
browser.stderr.on('data',d=>errors=(errors+d).slice(-4500));
browser.on('error',fail);browser.on('exit',code=>fail(Error('Renderer exited: '+code+' '+errors)));
const watchdog=setTimeout(()=>fail(Error('Renderer timeout: '+errors)),preview?150000:1200000);
try{
  await done;
  if(!preview){
    const poster=path.join(root,'assets','roof-lift.jpg'),movie=path.join(root,'assets','roof-lift.mp4');
    const encoded=path.join(tmp,'film.mp4');
    const args=['-y','-r','24','-i',path.join(tmp,'%03d.jpg'),'-an','-vcodec','libx264','-b','4800k','-g','24','-qmin','12','-qmax','34','-qdiff','4','-me_method','hex','-coder','1','-flags','+loop','-partitions','+parti4x4+partp8x8','-refs','2','-subq','6','-pix_fmt','yuv420p',encoded];
    await new Promise((ok,bad)=>{const encoder=spawn(ffmpeg,args,{windowsHide:true,stdio:'ignore'});encoder.on('error',bad);encoder.on('exit',c=>c===0?ok():bad(Error('Encoder exited: '+c)));});
    await fs.copyFile(encoded,movie);await fs.copyFile(path.join(tmp,basename(194)),poster);
    console.log('Rendered 288 frames, 1280 x 720, 24 fps.',movie);
  }
}finally{clearTimeout(watchdog);browser.kill();server.close();}
