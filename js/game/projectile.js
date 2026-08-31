import { dist2 } from '../engine/utils.js';

export class Projectile {
  constructor({x,y,vx,vy,team,owner,dmg, range=300, aoe=0, visual=false, boomerang=false}){
    this.x=x; this.y=y; this.vx=vx; this.vy=vy;
    this.team=team; this.owner=owner; this.dmg=dmg;
    this.range=range; this.aoe=aoe; this.visual=visual; this.boomerang=boomerang;
    this.traveled=0; this.alive=true;
    this.returing=false;
    this.color= team==='blue'?'#5da9ff':'#ff7a7a';
    if(owner && owner.color && !visual) this.color=owner.color;
  }
  update(dt, game){
    if(!this.alive) return;
    const spd=Math.hypot(this.vx,this.vy);
    const move=spd*dt;
    this.x+=this.vx*dt; this.y+=this.vy*dt;
    this.traveled+=move;
    // boomerang return
    if(this.boomerang && !this.returing && this.traveled> this.range*0.55){
      this.returing=true;
      const dx=this.owner.x - this.x, dy=this.owner.y - this.y, len=Math.hypot(dx,dy)||1;
      this.vx=dx/len*500; this.vy=dy/len*500;
    }
    if(this.boomerang && this.returing && dist2(this.x,this.y,this.owner.x,this.owner.y)< 18*18){
      this.alive=false; return;
    }
    if(!this.boomerang && this.traveled> this.range){ this.alive=false; return; }
    if(this.x< -40||this.x>game.map.w+40||this.y< -40||this.y>game.map.h+40){ this.alive=false; return; }
    // collision
    for(const e of game.entities){
      if(!e.alive || e===this.owner || e.team===this.team) continue;
      if(dist2(this.x,this.y,e.x,e.y) < (e.radius+6)*(e.radius+6)){
        if(!this.visual) {
          if(this.aoe>0){
            // aoe dmg
            for(const o of game.entities){
              if(!o.alive||o.team===this.team) continue;
              if(dist2(this.x,this.y,o.x,o.y) < this.aoe*this.aoe) o.takeDamage(this.dmg, this.owner);
            }
            game.spawnEffect('explosion', this.x, this.y);
          } else {
            e.takeDamage(this.dmg, this.owner);
          }
        } else {
          // visual projectile just hits its intended? but we already did hit logic above for dmg 0; ignore
          if(this.dmg===0) e.takeDamage( this.owner.atk + this.owner.level*2 , this.owner);
        }
        if(!this.boomerang) this.alive=false;
        else if(!this.returing){
          // on hit flip to return
          this.returing=true;
          const dx=this.owner.x - this.x, dy=this.owner.y - this.y, len=Math.hypot(dx,dy)||1;
          this.vx=dx/len*520; this.vy=dy/len*520;
        }
        game.audio?.sfx('hit');
        break;
      }
    }
  }
}

export class AOE {
  constructor({x,y,r,dmg, team,owner,dur, slow}){
    this.x=x; this.y=y; this.r=r; this.dmg=dmg; this.team=team; this.owner=owner; this.dur=dur; this.t=0; this.slow=slow; this.tick=0;
  }
  update(dt, game){
    this.t+=dt; this.tick+=dt;
    if(this.tick>=0.5){
      this.tick=0;
      for(const e of game.entities){
        if(!e.alive||e.team===this.team) continue;
        if(dist2(this.x,this.y,e.x,e.y)< this.r*this.r){
          e.takeDamage(this.dmg*0.5, this.owner);
          if(this.slow) { e.slow=0.5; setTimeout(()=>e.slow=0,600); }
        }
      }
    }
    return this.t < this.dur;
  }
}

export class Trap {
  constructor({x,y,team,owner,dmg}){
    this.x=x; this.y=y; this.team=team; this.owner=owner; this.dmg=dmg; this.alive=true; this.armed=0;
  }
  update(dt, game){
    this.armed+=dt;
    if(this.armed<0.6) return true;
    for(const e of game.entities){
      if(!e.alive||e.team===this.team||e===this.owner) continue;
      if(dist2(this.x,this.y,e.x,e.y)< 38*38){
        e.takeDamage(this.dmg, this.owner);
        e.slow=1; setTimeout(()=>e.slow=0,1200);
        this.alive=false;
        game.spawnEffect('explosion', this.x, this.y);
        game.audio?.sfx('hit');
        break;
      }
    }
    return this.alive;
  }
}
