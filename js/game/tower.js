import { Entity } from './entity.js';
import { dist2 } from '../engine/utils.js';
import { CONFIG } from '../config.js';

export class Tower extends Entity {
  constructor({x,y,team}){
    super({x,y,team, hp:CONFIG.TOWER_HP, maxHp:CONFIG.TOWER_HP, radius:18});
    this.range=CONFIG.TOWER_RANGE;
    this.cd=0;
    this.damage=CONFIG.TOWER_DAMAGE;
  }
  update(dt, game){
    if(!this.alive) return;
    this.cd=Math.max(0,this.cd-dt);
    if(this.cd>0) return;
    // find nearest enemy hero/minion within range
    let target=null, best=1e9;
    for(const e of game.entities){
      if(!e.alive || e.team===this.team) continue;
      const d=dist2(this.x,this.y,e.x,e.y);
      if(d< this.range*this.range && d<best){
        // prefer heroes
        const prio = e.constructor.name==='Hero'?0:1;
        const score=d + prio*10000;
        if(score<best){best=score; target=e;}
      }
    }
    if(target){
      // shoot
      const dx=target.x-this.x, dy=target.y-this.y, len=Math.hypot(dx,dy)||1;
      game.spawnProjectile({x:this.x, y:this.y-12, vx:dx/len*420, vy:dy/len*420, team:this.team, owner:this, dmg:this.damage, range:this.range+30});
      this.cd=1.2;
      game.audio?.sfx('tower');
    }
  }
  onDeath(killer){
    if(killer) { killer.gold+=90; killer.xp+=60; }
  }
}

export class Nexus extends Entity {
  constructor({x,y,team}){
    super({x,y,team, hp:CONFIG.NEXUS_HP, maxHp:CONFIG.NEXUS_HP, radius:26});
    this.cd=0;
    this.range=190;
    this.damage=34;
  }
  update(dt, game){
    if(!this.alive) return;
    this.cd=Math.max(0,this.cd-dt);
    if(this.cd>0) return;
    let target=null, best=1e9;
    for(const e of game.entities){
      if(!e.alive || e.team===this.team) continue;
      const d=dist2(this.x,this.y,e.x,e.y);
      if(d<this.range*this.range && d<best){best=d; target=e;}
    }
    if(target){
      const dx=target.x-this.x, dy=target.y-this.y, len=Math.hypot(dx,dy)||1;
      game.spawnProjectile({x:this.x, y:this.y, vx:dx/len*440, vy:dy/len*440, team:this.team, owner:this, dmg:this.damage, range:this.range+20});
      this.cd=0.9;
    }
  }
}
