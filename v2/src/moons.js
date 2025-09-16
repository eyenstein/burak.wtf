const MOON_COLORS = ['#FFD75A','#FFA500','#FF3B30','#7B1E7A','#4DA3FF','#00FF7F'];

function yinYangMaterial(){
  return new THREE.ShaderMaterial({
    transparent:true, depthWrite:false, blending:THREE.AdditiveBlending,
    uniforms:{ uGain:{value:1.0}, uAlpha:{value:1.0} },
    vertexShader:`
      uniform float uGain, uAlpha;
      void main(){
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        float base = 28.0, boost = 20.0 * clamp(uGain/8.0, 0.0, 1.0);
        float distScale = (300.0 / -gl_Position.z);
        gl_PointSize = (base + boost) * distScale;
      }`,
    fragmentShader:`
      precision highp float; uniform float uAlpha;
      void main(){
        vec2 uv = gl_PointCoord*2.0 - 1.0;
        float r2 = dot(uv,uv); if (r2 > 1.0) discard;
        float aEdge = smoothstep(1.0, 0.80, r2);
        vec3 col = vec3(1.0);
        float a = aEdge * uAlpha;
        gl_FragColor = vec4(col * a, a);
      }`
  });
}

function moonMaterial(i){
  if (i === 6) return yinYangMaterial();
  const col = new THREE.Color(MOON_COLORS[i % MOON_COLORS.length]);
  return new THREE.ShaderMaterial({
    transparent:true, depthWrite:false, blending:THREE.AdditiveBlending,
    uniforms:{ uGain:{value:1.0}, uAlpha:{value:1.0}, uColor:{value:col} },
    vertexShader:`
      uniform float uGain, uAlpha;
      void main(){
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        float base = 24.0, boost = 16.0 * clamp(uGain/8.0, 0.0, 1.0);
        float distScale = (300.0 / -gl_Position.z);
        gl_PointSize = (base + boost) * distScale;
      }`,
    fragmentShader:`
      precision highp float; uniform vec3 uColor; uniform float uAlpha;
      void main(){
        vec2 uv = gl_PointCoord*2.0 - 1.0;
        float r2 = dot(uv,uv); if (r2 > 1.0) discard;
        float a = exp(-r2*4.5) * uAlpha;
        gl_FragColor = vec4(uColor * a, a);
      }`
  });
}

export function initMoons(scene){
  const group = new THREE.Group();
  scene.add(group);
  return { group, list:[], radius:0.42, alpha:1.0 };
}

export function rebuildMoons(state, radius, alpha, count){
  state.list.forEach(m=>{ state.group.remove(m.mesh); m.mesh.geometry.dispose(); m.mesh.material.dispose(); });
  state.list = [];
  const n = parseInt(count ?? 3, 10);
  for(let i=0;i<n;i++){
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3), 3));
    const mat = moonMaterial(i===6?6:i);
    const mesh = new THREE.Points(geo, mat);
    mesh.renderOrder = 3;

    const seed = Math.random()*1000;
    const baseR = radius * (1.35 + 0.35*Math.random());
    const baseW = 0.40 + Math.random()*0.60;
    const phase= Math.random()*Math.PI*2;

    const tiltAmp = 0.55;
    const tiltSpeedX = 0.05 + Math.random()*0.07;
    const tiltSpeedY = 0.05 + Math.random()*0.07;

    state.list.push({ mesh, seed, baseR, baseW, phase, tiltAmp, tiltSpeedX, tiltSpeedY });
    state.group.add(mesh);
    if (mesh.material.uniforms.uAlpha) mesh.material.uniforms.uAlpha.value = alpha;
  }
  state.radius = radius; state.alpha = alpha;
}

export function updateMoons(state, t, gBreath, alpha){
  state.list.forEach((m)=>{
    const pos = m.mesh.geometry.attributes.position.array;
    const speedScale = 0.8 + Math.min(Math.log(1.0+gBreath), 2.0);
    const th = m.phase + t * m.baseW * speedScale;

    const tx = Math.sin(t*m.tiltSpeedX + m.seed) * m.tiltAmp;
    const ty = Math.sin(t*m.tiltSpeedY + m.seed*1.37) * m.tiltAmp;

    let x = Math.cos(th) * m.baseR * 1.18;
    let y = Math.sin(th) * m.baseR * 1.18;
    let z = 0.0;

    const x1 =  x*Math.cos(ty) + z*Math.sin(ty);
    const z1 = -x*Math.sin(ty) + z*Math.cos(ty);
    const y2 =  y*Math.cos(tx) - z1*Math.sin(tx);
    const z2 =  y*Math.sin(tx) + z1*Math.cos(tx);

    pos[0]=x1; pos[1]=y2; pos[2]=z2 * 0.22;
    m.mesh.geometry.attributes.position.needsUpdate = true;

    if (m.mesh.material.uniforms.uGain)  m.mesh.material.uniforms.uGain.value  = gBreath;
    if (m.mesh.material.uniforms.uAlpha) m.mesh.material.uniforms.uAlpha.value = alpha;
  });
}
