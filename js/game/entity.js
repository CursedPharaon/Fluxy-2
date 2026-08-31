import { dist2 } from '../engine/utils.js';

export class Entity {
  constructor({x,y,team,hp,maxHp, radius=18}){
    this.x=x; this.y=y; this.team=team;
    this.hp=hp; this.maxHp=maxHp||hp;
    this.radius=radius;
    this.alive=true;
    this.vx=0; this.vy=0;
  }
  takeDamage(dmg, from){
    if(!this.alive) return;
    // defense reduce
    const def=this.def||0;
    dmg=Math.max(1, dmg - def*0.35);
    // shield
    if(this.shield>0){
      const absorb=Math.min(this.shield,dmg);
      this.shield-=absorb; dmg-=absorb;
    }
    this.hp-=dmg;
    if(this.hp<=0){ this.hp=0; this.alive=false; this.onDeath&&this.onDeath(from); }
  }
  heal(v){ this.hp=Math.min(this.maxHp, this.hp+v); }
  distanceTo(e){ return Math.hypot(this.x-e.x, this.y-e.y); }
  isEnemy(e){ return e.team && this.team!==e.team; }
}
