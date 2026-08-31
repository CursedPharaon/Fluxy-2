export class HUD {
  constructor(){
    this.elHp=document.getElementById('bar-hp');
    this.elMp=document.getElementById('bar-mp');
    this.elXp=document.getElementById('bar-xp');
    this.txtHp=document.getElementById('txt-hp');
    this.txtMp=document.getElementById('txt-mp');
    this.txtLvl=document.getElementById('txt-lvl');
    this.timer=document.getElementById('game-timer');
    this.status=document.getElementById('game-status');
    this.scoreB=document.getElementById('score-blue');
    this.scoreR=document.getElementById('score-red');
    this.fpsEl=document.getElementById('fps-counter');
  }
  update(state, fps){
    if(!state) return;
    const hpPct=Math.max(0, state.hp/state.maxHp*100);
    const mpPct=Math.max(0, state.mp/state.maxMp*100);
    const need=100+(state.level-1)*65;
    const xpPct=Math.min(100, state.xp/need*100);
    this.elHp.style.width=hpPct+'%';
    this.elMp.style.width=mpPct+'%';
    this.elXp.style.width=xpPct+'%';
    this.txtHp.textContent=`${Math.ceil(state.hp)}/${state.maxHp}`;
    this.txtMp.textContent=`${Math.ceil(state.mp)}/${state.maxMp}`;
    this.txtLvl.textContent=`LVL ${state.level} • ${state.gold}G • ${state.kills}/${state.deaths}`;
    // cds
    for(const k of ['q','w','e']){
      const el=document.querySelector(`.abil[data-key="${k}"]`);
      const cdEl=document.getElementById(`cd-${k}`);
      const ab=state.abilities[k];
      const cd=state.cd[k];
      const nameEl=document.getElementById(`ab-${k}`);
      if(nameEl) nameEl.textContent=ab.name;
      if(cd>0.05){
        el?.classList.add('on-cd');
        if(cdEl) cdEl.textContent=cd.toFixed(1);
      } else {
        el?.classList.remove('on-cd');
        if(cdEl) cdEl.textContent='';
      }
    }
    const m=Math.floor(state.time/60), s=Math.floor(state.time%60);
    this.timer.textContent=`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    this.scoreB.textContent=state.score.blue;
    this.scoreR.textContent=state.score.red;
    if(fps && this.fpsEl) this.fpsEl.textContent=`${Math.round(fps)} FPS`;
  }
  pushKillfeed(text){
    const kf=document.getElementById('killfeed');
    if(!kf) return;
    const d=document.createElement('div');
    d.textContent=text;
    kf.appendChild(d);
    setTimeout(()=> d.remove(), 3200);
  }
}
