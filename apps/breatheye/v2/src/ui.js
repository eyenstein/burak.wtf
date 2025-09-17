import { getRationalTimes } from './breathing.js';

export function hookUI(handlers){
  const $ = (id)=>document.getElementById(id);

  const el = {
    ghi:$('ghi'), glo:$('glo'),
    moonCount:$('moonCount'),
    sizeMin:$('sizeMin'), sizeMax:$('sizeMax'), sizeBase:$('sizeBase'),
    ghiVal:$('ghiVal'), gloVal:$('gloVal'),
    moonCountVal:$('moonCountVal'),
    sizeMinVal:$('sizeMinVal'), sizeMaxVal:$('sizeMaxVal'), sizeBaseVal:$('sizeBaseVal'),
    tin:$('tin'), thold:$('thold'), tout:$('tout'), bhold:$('bhold'),
    holdInChk:$('holdInChk'), holdOutChk:$('holdOutChk'),
    tinVal:$('tinVal'), tholdVal:$('tholdVal'), toutVal:$('toutVal'), bholdVal:$('bholdVal'),
    rationalChk:$('rationalChk'), rationalUnits:$('rationalUnits'), rationalVal:$('rationalVal'),
    ratInfo:$('ratInfo')
  };

  ['ghi','glo','tin','thold','tout','bhold','holdInChk','holdOutChk','sizeMin','sizeMax','sizeBase']
    .forEach(k=> el[k].addEventListener('input', ()=>handlers.onAny?.()));

  el.moonCount.addEventListener('change', ()=>handlers.onMoonCount?.());

  el.rationalChk.addEventListener('change', ()=>{
    const on = el.rationalChk.checked;
    el.rationalUnits.disabled = !on;
    [el.tin, el.thold, el.tout, el.bhold, el.holdInChk, el.holdOutChk].forEach(x=> x.disabled = on);
    handlers.onAny?.();
  });
  el.rationalUnits.addEventListener('input', ()=>handlers.onAny?.());

  return {
    ghi: ()=>+el.ghi.value, glo: ()=>+el.glo.value,
    moonCount: ()=>+el.moonCount.value,
    sizeMin: ()=>+el.sizeMin.value, sizeMax: ()=>+el.sizeMax.value, sizeBase: ()=>+el.sizeBase.value,
    tin: ()=>+el.tin.value, thold: ()=>+el.thold.value, tout: ()=>+el.tout.value, bhold: ()=>+el.bhold.value,
    holdInOn: ()=>el.holdInChk.checked, holdOutOn: ()=>el.holdOutChk.checked,
    rationalOn: ()=>el.rationalChk.checked, rationalUnits: ()=>+el.rationalUnits.value,
    setText:(k,v)=>{ el[k].textContent = v; }
  };
}

export function updateUIValues(ui){
  ui.setText('ghiVal', ui.ghi().toFixed(2));
  ui.setText('gloVal', ui.glo().toFixed(2));
  ui.setText('moonCountVal', String(ui.moonCount()));
  ui.setText('sizeMinVal', ui.sizeMin().toFixed(0) + '%');
  ui.setText('sizeMaxVal', ui.sizeMax().toFixed(0) + '%');
  const base = ui.sizeBase(); ui.setText('sizeBaseVal', (base>=0?'+':'') + base.toFixed(0) + '%');

  let tin=ui.tin(), th=ui.thold(), tout=ui.tout(), bh=ui.bhold();
  let inh, topH, exh, botH;
  if (ui.rationalOn()){
    const t = getRationalTimes(ui.rationalUnits());
    inh = t.tin; topH = t.thold; exh = t.tout; botH = t.bhold;
  } else {
    inh  = tin;
    topH = ui.holdInOn()? th : 0;
    exh  = tout;
    botH = ui.holdOutOn()? bh : 0;
  }
  const fmt = (x)=> x>3600? (x/3600).toFixed(1)+'h' : x>600? (x/60).toFixed(1)+'m' : x.toFixed(x<10?2:1)+'s';
  document.getElementById('tinVal').textContent   = fmt(inh);
  document.getElementById('tholdVal').textContent = fmt(topH);
  document.getElementById('toutVal').textContent  = fmt(exh);
  document.getElementById('bholdVal').textContent = fmt(botH);

  if (ui.rationalOn()){
    document.getElementById('rationalVal').textContent = ui.rationalUnits();
    document.getElementById('ratInfo').textContent = `N=${ui.rationalUnits()} → inhale=${fmt(inh)} • topHold=${fmt(topH)} • exhale=${fmt(exh)} • bottomHold=${fmt(botH)}`;
  } else {
    document.getElementById('ratInfo').textContent = '';
  }
}
