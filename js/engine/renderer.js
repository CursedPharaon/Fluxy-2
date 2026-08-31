import { PAL, hash } from './utils.js';

export class Renderer {
  constructor(canvas){
    this.canvas=canvas;
    this.ctx=canvas.getContext('2d');
    this.cam={x:0,y:0};
    this.w=0; this.h=0;
    this.resize();
    window.addEventListener('resize', ()=>this.resize());
  }
  resize(){
    const dpr=Math.min(window.devicePixelRatio||1,2);
    const rect=this.canvas.getBoundingClientRect();
    // fallback if hidden
    const w=rect.width||window.innerWidth;
    const h=rect.height||window.innerHeight;
    this.canvas.width=Math.floor(w*dpr);
    this.canvas.height=Math.floor(h*dpr);
    this.ctx.setTransform(dpr,0,0,dpr,0,0);
    this.w=w; this.h=h;
  }
  setCamera(x,y, mapW, mapH){
    this.cam.x=Math.max(0, Math.min(mapW - this.w, x - this.w/2));
    this.cam.y=Math.max(0, Math.min(mapH - this.h, y - this.h/2));
  }
  worldToScreen(x,y){ return {x:x-this.cam.x, y:y-this.cam.y}; }
  screenToWorld(x,y){
    // x,y are in canvas pixel space (already scaled), need to convert from CSS space
    const dpr = this.canvas.width / this.w;
    return {x: x/dpr + this.cam.x, y: y/dpr + this.cam.y};
  }

  clear(mapW, mapH){
    const ctx=this.ctx;
    ctx.fillStyle='#1b3a2a';
    ctx.fillRect(0,0,this.w,this.h);
    // draw grass tiles in view
    const tile=32;
    const startX=Math.floor(this.cam.x/tile)*tile;
    const startY=Math.floor(this.cam.y/tile)*tile;
    for(let y=startY; y<this.cam.y+this.h; y+=tile){
      for(let x=startX; x<this.cam.x+this.w; x+=tile){
        const v=hash(Math.floor(x/tile), Math.floor(y/tile));
        ctx.fillStyle= v>0.7 ? PAL.grass2 : PAL.grass;
        const sx=x-this.cam.x, sy=y-this.cam.y;
        ctx.fillRect(sx,sy,tile,tile);
        // pixel dot
        if(v>0.85){ ctx.fillStyle='rgba(0,0,0,0.15)'; ctx.fillRect(sx+8,sy+8,4,4); }
      }
    }
    // lanes - dirt roads
    this._drawLanes(ctx, mapW, mapH);
  }
  _drawLanes(ctx, mapW, mapH){
    ctx.fillStyle=PAL.dirt;
    // mid lane diagonal-ish corridor: from blue base (80, mapH-80) to red (mapW-80,80)
    // For simplicity draw 3 horizontal/vertical lanes + diagonal
    // TOP lane: y=140 horizontal
    // MID lane: diagonal band
    // BOT lane: y=mapH-140
    const drawRoad=(x,y,w,h)=> ctx.fillRect(x-this.cam.x, y-this.cam.y, w,h);
    // top
    drawRoad(60, 120, mapW-120, 40);
    // mid - diagonal as series of rects
    for(let i=0;i<20;i++){
      const t=i/19;
      const cx= 120 + t*(mapW-240);
      const cy= mapH-120 - t*(mapH-240);
      drawRoad(cx-30, cy-20, 60, 40);
    }
    // bot
    drawRoad(60, mapH-160, mapW-120, 40);
    // bases
    drawRoad(40, mapH-220, 180, 180);
    drawRoad(mapW-220, 40, 180, 180);
    // river
    ctx.fillStyle='#3a7bd5';
    ctx.fillRect(0, mapH/2 -6 -this.cam.y, this.w, 12); // will look weird but add central river band
    // Actually draw river diagonal correctly across view
    // use overlay
    ctx.fillStyle='rgba(58,123,213,0.6)';
    // vertical river stripe in middle
    const midX=mapW/2, midY=mapH/2;
    ctx.fillRect(midX-200 -this.cam.x, midY-2 -this.cam.y, 400, 4);
    ctx.fillRect(midX-2 -this.cam.x, midY-200 -this.cam.y, 4, 400);
    // lane borders
    ctx.strokeStyle='rgba(0,0,0,0.25)'; ctx.lineWidth=2;
    // jungle trees
    for(let i=0;i<80;i++){
      const x=(hash(i,0)*mapW)|0, y=(hash(i,1)*mapH)|0;
      // skip if on road
      const onRoad = (Math.abs(y-140)<30 || Math.abs(y-(mapH-140))<30 || Math.abs((x+y)-(mapW))<40 );
      if(onRoad || (x<220&&y>mapH-220) || (x>mapW-220&&y<220)) continue;
      const sx=x-this.cam.x, sy=y-this.cam.y;
      if(sx<-20||sy<-20||sx>this.w+20||sy>this.h+20) continue;
      // tree
      ctx.fillStyle='#1a4d2e'; ctx.fillRect(sx-6,sy-6,12,12);
      ctx.fillStyle='#0f2f1a'; ctx.fillRect(sx-4,sy-8,8,6);
    }
  }

