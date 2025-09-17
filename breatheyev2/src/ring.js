export function initRing(scene){
  const PLANE_SIZE = 2.9;
  const planeGeo = new THREE.PlaneGeometry(PLANE_SIZE, PLANE_SIZE, 1, 1);
  const COLOR = '#FFD75A';

  const mat = new THREE.ShaderMaterial({
    transparent:true, depthWrite:false, blending:THREE.AdditiveBlending,
    uniforms:{
      uTime:{value:0}, uRadius:{value:0.42}, uWidth:{value:3.2},
      uGain:{value:1.0}, uAlpha:{value:1.0}, uColor:{value:new THREE.Color(COLOR)}
    },
    vertexShader:`varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader:`
      precision highp float; varying vec2 vUv;
      uniform float uTime,uRadius,uWidth,uGain,uAlpha; uniform vec3 uColor;
      void main(){
        vec2 p = vUv - 0.5; float r = length(p) * 2.0;
        float inner = 1.0 - smoothstep(uRadius - (1.0/uWidth), uRadius, r);
        float outer = smoothstep(uRadius, uRadius + (0.9/uWidth), r);
        float ring  = inner * (1.0 - outer);
        float a = ring * uGain * uAlpha;
        vec3  c = uColor * (0.98 + 0.02*sin(uTime*2.0));
        gl_FragColor = vec4(c*a, a);
        if(gl_FragColor.a < 0.001) discard;
      }`
  });

  const mesh = new THREE.Mesh(planeGeo, mat);
  mesh.renderOrder = 2;
  const group = new THREE.Group();
  group.add(mesh);
  scene.add(group);

  return Object.assign(mat, { planeSize: PLANE_SIZE, mesh, group, uniforms: mat.uniforms });
}
