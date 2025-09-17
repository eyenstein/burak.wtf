import { initRing }   from './ring.js';
import { initMoons, updateMoons, rebuildMoons } from './moons.js';
import { computeBreathGain, getRationalTimes } from './breathing.js';
import { Boost } from './boost.js';
import { attachInputs } from './input.js';
import { hookUI, updateUIValues } from './ui.js';

const canvas = document.getElementById('stage');

const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.setClearColor(0x000000, 1);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, innerWidth/innerHeight, 0.01, 100);
camera.position.set(0, 0, 3);

// groups + materials
const ring = initRing(scene);
const moonsState = initMoons(scene);

// UI
const ui = hookUI({
  onMoonCount:()=> rebuildMoons(moonsState, ring.uniforms.uRadius.value, uiOpacity(), ui.moonCount()),
  onAny:()=> updateUIValues(ui)
});
function uiOpacity(){ return 1.0; } // ring opacity sabit, moona gönderiyoruz
updateUIValues(ui);
rebuildMoons(moonsState, ring.uniforms.uRadius.value, uiOpacity(), ui.moonCount()); // açılışta oluştur

// inputs
const boost = new Boost(ui);
const orbit = attachInputs(canvas, camera, { onPress: ()=>boost.start(), onRelease: ()=>boost.end() });

// helper: yüzde → uRadius
function fracToURadius(frac, distance, uWidth, planeSize){
  const h = 2 * distance * Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5));
  const w = h * camera.aspect;
  const targetWorldDia = frac * Math.min(w,h);
  const edge = 0.9 / uWidth;
  return Math.max(0.02, (targetWorldDia / planeSize) - edge);
}

// loop
const clock = new THREE.Clock();
function tick(){
  const t  = clock.getElapsedTime();
  const dt = clock.getDelta();

  orbit.step(dt);

  // breath timing (manual or rational)
  let tin = ui.tin(), thold = ui.thold(), tout = ui.tout(), bhold = ui.bhold();
  if (ui.rationalOn()){
    ({ tin, thold, tout, bhold } = getRationalTimes(ui.rationalUnits()));
  }

  const lo = ui.glo(), hi = ui.ghi();
  let gBreath = computeBreathGain(t, tin, thold, tout, bhold, lo, hi);

  // 0..1 normalize for size drive
  const breathU = THREE.MathUtils.clamp((gBreath - lo) / Math.max(1e-6, (hi - lo)), 0, 1);

  // min/max yüzdeleri ve base shift
  const baseShift = ui.sizeBase() / 100;
  const minFrac0 = ui.sizeMin() / 100;
  const maxFrac0 = ui.sizeMax() / 100;
  const fLo = Math.max(0.02, Math.min(0.95, Math.min(minFrac0, maxFrac0) + baseShift));
  const fHi = Math.max(0.02, Math.min(0.95, Math.max(minFrac0, maxFrac0) + baseShift));

  const uMin = fracToURadius(fLo, orbit.distance, ring.uniforms.uWidth.value, ring.planeSize);
  const uMax = fracToURadius(fHi, orbit.distance, ring.uniforms.uWidth.value, ring.planeSize);

  // lineer geçiş
  let uRadiusTarget = THREE.MathUtils.lerp(uMin, uMax, breathU);

  // press-to-boost
  const now = performance.now();
  const boostMul = boost.mult(now);
  const boostAdd = boost.radiusAdd(now);
  gBreath *= boostMul;
  uRadiusTarget = Math.min(uRadiusTarget + boostAdd, 0.95);

  // smooth
  ring.uniforms.uRadius.value += (uRadiusTarget - ring.uniforms.uRadius.value) * (1.0 - Math.exp(-6*dt));

  // visuals
  ring.uniforms.uGain.value = gBreath;
  ring.uniforms.uTime.value = t;

  // moons
  updateMoons(moonsState, t, gBreath, uiOpacity());

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
tick();

// resize
addEventListener('resize', ()=>{
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth/innerHeight;
  camera.updateProjectionMatrix();
});
