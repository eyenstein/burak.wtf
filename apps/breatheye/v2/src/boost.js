export class Boost{
  constructor(ui){ this.active=false; this.up=false; this.t0=0; this.t1=0; this.pressDur=0; this.releaseDur=0; this.maxAbs=0.95; this.ui=ui; }
  start(){ this.active=true; this.up=false; this.t0=performance.now(); this.pressDur=0; }
  end(){ this.active=false; this.up=true; this.t1=performance.now(); this.releaseDur=Math.max(200, this.pressDur); }
  easeLog01(ms){
    const s = ms/1000, Lmin=1, Lmax=13;
    const x = Math.min(Math.max(s, Lmin), Lmax);
    const u = (Math.log(x) - Math.log(Lmin)) / (Math.log(Lmax) - Math.log(Lmin));
    return Math.pow(u, 0.85);
  }
  mult(now){
    let ms=0;
    if(this.active){ this.pressDur = now - this.t0; ms = this.pressDur; }
    else if(this.up){ ms = Math.min(now - this.t1, this.releaseDur); }
    const u = this.active ? this.easeLog01(ms) : 1.0 - this.easeLog01(ms);
    const gainBoostMul = 10.0;
    return 1.0 + (gainBoostMul - 1.0) * u;
  }
  radiusAdd(now){
    let ms=0;
    if(this.active){ this.pressDur = now - this.t0; ms = this.pressDur; const u = this.easeLog01(ms); return 0.30 * u; }
    if(this.up){ ms = Math.min(now - this.t1, this.releaseDur); const u = 1.0 - this.easeLog01(ms); if(ms>=this.releaseDur){ this.up=false; } return 0.30 * u; }
    return 0.0;
  }
}
