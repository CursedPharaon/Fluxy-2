export class Input {
  constructor(canvas){
    this.keys=new Set();
    this.mouse={x:0,y:0,down:false, right:false};
    this.joy={x:0,y:0, active:false};
    this._listeners=[];
    window.addEventListener('keydown', e=>{
      this.keys.add(e.key.toLowerCase());
      if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(e.key.toLowerCase())) e.preventDefault();
    });
    window.addEventListener('keyup', e=> this.keys.delete(e.key.toLowerCase()));
    canvas.addEventListener('mousemove', e=>{
      const r=canvas.getBoundingClientRect();
      this.mouse.x=(e.clientX-r.left)*(canvas.width/r.width);
      this.mouse.y=(e.clientY-r.top)*(canvas.height/r.height);
    });
    canvas.addEventListener('mousedown', e=>{
      if(e.button===0) this.mouse.down=true;
      if(e.button===2) this.mouse.right=true;
    });
    window.addEventListener('mouseup', e=>{
      if(e.button===0) this.mouse.down=false;
      if(e.button===2) this.mouse.right=false;
    });
    canvas.addEventListener('contextmenu', e=> e.preventDefault());
    // joystick
    const joyEl=document.getElementById('joystick');
    const stick=document.getElementById('stick');
    if(joyEl){
      const handle=(e)=>{
        const r=joyEl.getBoundingClientRect();
        const cx=r.left+r.width/2, cy=r.top+r.height/2;
        const t=e.touches?e.touches[0]:e;
        let dx=(t.clientX-cx)/(r.width/2), dy=(t.clientY-cy)/(r.height/2);
        const len=Math.hypot(dx,dy);
        if(len>1){ dx/=len; dy/=len; }
        this.joy.x=dx; this.joy.y=dy; this.joy.active=len>0.2;
        if(stick) stick.style.transform=`translate(calc(-50% + ${dx*28}px), calc(-50% + ${dy*28}px))`;
      };
      const end=()=>{
        this.joy.x=0;this.joy.y=0;this.joy.active=false;
        if(stick) stick.style.transform='translate(-50%,-50%)';
      };
      joyEl.addEventListener('touchmove', handle,{passive:false});
      joyEl.addEventListener('touchstart', handle,{passive:false});
      joyEl.addEventListener('touchend', end);
      joyEl.addEventListener('touchcancel', end);
    }
    // mobile buttons
    document.querySelectorAll('#mobile-ctrl [data-m]').forEach(b=>{
      b.addEventListener('touchstart', e=>{ e.preventDefault(); this.keys.add(b.dataset.m); if(b.dataset.m==='atk') this.mouse.down=true; });
      b.addEventListener('touchend', e=>{ e.preventDefault(); this.keys.delete(b.dataset.m); if(b.dataset.m==='atk') this.mouse.down=false; });
    });
  }
  isDown(k){ return this.keys.has(k.toLowerCase()); }
  consume(k){ const v=this.keys.has(k.toLowerCase()); if(v) this.keys.delete(k.toLowerCase()); return v; }
  axis(){ // WASD + arrows + joystick
    let x=0,y=0;
    if(this.isDown('w')||this.isDown('arrowup')) y-=1;
    if(this.isDown('s')||this.isDown('arrowdown')) y+=1;
    if(this.isDown('a')||this.isDown('arrowleft')) x-=1;
    if(this.isDown('d')||this.isDown('arrowright')) x+=1;
    if(this.joy.active){ x+=this.joy.x; y+=this.joy.y; }
    const len=Math.hypot(x,y)||1;
    if(len>1){ x/=len; y/=len; }
    return {x,y};
  }
}
