import { Entity } from './entity.js';
import { dist2 } from '../engine/utils.js';

export class Minion extends Entity {
  constructor({x,y,team, lane='mid'}){
    super({x,y,team, hp:110, maxHp:110, radius:10});
    this.lane=lane;
    this.speed=62;
    this.atk=14;
    this.cd=0;
    this.targetLaneX = team==='blue' ? 1600 : 0; // direction
  }
  update(dt, game){
    if(!this.alive) return;
    this.cd=Math.max(0,this.cd-dt);
    // find nearest enemy within 120
    let closest=null, best=120*120;
    for(const e of game.entities){
      if(!e.alive || e.team===this.team || e===this) continue;
      const d=dist2(this.x,this.y,e.x,e.y);
      if(d<best){best=d; closest=e;}
    }
    if(closest && best<110*110){
      // attack
      if(this.cd<=0){
        closest.takeDamage(this.atk, this);
        this.cd=1.1;
      }
      return;
    }
    // move along lane
    let dest=null;
    if(this.lane==='top'){ dest={x: this.team==='blue'? 1600:0, y:140}; }
    else if(this.lane==='bot'){ dest={x: this.team==='blue'? 1600:0, y: game.map.h-140}; }
    else { // mid diagonal
      dest= this.team==='blue'? {x: game.map.w-100, y:100} : {x:100, y:game.map.h-100};
    }
    const dx=dest.x-this.x, dy=dest.y-this.y, len=Math.hypot(dx,dy)||1;
    this.x+=dx/len*this.speed*dt;
    this.y+=dy/len*this.speed*dt;
    // simple avoidance: if colliding with building, stop?
  }
  onDeath(killer){
    if(killer && killer.heal){
      killer.gold+=18; killer.xp+=22;
    }
  }
}