  // pixel hero drawing
  drawHero(x,y, hero, isLocal){
    const p=this.worldToScreen(x,y);
    const ctx=this.ctx;
    const s=hero.size||18;
    // shadow
    ctx.fillStyle='rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(p.x,p.y+ s/2, s*0.7, s*0.35,0,0,Math.PI*2); ctx.fill();
    // body - 8x8 pixel art scaled
    const col=hero.color;
    const dark=shade(col,-30);
    // legs
    ctx.fillStyle=dark; ctx.fillRect(p.x-6,p.y+4,5,6); ctx.fillRect(p.x+1,p.y+4,5,6);
    // torso
    ctx.fillStyle=col; ctx.fillRect(p.x-7,p.y-8,14,12);
    ctx.fillStyle='#000'; ctx.fillRect(p.x-5,p.y-4,10,2); // belt
    // head
    ctx.fillStyle='#ffdbac'; ctx.fillRect(p.x-5,p.y-14,10,8);
    // eyes
    ctx.fillStyle='#000'; ctx.fillRect(p.x-3,p.y-11,2,2); ctx.fillRect(p.x+1,p.y-11,2,2);
    // hair / helmet accent
    ctx.fillStyle=dark; ctx.fillRect(p.x-5,p.y-16,10,3);
    // team outline
    ctx.strokeStyle=hero.team==='blue'?'#2a7fff':'#ff3b30'; ctx.lineWidth=2; ctx.strokeRect(p.x-9,p.y-16,18,26);
    // local indicator
    if(isLocal){
      ctx.fillStyle='#ffe600'; ctx.fillRect(p.x-2,p.y-22,4,4);
    }
    // hp bar
    const hpPct=Math.max(0, hero.hp/hero.maxHp);
    ctx.fillStyle='#000'; ctx.fillRect(p.x-14, p.y-24, 28,5);
    ctx.fillStyle= hpPct>0.5?'#2ecc71': hpPct>0.25?'#f1c40f':'#e74c3c';
    ctx.fillRect(p.x-13, p.y-23, 26*hpPct,3);
    // name
    ctx.fillStyle='#fff'; ctx.font='6px "Press Start 2P"'; ctx.textAlign='center';
    ctx.fillText(hero.name.slice(0,10), p.x, p.y-28);
    // level
    ctx.fillStyle='#ffe600'; ctx.font='6px monospace'; ctx.fillText('Lv'+hero.level, p.x, p.y+18);
  }

