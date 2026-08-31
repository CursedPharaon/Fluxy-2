import { Entity } from './entity.js';
import { getHero } from '../data/heroes.js';
import { dist2 } from '../engine/utils.js';

export class Hero extends Entity {
  constructor({x,y,team, heroId, name, isBot=false}){
    const data=getHero(heroId);
    super({x,y,team, hp:data.maxHp, maxHp:data.maxHp, radius:14});
    this.heroId=heroId;
    this.data=data;
    this.name=name||data.name;
    this.color=data.color;
    this.size=16;
    this.level=1; this.xp=0; this.gold=300;
    this.maxMp=data.maxMp; this.mp=data.maxMp;
    this.atk=data.atk; this.def=data.def; this.speed=data.speed;
    this.range=data.range;
    this.kills=0; this.deaths=0; this.assists=0;
    this.isBot=isBot;
    this.respawnTimer=0;
    this.cd={q:0,w:0,e:0, atk:0};
    this.shield=0; this.buffs=[];
    this.fortify=0; this.stealth=0; this.freeze=0; this.slow=0;
    this.critNext=false;
    this.spawnX=x; this.spawnY=y;
    this.target=null;
    this.aimAngle=0;
  }
  canCast(key){
    const ab=this.data.abilities[key];
    if(!ab) return false;
    if(this.cd[key]>0) return false;
    if(this.mp < ab.cost) return false;
    if(!this.alive) return false;
    if(this.freeze>0) return false;
    return true;
  }
  cast(key, tx,ty, game){
    if(!this.canCast(key)) return false;
    const ab=this.data.abilities[key];
    this.mp-=ab.cost;
    this.cd[key]=ab.cd;
    this._doAbility(key, ab, tx,ty, game);
    game.audio?.sfx('skill');
    return true;
  }
  _doAbility(key, ab, tx,ty, game){
    const dx=tx-this.x, dy=ty-this.y;
    const len=Math.hypot(dx,dy)||1;
    const nx=dx/len, ny=dy/len;
    switch(ab.type){
      case 'projectile':
        game.spawnProjectile({x:this.x, y:this.y, vx:nx*520, vy:ny*520, team:this.team, owner:this, dmg:ab.dmg, range:ab.range});
        break;
      case 'projectile_aoe':
        game.spawnProjectile({x:this.x, y:this.y, vx:nx*480, vy:ny*480, team:this.team, owner:this, dmg:ab.dmg, aoe:55, range:ab.range}); break;
      case 'double':
        game.spawnProjectile({x:this.x, y:this.y, vx:nx*560, vy:ny*560, team:this.team, owner:this, dmg:ab.dmg, range:300});
        setTimeout(()=> game.spawnProjectile({x:this.x, y:this.y, vx:nx*560, vy:ny*560, team:this.team, owner:this, dmg:ab.dmg, range:300}),120);
        break;
      case 'shield':
        this.shield=ab.shield; setTimeout(()=> this.shield=0, 4000); break;
      case 'fortify':
        this.fortify=3; setTimeout(()=> this.fortify=0,3000); break;
      case 'dash':
        this.x+=nx*140; this.y+=ny*140;
        // damage in path
        game.entities.forEach(e=>{ if(e!==this && e.alive && e.team!==this.team && dist2(this.x,this.y,e.x,e.y)< 70*70) e.takeDamage(ab.dmg,this);});
        break;
      case 'dash_knock':
        this.x+=nx*160; this.y+=ny*160;
        game.entities.forEach(e=>{ if(e!==this && e.alive && e.team!==this.team && dist2(this.x,this.y,e.x,e.y)< 90*90){ e.takeDamage(ab.dmg,this); e.x+=nx*40; e.y+=ny*40; }});
        break;
      case 'dash_stealth':
        this.x+=nx*120; this.y+=ny*120; this.stealth=1; setTimeout(()=>this.stealth=0,1000); break;
      case 'aoe':
        game.spawnAOE({x: this.x+nx*80, y: this.y+ny*80, r:70, dmg:ab.dmg, team:this.team, owner:this, dur:3}); break;
      case 'aoe_slow':
        game.spawnAOE({x: tx, y:ty, r:90, dmg:ab.dmg, team:this.team, owner:this, dur:2, slow:true}); break;
      case 'buff': this.speed+=60; setTimeout(()=>this.speed-=60,4000);
        game.entities.forEach(e=>{ if(e!==this && e.alive && e.team!==this.team && dist2(this.x,this.y,e.x,e.y)<100*100) e.takeDamage(ab.dmg,this);}); break;
      case 'pierce':
        // ray
        game.entities.forEach(e=>{ if(e.alive && e.team!==this.team){
          const proj = ( (e.x-this.x)*nx + (e.y-this.y)*ny );
          const perp = Math.abs( (e.x-this.x)*ny - (e.y-this.y)*nx );
          if(proj>0 && proj<ab.range && perp<18) { e.takeDamage(ab.dmg,this); e.slow=2; setTimeout(()=>e.slow=0,1800); }
        }});
        game.spawnEffect('pierce', this.x, this.y, tx,ty);
        break;
      case 'freeze':
        {
          let best=null, bd=1e9;
          game.entities.forEach(e=>{ if(e.alive && e.team!==this.team && e instanceof Hero){ const d=dist2(this.x,this.y,e.x,e.y); if(d<200*200 && d<bd){bd=d; best=e;}}});
          if(best){ best.takeDamage(ab.dmg,this); best.freeze=1.2; setTimeout(()=>best.freeze=0,1200); }
        } break;
      case 'boomerang':
        {
          const proj=game.spawnProjectile({x:this.x,y:this.y,vx:nx*500,vy:ny*500,team:this.team,owner:this,dmg:ab.dmg, range:ab.range, boomerang:true});
          // return is handled in projectile update
        } break;
      case 'stealth_crit': this.stealth=2; this.critNext=true; setTimeout(()=>{this.stealth=0;},2000); break;
      case 'blink': this.x=tx; this.y=ty; game.entities.forEach(e=>{ if(e!==this && e.alive && e.team!==this.team && dist2(this.x,this.y,e.x,e.y)<80*80) e.takeDamage(ab.dmg,this);}); break;
      case 'melee_stun':
        game.entities.forEach(e=>{ if(e!==this && e.alive && e.team!==this.team && dist2(this.x,this.y,e.x,e.y)< ab.range*ab.range){ e.takeDamage(ab.dmg,this); e.freeze=0.6; setTimeout(()=>e.freeze=0,600); }});
        break;
      case 'trap': game.spawnTrap({x: tx,y:ty, team:this.team, owner:this, dmg:ab.dmg}); break;
      default:
        game.spawnProjectile({x:this.x,y:this.y,vx:nx*520,vy:ny*520,team:this.team,owner:this,dmg:ab.dmg, range:280});
    }
  }
  basicAttack(target, game){
    if(this.cd.atk>0 || !this.alive) return false;
    if(this.freeze>0) return false;
    const d=dist2(this.x,this.y,target.x,target.y);
    if(d> this.range*this.range) return false;
    this.cd.atk=0.7;
    let dmg=this.atk + this.level*3;
    if(this.critNext){ dmg*=1.8; this.critNext=false; }
    target.takeDamage(dmg, this);
    game.audio?.sfx('hit');
    // projectile visual if ranged
    if(this.range>110){
      const dx=target.x-this.x, dy=target.y-this.y, len=Math.hypot(dx,dy)||1;
      game.spawnProjectile({x:this.x,y:this.y, vx:dx/len*560, vy:dy/len*560, team:this.team, owner:this, dmg:0, visual:true, targetPos:{x:target.x,y:target.y}});
    }
    return true;
  }
  update(dt, game){
    // cooldowns
    for(const k of ['q','w','e','atk']) this.cd[k]=Math.max(0, this.cd[k]-dt);
    // mp regen
    this.mp=Math.min(this.maxMp, this.mp + 8*dt);
    // status
    if(this.fortify>0) this.def=this.data.def+18; else this.def=this.data.def;
    if(this.freeze>0) return; // frozen
    // level up
    const need= 100 + (this.level-1)*65;
    if(this.xp>=need){ this.xp-=need; this.level++; this.maxHp+=42; this.hp=this.maxHp; this.maxMp+=18; this.mp=this.maxMp; this.atk+=4; game.addKillfeed(`${this.name} LVL UP → ${this.level}`); game.audio?.sfx('coin');}
    // respawn
    if(!this.alive){
      this.respawnTimer-=dt;
      if(this.respawnTimer<=0){ this.respawn(); }
      return;
    }
    // buff slow
    let spd=this.speed;
    if(this.slow>0) spd*=0.55;
    // AI for bots
    if(this.isBot){
      this._aiUpdate(dt, game, spd);
      return;
    }
    // clamp inside map
    this.x=Math.max(20, Math.min(game.map.w-20, this.x));
    this.y=Math.max(20, Math.min(game.map.h-20, this.y));
  }
  _aiUpdate(dt, game, spd){
    // simple bot: find nearest enemy (hero/minion/tower/nexus), move toward, attack, use skills
    const enemies=game.entities.filter(e=> e.alive && e.team!==this.team);
    // prioritize heroes close, else minions, else towers
    let target=null, best=1e9;
    for(const e of enemies){
      const d=dist2(this.x,this.y,e.x,e.y);
      // weight: heroes more attractive
      const w= e instanceof Hero ? 0.7 : 1;
      const wd=d*w;
      if(wd<best){best=wd; target=e;}
    }
    // also attack nexus if close to win
    if(target){
      const dx=target.x-this.x, dy=target.y-this.y, len=Math.hypot(dx,dy)||1;
      // move if out of range
      if(len> this.range-8){
        const nx=dx/len, ny=dy/len;
        // avoid stacking: slight jitter
        this.x+=nx*spd*dt + (Math.random()-0.5)*2;
        this.y+=ny*spd*dt + (Math.random()-0.5)*2;
        this.aimAngle=Math.atan2(ny,nx);
      } else {
        // in range: attack
        this.basicAttack(target, game);
        // cast random skill if available
        const keys=['q','w','e'];
        for(const k of keys){
          if(this.canCast(k) && Math.random()<0.04){
            this.cast(k, target.x, target.y, game);
          }
        }
        this.aimAngle=Math.atan2(dy,dx);
      }
    } else {
      // wander to mid
      const mx=game.map.w/2, my=game.map.h/2;
      const dx=mx-this.x, dy=my-this.y, len=Math.hypot(dx,dy)||1;
      this.x+=dx/len*spd*0.5*dt;
      this.y+=dy/len*spd*0.5*dt;
    }
    // random buff pickup
    for(const b of game.buffs){
      if(!b.taken && dist2(this.x,this.y,b.x,b.y)< 22*22){
        b.taken=true; this.heal(80); this.mp=Math.min(this.maxMp, this.mp+60); this.xp+=35; game.audio?.sfx('heal');
        setTimeout(()=> b.taken=false, 15000);
      }
    }
    this.x=Math.max(20, Math.min(game.map.w-20, this.x));
    this.y=Math.max(20, Math.min(game.map.h-20, this.y));
  }
  respawn(){
    this.alive=true; this.hp=this.maxHp; this.mp=this.maxMp;
    this.x=this.spawnX; this.y=this.spawnY;
    this.cd={q:0,w:0,e:0, atk:0};
    this.shield=0; this.freeze=0; this.slow=0;
  }
  onDeath(killer){
    this.respawnTimer=6;
    this.deaths++;
    if(killer && killer instanceof Hero){
      killer.kills++; killer.gold+=180; killer.xp+=90;
      if(killer.team) killer.heal(30);
    }
  }
}
