// --- PWA install UI (Android/Chrome destekli beforeinstallprompt) ---
let deferredPrompt = null;
const installBtn = document.getElementById('installBtn');
const iosModal = document.getElementById('iosModal');
const iosClose = document.getElementById('iosClose');

function isStandalone() {
  // iOS Safari: window.navigator.standalone; PWA: display-mode media query
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}
function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}
function isSafari() {
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes('safari') && !ua.includes('crios') && !ua.includes('fxios') && !ua.includes('chrome');
}

// Standalone ise düğmeye gerek yok
if (!isStandalone()) {
  // Android/Chrome ise beforeinstallprompt yakala
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.hidden = false;
  });

  // iOS Safari ise rehber göstermek için düğmeyi aç
  if (isIOS() && isSafari()) {
    installBtn.hidden = false;
  }
}

// Düğme davranışı: Android → prompt, iOS → modal
installBtn?.addEventListener('click', async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    installBtn.hidden = true;
  } else if (isIOS() && isSafari()) {
    iosModal.classList.add('open');
  }
});

iosClose?.addEventListener('click', () => iosModal.classList.remove('open'));
iosModal?.addEventListener('click', (e) => {
  if (e.target === iosModal) iosModal.classList.remove('open');
});

// --- Service worker ---
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js');
}

// --- UI/state ---
const els = {
  minR: document.getElementById('minR'),
  maxR: document.getElementById('maxR'),
  inS:  document.getElementById('inS'),
  hiS:  document.getElementById('hiS'),
  outS: document.getElementById('outS'),
  hoS:  document.getElementById('hoS'),
  reset:document.getElementById('reset'),
  canvas:document.getElementById('canvas'),
};

const ctx = els.canvas.getContext('2d');
const stateKey = 'lightRingPWA.v1';

function loadState(){
  try {
    const s = JSON.parse(localStorage.getItem(stateKey) || '{}');
    for (const k of Object.keys(els)) {
      if (els[k] && 'value' in els[k] && s[k] != null) els[k].value = s[k];
    }
  } catch {}
}
function saveState(){
  const s = {};
  ['minR','maxR','inS','hiS','outS','hoS'].forEach(k => s[k] = +els[k].value);
  localStorage.setItem(stateKey, JSON.stringify(s));
}
function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }

loadState();
for (const id of ['minR','maxR','inS','hiS','outS','hoS']) {
  els[id].addEventListener('input', () => {
    if (+els.minR.value > +els.maxR.value) {
      els.minR.value = els.maxR.value;
    }
    saveState();
  });
}
els.reset.addEventListener('click', () => {
  els.minR.value = 20; els.maxR.value = 220;
  els.inS.value  = 5;  els.hiS.value  = 0;
  els.outS.value = 5;  els.hoS.value  = 0;
  saveState();
});

// --- Canvas sizing ---
function resize(){
  const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  els.canvas.width  = Math.floor(els.canvas.clientWidth * dpr);
  els.canvas.height = Math.floor(els.canvas.clientHeight * dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);
}
addEventListener('resize', resize);
resize();

// --- Breathing timeline ---
let t0 = performance.now();
function cycleDur(){
  const IN  = +els.inS.value;
  const HI  = +els.hiS.value;
  const OUT = +els.outS.value;
  const HO  = +els.hoS.value;
  return (IN + HI + OUT + HO) * 1000;
}
function phaseInfo(tMs){
  const IN  = +els.inS.value * 1000;
  const HI  = +els.hiS.value * 1000;
  const OUT = +els.outS.value * 1000;
  const HO  = +els.hoS.value * 1000;
  let x = tMs % (IN+HI+OUT+HO || 1);
  if (x < IN)          return ['in',   x/IN];
  x -= IN;
  if (x < HI)          return ['holdIn', x/HI || 0];
  x -= HI;
  if (x < OUT)         return ['out',  x/OUT];
  x -= OUT;
  return ['holdOut', x/HO || 0];
}
function lerp(a,b,t){ return a + (b-a)*t; }

// --- Draw ring ---
function draw(){
  const w = els.canvas.clientWidth;
  const h = els.canvas.clientHeight;
  ctx.clearRect(0,0,w,h);

  const minR = +els.minR.value;
  const maxR = +els.maxR.value;

  const now = performance.now();
  const [phase, ft] = phaseInfo(now - t0);

  let r;
  if (phase === 'in')       r = lerp(minR, maxR, ft);
  else if (phase === 'holdIn')  r = maxR;
  else if (phase === 'out') r = lerp(maxR, minR, ft);
  else                      r = minR;

  const k = (r - minR) / Math.max(1, (maxR - minR)); // 0..1
  const glow = 10 + 60 * k; // px
  const line = 2 + 4 * (1-k);

  ctx.save();
  ctx.translate(w/2, h/2);

  const grad = ctx.createRadialGradient(0,0, r*0.7, 0,0, r + glow*2);
  grad.addColorStop(0, `rgba(255,255,255,${0.18 + 0.22*k})`);
  grad.addColorStop(1, `rgba(255,255,255,0)`);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0,0, r + glow*2, 0, Math.PI*2);
  ctx.fill();

  const grad2 = ctx.createRadialGradient(0,0, 0, 0,0, r);
  grad2.addColorStop(0, `rgba(255,255,255,${0.12 + 0.18*k})`);
  grad2.addColorStop(1, `rgba(255,255,255,0)`);
  ctx.fillStyle = grad2;
  ctx.beginPath();
  ctx.arc(0,0, r, 0, Math.PI*2);
  ctx.fill();

  ctx.strokeStyle = `rgba(255,255,255,${0.85})`;
  ctx.lineWidth = line;
  ctx.beginPath();
  ctx.arc(0,0, r, 0, Math.PI*2);
  ctx.stroke();

  ctx.restore();

  requestAnimationFrame(draw);
}
requestAnimationFrame(draw);
