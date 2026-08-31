import { CONFIG } from '../config.js';
import { MAP, getSpawnPos } from './map.js';
import { Hero } from './hero.js';
import { Minion } from './minion.js';
import { Tower, Nexus } from './tower.js';
import { Projectile, AOE, Trap } from './projectile.js';
import { audio } from '../engine/audio.js';
import { getHero } from '../data/heroes.js';

export class Game {
  constructor({renderer, input, mode='offline', localHeroId='flux', localName='Игрок', onEvent}){
    this.renderer=renderer;
    this.input=input;
    this.mode=mode;
    this.localHeroId=localHeroId;
    this.localName=localName;
    this.onEvent=onEvent;
    this.map={w:MAP.w, h:MAP.h};
    this.audio=audio;
    this.entities=[];
    this.heroes=[];
    this.minions=[];
    this.towers=[];
    this.nexuses=[];
    this.projectiles=[];
    this.aoes=[];
    this.traps=[];
    this.effects=[];
    this.buffs= MAP.buffs.map(b=> ({x:b.x, y:b.y, taken:false}));
    this.time=0;
    this.spawnTimer=0;
    this.goldTimer=0;
    this.score={blue:0, red:0};
    this.localHero=null;
    this.running=false;
    this.paused=false;
    this.killfeed=[];
    this.lastLoop=0;
    this.winner=null;
  }

  init(teams){
    // teams: {blue:[{heroId,name,isLocal?}], red:[...]}
    this.entities=[]; this.heroes=[]; this.towers=[]; this.nexuses=[]; this.minions=[]; this.projectiles=[]; this.aoes=[]; this.traps=[];
    this.time=0; this.winner=null;
    // towers
    for(const t of MAP.towers.blue){ const tw=new Tower({x:t.x,y:t.y,team:'blue'}); this.towers.push(tw); this.entities.push(tw); }
    for(const t of MAP.towers.red){ const tw=new Tower({x:t.x,y:t.y,team:'red'}); this.towers.push(tw); this.entities.push(tw); }
    // nexus
    const nb=new Nexus({x:MAP.nexus.blue.x, y:MAP.nexus.blue.y, team:'blue'});
    const nr=new Nexus({x:MAP.nexus.red.x, y:MAP.nexus.red.y, team:'red'});
    this.nexuses=[nb,nr]; this.entities.push(nb,nr);
    // heroes
    const mkTeam=(list, team)=>{
      list.forEach((p,i)=>{
        const spawn=getSpawnPos(team,i);
        const h=new Hero({x:spawn.x, y:spawn.y, team, heroId:p.heroId, name:p.name, isBot: !!p.isBot});
        if(p.isLocal) this.localHero=h;
        this.heroes.push(h); this.entities.push(h);
      });
    };
    mkTeam(teams.blue,'blue');
    mkTeam(teams.red,'red');
    this.running=true;
    this.lastLoop=performance.now();
    // initial minions
    this._spawnWave();
  }

  _spawnWave(){
    const lanes=['top','mid','bot'];
    for(const lane of lanes){
      // blue
      const bPos=getSpawnPos('blue',0);
      const rPos=getSpawnPos('red',0);
      // offset slightly toward lane
      const laneOff={top:{x:0,y:-60}, mid:{x:0,y:0}, bot:{x:0,y:60}};
      for(let i=0;i<3;i++){
        const mb=new Minion({x:bPos.x + laneOff[lane].x + i*12, y:bPos.y + laneOff[lane].y, team:'blue', lane});
        const mr=new Minion({x:rPos.x + laneOff[lane].x - i*12, y:rPos.y + laneOff[lane].y, team:'red', lane});
        this.minions.push(mb,mr); this.entities.push(mb,mr);
      }
    }
    this.addKillfeed('— НОВАЯ ВОЛНА КРИПОВ —');
  }

