export const clamp = (v,a,b)=> Math.max(a,Math.min(b,v));
export const lerp = (a,b,t)=> a+(b-a)*t;
export const dist = (a,b)=> Math.hypot(a.x-b.x, a.y-b.y);
export const dist2 = (ax,ay,bx,by)=> Math.hypot(ax-bx, ay-by);
export const rand = (a,b)=> Math.random()*(b-a)+a;
export const choice = arr=> arr[Math.floor(Math.random()*arr.length)];
export const now = ()=> performance.now();

export function aabb(x,y,w,h, cx,cy,r){
  return cx>=x && cx<=x+w && cy>=y && cy<=y+h;
}

// 8-bit palette
export const PAL = {
  grass: '#2d6a4f',
  grass2:'#40916c',
  dirt:'#8b5e3c',
  stone:'#555566',
  blue:'#2a7fff',
  red:'#ff3b30',
  yellow:'#ffe600',
  accent:'#00ff9c',
  white:'#e0e0e0',
};

// simple perlin-ish noise for decoration
export function hash(x,y){ return Math.abs(Math.sin(x*127.1 + y*311.7)*43758.5453)%1; }

export class Timer {
  constructor(){ this.t=0; }
  update(dt){ this.t+=dt; }
  every(ms, fn){ if(this.t>=ms){ this.t=0; fn(); return true;} return false; }
}