  drawMinion(x,y, team, hp, maxHp){
    const p=this.worldToScreen(x,y);
    const ctx=this.ctx;
    ctx.fillStyle='rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(p.x,p.y+6,8,4,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=team==='blue'?'#5da9ff':'#ff7a7a';
    ctx.fillRect(p.x-6,p.y-8,12,10);
    ctx.fillStyle='#000'; ctx.fillRect(p.x-5,p.y-4,10,2);
    ctx.fillStyle='#ffdbac'; ctx.fillRect(p.x-4,p.y-12,8,6);
    ctx.fillStyle='#000'; ctx.fillRect(p.x-2,p.y-10,1,1); ctx.fillRect(p.x+1,p.y-10,1,1);
    ctx.strokeStyle=team==='blue'?'#2a7fff':'#ff3b30'; ctx.lineWidth=1; ctx.strokeRect(p.x-6,p.y-12,12,18);
    const pct=hp/maxHp;
    ctx.fillStyle='#000'; ctx.fillRect(p.x-10,p.y-16,20,3);
    ctx.fillStyle='#2ecc71'; ctx.fillRect(p.x-9,p.y-15,18*pct,1);
  }

  drawTower(x,y, team, hp, maxHp){
    const p=this.worldToScreen(x,y);
    const ctx=this.ctx;
    ctx.fillStyle='rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(p.x,p.y+22,20,8,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=team==='blue'?'#2a7fff':'#ff3b30';
    ctx.fillRect(p.x-14, p.y-18, 28, 36);
    ctx.fillStyle='#222'; ctx.fillRect(p.x-16, p.y-22, 32, 6);
    ctx.fillStyle='#555'; ctx.fillRect(p.x-4, p.y-8, 8, 8);
    // hp
    const pct=hp/maxHp;
    ctx.fillStyle='#000'; ctx.fillRect(p.x-18,p.y-28,36,5);
    ctx.fillStyle= pct>0.5?'#2ecc71':'#e74c3c'; ctx.fillRect(p.x-17,p.y-27,34*pct,3);
  }

  drawNexus(x,y, team, hp, maxHp){
    const p=this.worldToScreen(x,y);
    const ctx=this.ctx;
    ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.ellipse(p.x,p.y+32,34,12,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=team==='blue'?'#1e5fff':'#cc2222';
    ctx.fillRect(p.x-24,p.y-24,48,48);
    ctx.fillStyle='#fff'; ctx.fillRect(p.x-8,p.y-8,16,16);
    ctx.fillStyle=team==='blue'?'#2a7fff':'#ff3b30'; ctx.fillRect(p.x-4,p.y-4,8,8);
    ctx.strokeStyle='#000'; ctx.lineWidth=3; ctx.strokeRect(p.x-24,p.y-24,48,48);
    const pct=hp/maxHp;
    ctx.fillStyle='#000'; ctx.fillRect(p.x-26,p.y-34,52,6);
    ctx.fillStyle='#e74c3c'; ctx.fillRect(p.x-25,p.y-33,50*pct,4);
  }

  drawProjectile(x,y, color){
    const p=this.worldToScreen(x,y);
    const ctx=this.ctx;
    ctx.fillStyle=color; ctx.beginPath(); ctx.arc(p.x,p.y,5,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(p.x-1,p.y-1,2,0,Math.PI*2); ctx.fill();
  }

  drawBuff(x,y){
    const p=this.worldToScreen(x,y);
    const ctx=this.ctx;
    const t=Date.now()/200;
    const bob=Math.sin(t)*4;
    ctx.fillStyle='#ffe600'; ctx.fillRect(p.x-6,p.y-10+bob,12,12);
    ctx.fillStyle='#fff'; ctx.fillRect(p.x-3,p.y-7+bob,6,6);
    ctx.fillStyle='#000'; ctx.fillRect(p.x-2,p.y-4+bob,4,2);
  }

  drawRangeIndicator(x,y, range){
    const p=this.worldToScreen(x,y);
    const ctx=this.ctx;
    ctx.strokeStyle='rgba(255,255,255,0.15)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.arc(p.x,p.y,range,0,Math.PI*2); ctx.stroke();
  }
}

function shade(hex, amt){
  let c=hex.replace('#','');
  let r=parseInt(c.substring(0,2),16)+amt;
  let g=parseInt(c.substring(2,4),16)+amt;
  let b=parseInt(c.substring(4,6),16)+amt;
  r=Math.max(0,Math.min(255,r)); g=Math.max(0,Math.min(255,g)); b=Math.max(0,Math.min(255,b));
  return `rgb(${r},${g},${b})`;
}
