import * as THREE from '../vendor/three.module.js';

export function createFilmPass(renderer,scene,camera,target){
  const canvas=renderer.domElement;
  const w=canvas.width,h=canvas.height;
  const buffer=new THREE.WebGLRenderTarget(w,h,{type:THREE.HalfFloatType,samples:2});
  buffer.depthTexture=new THREE.DepthTexture(w,h,THREE.UnsignedIntType);
  const lens=new THREE.ShaderMaterial({
    uniforms:{colour:{value:buffer.texture},depth:{value:buffer.depthTexture},
      pixel:{value:new THREE.Vector2(1/w,1/h)},focus:{value:5},near:{value:camera.near},far:{value:camera.far}},
    vertexShader:'varying vec2 v;void main(){v=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:`
      varying vec2 v;uniform sampler2D colour,depth;uniform vec2 pixel;uniform float near,far,focus;
      float meters(vec2 uv){float z=texture2D(depth,uv).r;return near*far/(far-z*(far-near));}
      void main(){
        float d=meters(v);float coc=clamp(abs(1.-focus/d)*8./max(1.,focus*.20),0.,5.);
        vec3 col=texture2D(colour,v).rgb;float total=1.;
        for(int i=0;i<20;i++){
          float n=float(i)+.5,a=n*2.3999632;vec2 disk=vec2(cos(a),sin(a))*sqrt(n/20.);
          vec2 uv=v+disk*pixel*coc;float z=meters(uv);
          float w=.15+.85*smoothstep(-.28,.05,z-d);
          col+=texture2D(colour,uv).rgb*w;total+=w;
        }
        col/=total;
        float ao=0.;
        for(int i=0;i<8;i++){
          float a=float(i)*2.3999632;vec2 shift=vec2(cos(a),sin(a))*pixel*(3.+float(i))*(8./max(d,3.));
          float delta=d-meters(v+shift);ao+=smoothstep(.018,.14,delta)*(1.-smoothstep(.15,.65,delta));
        }
        col*=1.-ao*.028;
        float edge=pow(clamp(1.-dot(v-.5,v-.5)*.45,.7,1.),1.05);
        gl_FragColor=vec4(col*edge,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
  const screenScene=new THREE.Scene(),screenCamera=new THREE.Camera();
  screenScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),lens));
  function exposeFrame(){
    lens.uniforms.focus.value=camera.position.distanceTo(target);
    renderer.setRenderTarget(buffer);renderer.render(scene,camera);
    renderer.setRenderTarget(null);renderer.render(screenScene,screenCamera);
  }
  return exposeFrame;
}
