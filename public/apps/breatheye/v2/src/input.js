export function attachInputs(canvas, camera, { onPress, onRelease }){
  let yaw=0, pitch=0, yawVel=0, pitchVel=0;
  let isDown=false, lastX=0, lastY=0, lastMoveT=performance.now();
  let distance = 3;
  const DRIVE=14.0, MAX_V=14.0;
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));

  function step(dt){
    const decay=Math.exp(-0.95*dt);
    yawVel*=decay; pitchVel*=decay;
    yaw += yawVel*dt; pitch += pitchVel*dt;
    pitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, pitch));
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, 0));
    const v = new THREE.Vector3(0,0,1).applyQuaternion(q).multiplyScalar(distance);
    camera.position.copy(v);
    camera.lookAt(0,0,0);
  }

  function pointerXY(e){ if('clientX'in e) return [e.clientX,e.clientY]; if('touches'in e&&e.touches.length) return [e.touches[0].clientX,e.touches[0].clientY]; return [0,0]; }

  canvas.addEventListener('pointerdown',(e)=>{
    isDown=true; canvas.setPointerCapture(e.pointerId);
    [lastX,lastY]=pointerXY(e); lastMoveT=performance.now();
    onPress && onPress();
  });
  canvas.addEventListener('pointermove',(e)=>{
    if(!isDown) return;
    const [x,y]=pointerXY(e); const now=performance.now();
    let dt=(now-lastMoveT)/1000; if(dt<=0) dt=1/120;
    const dx=(x-lastX)/innerWidth, dy=(y-lastY)/innerHeight;
    lastX=x; lastY=y; lastMoveT=now;
    const k=Math.PI;
    const tYaw=clamp((-dx*k)/dt,-MAX_V,MAX_V);
    const tPit=clamp((-dy*k*0.7)/dt,-MAX_V,MAX_V);
    const a=1.0-Math.exp(-DRIVE*dt);
    yawVel+=(tYaw-yawVel)*a; pitchVel+=(tPit-pitchVel)*a;
  });
  canvas.addEventListener('pointerup',(e)=>{ isDown=false; canvas.releasePointerCapture(e.pointerId); onRelease && onRelease(); });

  addEventListener('wheel',(e)=>{ distance+=Math.sign(e.deltaY)*0.15; distance=clamp(distance,1.4,6.0); },{passive:true});
  let pinchStart=0;
  canvas.addEventListener('touchstart',(e)=>{ 
    if(e.touches.length===2){ const dx=e.touches[0].clientX-e.touches[1].clientX; const dy=e.touches[0].clientY-e.touches[1].clientY; pinchStart=Math.hypot(dx,dy);}
  },{passive:true});
  canvas.addEventListener('touchmove',(e)=>{ 
    if(e.touches.length===2){ const dx=e.touches[0].clientX-e.touches[1].clientX; const dy=e.touches[0].clientY-e.touches[1].clientY; const d=Math.hypot(dx,dy); const s=(pinchStart>0)?(pinchStart/d):1.0; distance=clamp(distance*s,1.4,6.0); pinchStart=d; }
  },{passive:true});

  return { step, get distance(){ return distance; } };
}
