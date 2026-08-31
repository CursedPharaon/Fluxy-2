import { HEROES } from '../data/heroes.js';
import { audio } from '../engine/audio.js';

export class UIManager {
  constructor({onPlayOffline, onPlayOnline, onSelectHero}){
    this.selected=null;
    this.onPlayOffline=onPlayOffline;
    this.onPlayOnline=onPlayOnline;
    this.onSelectHero=onSelectHero;
    this._bind();
    this._renderHeroGrid();
  }
  _bind(){
    document.querySelectorAll('[data-action]').forEach(b=>{
      b.addEventListener('click', ()=> this.handleAction(b.dataset.action, b));
    });
    document.getElementById('btn-confirm-hero')?.addEventListener('click', ()=>{
      if(this.selected) {
        audio.sfx('select');
        document.getElementById('btn-start-battle').disabled=false;
        // highlight start
        this.showToast(`${this.selected.name} выбран! Нажми В БОЙ!`);
      }
    });
    document.getElementById('btn-start-battle')?.addEventListener('click', ()=>{
      if(!this.selected) return;
      const name=document.getElementById('input-name')?.value?.trim() || 'Игрок';
      this.onPlayOffline?.(this.selected.id, name);
    });
    // settings
    const vol=document.getElementById('set-volume');
    vol?.addEventListener('input', e=>{
      document.getElementById('vol-val').textContent=e.target.value+'%';
      audio.setVolume(e.target.value);
      localStorage.setItem('fluxy_vol', e.target.value);
    });
    const crt=document.getElementById('set-crt');
    crt?.addEventListener('change', e=> {
      document.body.classList.toggle('no-crt', !e.target.checked);
      localStorage.setItem('fluxy_crt', e.target.checked?'1':'0');
    });
    const fps=document.getElementById('set-fps');
    fps?.addEventListener('change', e=>{
      document.getElementById('fps-counter')?.classList.toggle('hidden', !e.target.checked);
      localStorage.setItem('fluxy_fps', e.target.checked?'1':'0');
    });
    // load stored
    const sv=localStorage.getItem('fluxy_vol'); if(sv){ vol.value=sv; document.getElementById('vol-val').textContent=sv+'%'; audio.setVolume(sv); }
    const sc=localStorage.getItem('fluxy_crt'); if(sc==='0'){ crt.checked=false; document.body.classList.add('no-crt'); }
    const sf=localStorage.getItem('fluxy_fps'); if(sf==='1'){ fps.checked=true; document.getElementById('fps-counter')?.classList.remove('hidden'); }
    // hero preview canvas anim
  }
  handleAction(action){
    audio.sfx('select');
    switch(action){
      case 'play-offline': this.showScreen('screen-heroes'); break;
      case 'play-online': this.showScreen('screen-lobby'); this.onPlayOnline?.(); break;
      case 'heroes': this.showScreen('screen-heroes'); break;
      case 'settings': this.showScreen('screen-settings'); break;
      case 'howto': this.showScreen('screen-howto'); break;
      case 'back-menu': this.showScreen('screen-menu'); break;
      case 'play-again': this.showScreen('screen-heroes'); break;
    }
  }
  showScreen(id){
    document.querySelectorAll('.screen').forEach(s=> s.classList.remove('active'));
    document.getElementById(id)?.classList.add('active');
    if(id==='screen-heroes') this._renderHeroGrid();
  }
  _renderHeroGrid(){
    const grid=document.getElementById('hero-grid');
    if(!grid) return;
    grid.innerHTML='';
    HEROES.forEach(h=>{
      const card=document.createElement('div');
      card.className='hero-card'+ (this.selected?.id===h.id?' selected':'');
      card.innerHTML=`
        <canvas width="32" height="32"></canvas>
        <h4>${h.name}</h4>
        <div class="role">${h.role}</div>
        <div style="font-size:6px;color:#888;margin-top:4px">♥ ${h.maxHp} | ♦ ${h.maxMp}</div>
      `;
      const cv=card.querySelector('canvas');
      this._drawIcon(cv, h);
      card.addEventListener('click', ()=> this.selectHero(h));
      grid.appendChild(card);
    });
  }
  _drawIcon(canvas, hero){
    const ctx=canvas.getContext('2d');
    ctx.imageSmoothingEnabled=false;
    ctx.fillStyle='#000'; ctx.fillRect(0,0,32,32);
    // simple pixel hero
    const c=hero.color;
    // body
    ctx.fillStyle=c; ctx.fillRect(10,10,12,10);
    ctx.fillStyle='#ffdbac'; ctx.fillRect(11,6,10,6);
    ctx.fillStyle='#000'; ctx.fillRect(13,8,2,2); ctx.fillRect(17,8,2,2);
    ctx.fillStyle= hero.color; ctx.fillRect(8,12,4,6); ctx.fillRect(20,12,4,6);
  }
  selectHero(hero){
    this.selected=hero;
    audio.sfx('select');
    this._renderHeroGrid();
    const detail=document.getElementById('hero-detail');
    detail.classList.remove('hidden');
    document.getElementById('hd-name').textContent=hero.name;
    document.getElementById('hd-role').textContent=hero.role;
    document.getElementById('hd-desc').textContent=hero.desc;
    document.getElementById('hd-stats').innerHTML=Object.entries(hero.stats).map(([k,v])=>`<span class="stat">${k.toUpperCase()} ${'█'.repeat(v)}${'░'.repeat(10-v)}</span>`).join('');
    const abWrap=document.getElementById('hd-abilities');
    abWrap.innerHTML=Object.entries(hero.abilities).map(([key,ab])=>`
      <div class="ab-card"><b>${key.toUpperCase()} — ${ab.name}</b><p>${ab.desc}<br>Урон: ${ab.dmg} | КД: ${ab.cd}с | Мана: ${ab.cost}</p></div>
    `).join('');
    // preview bigger
    const cv=document.getElementById('hero-preview-canvas');
    if(cv){
      const ctx=cv.getContext('2d');
      ctx.imageSmoothingEnabled=false;
      ctx.fillStyle='#000'; ctx.fillRect(0,0,96,96);
      // enlarged
      ctx.fillStyle=hero.color; ctx.fillRect(32,36,32,30);
      ctx.fillStyle='#ffdbac'; ctx.fillRect(36,18,24,18);
      ctx.fillStyle='#000'; ctx.fillRect(42,24,4,4); ctx.fillRect(54,24,4,4);
      ctx.fillStyle=hero.color; ctx.fillRect(24,36,10,16); ctx.fillRect(62,36,10,16);
      ctx.fillStyle='#222'; ctx.fillRect(34,50,28,6);
    }
    document.getElementById('heroes-back-row')?.scrollIntoView();
  }
  showToast(msg){
    const kf=document.getElementById('killfeed');
    if(!kf) return;
    const d=document.createElement('div');
    d.textContent=msg; kf.appendChild(d);
    setTimeout(()=> d.remove(), 2500);
  }
  showResult({isWin, winner, localHero, time}){
    this.showScreen('screen-result');
    document.getElementById('result-title').textContent=isWin?'ПОБЕДА!':'ПОРАЖЕНИЕ';
    document.getElementById('result-title').style.color=isWin?'#00ff9c':'#ff3b30';
    const m=Math.floor(time/60), s=Math.floor(time%60);
    document.getElementById('result-desc').textContent=`Команда ${winner.toUpperCase()} победила • Время ${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    const stats=document.getElementById('result-stats');
    if(localHero){
      stats.innerHTML=`
        <div><span>ГЕРОЙ</span><b>${localHero.name} Lv${localHero.level}</b></div>
        <div><span>K / D</span><b>${localHero.kills} / ${localHero.deaths}</b></div>
        <div><span>ЗОЛОТО</span><b>${localHero.gold}</b></div>
        <div><span>УРОН</span><b>${localHero.kills* 120 + localHero.level*30}</b></div>
      `;
    }
  }
}
