// --- Yükleme (Install) düğmesi mantığı ---
let deferredPrompt = null;
const installBtn = document.getElementById('installBtn');
const helpModal  = document.getElementById('installHelp');
const helpClose  = document.getElementById('helpClose');

function isStandalone(){
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}
function isIOS(){ return /iphone|ipad|ipod/i.test(navigator.userAgent); }
function isSafari(){
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes('safari') && !ua.includes('crios') && !ua.includes('fxios') && !ua.includes('chrome');
}

// Android/Chrome için beforeinstallprompt yakala (prompt gösterebilmek için)
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
});

// Düğme her zaman görünür; tıklamada platforma göre davran
installBtn.addEventListener('click', async () => {
  if (isStandalone()) {
    alert('Zaten uygulama olarak açıksın 🌟');
    return;
  }
  if (deferredPrompt) {
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    return;
  }
  // iOS Safari veya desktop’ta prompt yoksa rehber aç
  helpModal.classList.add('open');
});

helpClose?.addEventListener('click', () => helpModal.classList.remove('open'));
helpModal?.addEventListener('click', (e) => { if (e.target === helpModal) helpModal.classList.remove('open'); });

// --- Service worker kaydı ---
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js');
}

// --- UI / state ---
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
    ['minR','maxR','inS','hiS','outS','hoS'].forEach(k => {
      if (s[k] != null && els[k]) els[k].value = s[k];
    });
  } catch {}
}
function saveState(){
  const s = {};
  ['minR','maxR','inS','hiS','outS','hoS'].forEach(k => s[k] = +els[k].value);
  localStorage.setItem(stateKey, JSON.stringify(s));
}

loadState();
['minR','maxR','inS','hiS','outS','hoS'].forEach(id => {
  els[id].addEventListener('input', () => {
    if (+els.minR.value > +els.maxR.value) els.minR.value = els.maxR.value;
    saveState();
  });
});
els.reset.addEventListener('click', () => {
  els.minR.value = 20; els.maxR.value = 220;
  els.inS.value  = 5;  els.hiS.value  = 0;
  els.outS.value = 5;  els.hoS.value  = 0;
  saveState();
});

// --- Canvas boyutlandırma ---
function resize(){
  const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  els.canvas.width  = Math.floor(els.canvas.clientWidth * dpr);
  els.canvas.height = Math.floor(els.canvas.clientHeight * dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);
}
addEventListener('resize', resize);
resize();

// --- Nefes zaman çizelgesi ---
let t0 = performance.now();
function phaseInfo(tMs){
  const IN  = +els.inS.value * 1000;
  const HI  = +els.hiS.value * 1000;
  const OUT = +els.outS.value * 1000;
  const HO  = +els.hoS.value * 1000;
  const total = Math.max(1, IN+HI+OUT+HO);
  let x = tMs % total;
  if (x < IN)          return ['in',      IN ? x/IN : 0];
  x -= IN;
  if (x < HI)          return ['holdIn',  HI ? x/HI : 0];
  x -= HI;
  if (x < OUT)         return ['out',     OUT ? x/OUT: 0];
  x -= OUT;
  return ['holdOut', HO ? x/HO : 0];
}
const lerp = (a,b,t) => a + (b-a)*t;

// --- Çizim ---
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

  // dış aura
  const grad = ctx.createRadialGradient(0,0, r*0.7, 0,0, r + glow*2);
  grad.addColorStop(0, `rgba(255,255,255,${0.18 + 0.22*k})`);
  grad.addColorStop(1, `rgba(255,255,255,0)`);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0,0, r + glow*2, 0, Math.PI*2);
  ctx.fill();

  // iç aydınlık
  const grad2 = ctx.createRadialGradient(0,0, 0, 0,0, r);
  grad2.addColorStop(0, `rgba(255,255,255,${0.12 + 0.18*k})`);
  grad2.addColorStop(1, `rgba(255,255,255,0)`);
  ctx.fillStyle = grad2;
  ctx.beginPath();
  ctx.arc(0,0, r, 0, Math.PI*2);
  ctx.fill();

  // halka çizgisi
  ctx.strokeStyle = `rgba(255,255,255,0.85)`;
  ctx.lineWidth = line;
  ctx.beginPath();
  ctx.arc(0,0, r, 0, Math.PI*2);
  ctx.stroke();

  ctx.restore();

  requestAnimationFrame(draw);
}
requestAnimationFrame(draw);
