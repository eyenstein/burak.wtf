// breathing.js — linear timing only
function fibPair(n){ if(n<=0)return [0n,0n]; let a=0n,b=1n; for(let i=1;i<=n;i++){const t=a+b; a=b; b=t;} return [a,b]; }
function bigToNum(bi){ const MAX=1e12; const n=Number(bi); return !Number.isFinite(n)?MAX:Math.min(n,MAX); }

export function getRationalTimes(n){
  n = parseInt(n,10);
  if(n===0) return { tin:0, thold:0, tout:0, bhold:0 };
  const [Fi,Fj] = fibPair(Math.max(1,n));
  const Fnm1    = (n<=1)?1:bigToNum(fibPair(n-1)[0]);
  const tin     = (n===1)?1:bigToNum(Fi);
  const tout    = (n===1)?1:bigToNum(Fj);
  const thold   = (n===1)?1:Fnm1;
  const bhold   = (n===1)?1:bigToNum(Fi);
  return { tin, thold, tout, bhold };
}

export function computeBreathGain(t, tin, thold, tout, bhold, lo, hi){
  tin=Math.max(0,tin); thold=Math.max(0,thold); tout=Math.max(0,tout); bhold=Math.max(0,bhold);
  const T = tin + thold + tout + bhold;
  if (T < 1e-6) return (lo+hi)*0.5;
  const ph = t % T;
  if (ph < tin){ const u=ph/tin; return lo + (hi-lo)*u; }
  if (ph < tin + thold){ return hi; }
  if (ph < tin + thold + tout){ const u=(ph - (tin+thold)) / tout; return hi + (lo - hi)*u; }
  return lo;
}