  spawnProjectile(opts){ const p=new Projectile(opts); this.projectiles.push(p); return p; }
  spawnAOE(opts){ const a=new AOE(opts); this.aoes.push(a); this.effects.push({type:'aoe', x:opts.x,y:opts.y,r:opts.r, t:0, dur:opts.dur}); }
  spawnTrap(opts){ const t=new Trap(opts); this.traps.push(t); }
  spawnEffect(type,x,y,tx,ty){
    this.effects.push({type,x,y,tx,ty,t:0, dur:0.35});
  }
  addKillfeed(text){
    this.killfeed.push(text);
    // DOM handled externally via onEvent
    this.onEvent?.('killfeed', text);
    if(this.killfeed.length>6) this.killfeed.shift();
  }

  // main tick
  update(dt){
    if(!this.running||this.paused) return;
    this.time+=dt;
    this.spawnTimer+=dt;
    this.goldTimer+=dt;
    if(this.spawnTimer> CONFIG.MINION_SPAWN_INTERVAL/1000){
      this.spawnTimer=0; this._spawnWave();
    }
    if(this.goldTimer>1){
      this.goldTimer=0;
      for(const h of this.heroes) if(h.alive){ h.gold+=CONFIG.GOLD_TICK; h.xp+=2; }
    }
    // update heroes
    for(const h of this.heroes) h.update(dt,this);
    // minions
    for(const m of this.minions) m.update(dt,this);
    // towers/nexus
    for(const t of this.towers) t.update(dt,this);
    for(const n of this.nexuses) n.update(dt,this);
    // projectiles
    for(let i=this.projectiles.length-1;i>=0;i--){
      const p=this.projectiles[i];
      p.update(dt,this);
      if(!p.alive) this.projectiles.splice(i,1);
    }
    // aoes
    for(let i=this.aoes.length-1;i>=0;i--){
      const a=this.aoes[i];
      if(!a.update(dt,this)) this.aoes.splice(i,1);
    }
    for(let i=this.traps.length-1;i>=0;i--){
      if(!this.traps[i].update(dt,this)) this.traps.splice(i,1);
    }
    // buff pickup for local hero
    if(this.localHero){
      for(const b of this.buffs){
        if(!b.taken){
          const dx=b.x-this.localHero.x, dy=b.y-this.localHero.y;
          if(dx*dx+dy*dy < 26*26){
            b.taken=true;
            this.localHero.heal(90); this.localHero.mp=Math.min(this.localHero.maxMp, this.localHero.mp+70); this.localHero.xp+=40; this.localHero.gold+=25;
            this.addKillfeed(`${this.localHero.name} подобрал БАФФ`);
            audio.sfx('heal');
            setTimeout(()=> b.taken=false, 12000);
          }
        }
      }
    }
    // cleanup dead minions
    for(let i=this.minions.length-1;i>=0;i--){
      if(!this.minions[i].alive){
        const m=this.minions[i];
        // remove from entities
        const idx=this.entities.indexOf(m);
        if(idx>=0) this.entities.splice(idx,1);
        this.minions.splice(i,1);
        audio.sfx('dead');
      }
    }
    // towers dead cleanup
    for(let i=this.towers.length-1;i>=0;i--){
      if(!this.towers[i].alive){
        const tw=this.towers[i];
        const idx=this.entities.indexOf(tw);
        if(idx>=0) this.entities.splice(idx,1);
        this.towers.splice(i,1);
        this.addKillfeed(`БАШНЯ ${tw.team.toUpperCase()} ПАЛА`);
        audio.sfx('dead');
        if(tw.team==='blue') this.score.red+=1; else this.score.blue+=1;
      }
    }
    // check win
    for(const n of this.nexuses){
      if(!n.alive){
        this.winner = n.team==='blue' ? 'red' : 'blue';
        this.running=false;
        const isWin = this.localHero && this.localHero.team===this.winner;
        this.onEvent?.('gameEnd', {winner:this.winner, isWin, time:this.time, localHero:this.localHero});
        audio.sfx(isWin?'win':'lose');
        break;
      }
    }
    // handle local input
    this._handleLocalInput(dt);
    // effects timer
    for(let i=this.effects.length-1;i>=0;i--){
      this.effects[i].t+=dt;
      if(this.effects[i].t> this.effects[i].dur) this.effects.splice(i,1);
    }
  }

