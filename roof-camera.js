import { ease } from './story.js';

// Lens positions, cut timing and optical targets are shared by the film and the live build.
export function frameRoofLift(camera,target,t,aspect=16/9){
    // Match cuts follow the same truss from the ground to the installed bearings.
    if(t<.18){
      camera.position.set(4.02+t*.85,1.56,10.06-t*.7);
      target.set(6.95,1.04,6.85);camera.fov=36;
    }else if(t<.645){
      const pan=ease(t,.31,.64);
      camera.position.set(1.98+pan*1.20,3.62+pan*.42,17.45-pan*1.2);
      target.set(6.54,2.58+pan*.69,4.67-pan*1.23);camera.fov=39;
    }else if(t<.746){
      camera.position.set(2.26,4.22,8.90);target.set(4.94,3.35,1.24);camera.fov=38;
    }else if(t<.898){
      camera.position.set(8.98,3.72,-1.14);target.set(7.76,3.06,1.29);camera.fov=40;
    }else{
      camera.position.set(2.94,4.05,16.10);target.set(6.05,3.22,2.29);camera.fov=38;
    }
  if(aspect<1.3)camera.fov=Math.min(79,camera.fov*1.45);
}