  _handleLocalInput(dt){
    const h=this.localHero;
    if(!h||!h.alive||h.freeze>0) return;
    const axis=this.input.axis();
    const spd=h.speed * (h.slow>0?0.55:1);
    let nx=h.x + axis.x*spd*dt;
    let ny=h.y + axis.y*spd*dt;
    // collision with towers/nexus (simple push)
    for(const e of [...this.towers, ...this.nexuses]){
      if(!e.alive) continue;
      const dx=nx-e.x, dy=ny-e.y, d=Math.hypot(dx,dy);
      if(d< e.radius+14){
        const push=(e.radius+14 - d);
        const ux=dx/(d||1), uy=dy/(d||1);
        nx+=ux*push; ny+=uy*push;
      }
    }
    h.x=nx; h.y=ny;
    // aim angle to mouse
    const worldMouse=this.renderer.screenToWorld(this.input.mouse.x, this.input.mouse.y);
    // if mouse not moved, use last hero direction?
    const dx=worldMouse.x - h.x, dy=worldMouse.y - h.y;
    if(Math.hypot(dx,dy)>5) h.aimAngle=Math.atan2(dy,dx);
    // attacks
    if(this.input.mouse.down || this.input.isDown(' ')){
      // find nearest enemy within range in direction of mouse
      let target=null, best=1e9;
      for(const e of this.entities){
        if(!e.alive||e.team===h.team||e===h) continue;
        const d=Math.hypot(e.x-h.x, e.y-h.y);
        if(d< h.range+8 && d<best){
          // check angle roughly toward mouse?
          const ang=Math.atan2(e.y-h.y, e.x-h.x);
          const diff=Math.abs(((ang - h.aimAngle + Math.PI*3)%(Math.PI*2))-Math.PI);
          if(diff< 1.2 || d< h.range*0.6) { best=d; target=e; }
        }
      }
      if(target) h.basicAttack(target,this);
      else {
        // shoot empty? create miss effect
        if(h.cd.atk<=0){
          h.cd.atk=0.7;
          if(h.range>110){
            const len=Math.hypot(dx,dy)||1;
            this.spawnProjectile({x:h.x, y:h.y, vx:dx/len*560, vy:dy/len*560, team:h.team, owner:h, dmg:0, visual:true});
          }
        }
      }
    }
    // skills
    const trySkill=(k)=>{
      if(this.input.consume(k)){
        const tx= worldMouse.x, ty= worldMouse.y;
        if(h.canCast(k)){
          h.cast(k, tx,ty,this);
        } else if(h.cd[k]>0){
          // feedback
        }
      }
    };
    trySkill('q'); trySkill('w'); trySkill('e');
    // dash with shift
    if(this.input.consume('shift')){
      const a=h.aimAngle;
      h.x+=Math.cos(a)*110; h.y+=Math.sin(a)*110;
      audio.sfx('skill');
    }
  }

  render(){
    const r=this.renderer;
    r.clear(this.map.w, this.map.h);
    if(this.localHero){
      r.setCamera(this.localHero.x, this.localHero.y, this.map.w, this.map.h);
    } else {
      r.setCamera(this.map.w/2, this.map.h/2, this.map.w, this.map.h);
    }
    // draw nexuses / towers
    for(const n of this.nexuses) r.drawNexus(n.x,n.y,n.team,n.hp,n.maxHp);
    for(const t of this.towers) r.drawTower(t.x,t.y,t.team,t.hp,t.maxHp);
    // traps
    for(const tr of this.traps){
      const p=r.worldToScreen(tr.x,tr.y);
      r.ctx.fillStyle='#ff00ff'; r.ctx.fillRect(p.x-5,p.y-5,10,10);
      r.ctx.strokeStyle='#fff'; r.ctx.strokeRect(p.x-5,p.y-5,10,10);
    }
    // buffs
    for(const b of this.buffs) if(!b.taken) r.drawBuff(b.x,b.y);
    // aoe effects
    for(const e of this.effects){
      const p=r.worldToScreen(e.x,e.y);
      r.ctx.strokeStyle='rgba(255,230,0,0.6)'; r.ctx.lineWidth=2;
      const prog=e.t/e.dur;
      r.ctx.beginPath(); r.ctx.arc(p.x,p.y, e.r*(0.4+prog*0.6),0,Math.PI*2); r.ctx.stroke();
    }
    // minions
    for(const m of this.minions){
      r.drawMinion(m.x,m.y,m.team,m.hp,m.maxHp);
    }
    // heroes
    for(const h of this.heroes){
      if(h.stealth>0 && h!==this.localHero){
        // draw semi transparent
        r.ctx.globalAlpha=0.25;
        r.drawHero(h.x,h.y,h,false);
        r.ctx.globalAlpha=1;
        continue;
      }
      r.drawHero(h.x,h.y,h, h===this.localHero);
      if(h.freeze>0){
        const p=r.worldToScreen(h.x,h.y);
        r.ctx.fillStyle='rgba(80,200,255,0.35)'; r.ctx.fillRect(p.x-10,p.y-16,20,26);
      }
    }
    // projectiles
    for(const p of this.projectiles) r.drawProjectile(p.x,p.y,p.color);
    // aim line for local hero
    if(this.localHero && this.localHero.alive){
      const lh=this.localHero;
      const p=r.worldToScreen(lh.x,lh.y);
      const ang=lh.aimAngle;
      r.ctx.strokeStyle='rgba(255,255,255,0.25)'; r.ctx.lineWidth=1;
      r.ctx.beginPath(); r.ctx.moveTo(p.x,p.y); r.ctx.lineTo(p.x+Math.cos(ang)*lh.range, p.y+Math.sin(ang)*lh.range); r.ctx.stroke();
      // range circle faint
      r.drawRangeIndicator(lh.x,lh.y,lh.range);
    }
  }

  // minimap
  renderMinimap(canvas){
    const ctx=canvas.getContext('2d');
    const w=canvas.width, h=canvas.height;
    ctx.clearRect(0,0,w,h);
    ctx.fillStyle='#1b3a2a'; ctx.fillRect(0,0,w,h);
    // scale
    const sx=w/this.map.w, sy=h/this.map.h;
    // lanes
    ctx.fillStyle='#8b5e3c';
    ctx.fillRect(0, 140*sy, w, 6);
    ctx.fillRect(0, (this.map.h-140)*sy, w, 6);
    // diagonal
    ctx.strokeStyle='#8b5e3c'; ctx.lineWidth=6;
    ctx.beginPath(); ctx.moveTo(0, h); ctx.lineTo(w,0); ctx.stroke();
    // bases
    ctx.fillStyle='#2a7fff'; ctx.fillRect(2, h-18, 16,16);
    ctx.fillStyle='#ff3b30'; ctx.fillRect(w-18,2,16,16);
    // towers
    for(const t of this.towers){
      ctx.fillStyle=t.team==='blue'?'#2a7fff':'#ff3b30';
      ctx.fillRect(t.x*sx-2, t.y*sy-2,4,4);
    }
    // nexus
    for(const n of this.nexuses){
      ctx.fillStyle=n.team==='blue'?'#1e5fff':'#cc2222';
      ctx.fillRect(n.x*sx-4, n.y*sy-4,8,8);
    }
    // minions dots
    ctx.fillStyle='#aaa';
    for(const m of this.minions) ctx.fillRect(m.x*sx, m.y*sy,2,2);
    // heroes
    for(const he of this.heroes){
      ctx.fillStyle=he.team==='blue'?'#5da9ff':'#ff7a7a';
      if(he===this.localHero) { ctx.fillStyle='#ffe600'; ctx.fillRect(he.x*sx-3, he.y*sy-3,6,6); }
      else ctx.fillRect(he.x*sx-2, he.y*sy-2,4,4);
    }
    // camera viewport
    if(this.localHero){
      ctx.strokeStyle='rgba(255,255,255,0.6)'; ctx.lineWidth=1;
      ctx.strokeRect(this.renderer.cam.x*sx, this.renderer.cam.y*sy, this.renderer.w*sx, this.renderer.h*sy);
    }
  }

  getStateForHUD(){
    const lh=this.localHero;
    if(!lh) return null;
    return {
      hp:lh.hp, maxHp:lh.maxHp, mp:lh.mp, maxMp:lh.maxMp,
      level:lh.level, xp:lh.xp, gold:lh.gold, kills:lh.kills, deaths:lh.deaths,
      cd:{...lh.cd}, abilities: lh.data.abilities,
      time:this.time, score:this.score
    };
  }
}
