// Simple 8-bit chiptune via WebAudio
export class AudioEngine {
  constructor(){
    this.ctx=null;
    this.enabled=true;
    this.volume=0.6;
  }
  init(){
    if(this.ctx) return;
    try{ this.ctx=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){ this.enabled=false; }
  }
  setVolume(v){ this.volume=v/100; }
  _tone(freq, dur, type='square', vol=0.3, slideTo){
    if(!this.enabled||!this.ctx) return;
    const o=this.ctx.createOscillator();
    const g=this.ctx.createGain();
    o.type=type; o.frequency.value=freq;
    if(slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, this.ctx.currentTime+dur);
    g.gain.value=vol*this.volume;
    g.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime+dur);
    o.connect(g).connect(this.ctx.destination);
    o.start(); o.stop(this.ctx.currentTime+dur);
  }
  sfx(name){
    this.init();
    if(!this.enabled) return;
    if(this.ctx.state==='suspended') this.ctx.resume();
    switch(name){
      case 'shoot': this._tone(880,0.08,'square',0.25,440); break;
      case 'hit': this._tone(200,0.12,'square',0.35,80); break;
      case 'skill': this._tone(600,0.2,'square',0.3,1200); break;
      case 'heal': this._tone(500,0.3,'triangle',0.3,900); break;
      case 'coin': this._tone(900,0.12,'square',0.25,1400); break;
      case 'dead': this._tone(300,0.5,'sawtooth',0.3,40); break;
      case 'tower': this._tone(120,0.25,'square',0.4,60); break;
      case 'win': [523,659,784,1046].forEach((f,i)=> setTimeout(()=>this._tone(f,0.25,'square',0.3), i*140)); break;
      case 'lose': [400,350,300,200].forEach((f,i)=> setTimeout(()=>this._tone(f,0.3,'triangle',0.25), i*180)); break;
      case 'select': this._tone(700,0.08,'square',0.2); break;
      default: this._tone(440,0.1,'square',0.2);
    }
  }
  // background arpeggio loop
  playMusic(on=true){
    // lightweight loop using setInterval
    if(this._musicInt) clearInterval(this._musicInt);
    if(!on||!this.enabled) return;
    this.init();
    const seq=[262,330,392,523,392,330];
    let i=0;
    this._musicInt=setInterval(()=>{
      if(!this.enabled) return;
      this._tone(seq[i%seq.length],0.18,'triangle',0.06);
      i++;
    },220);
  }
  stopMusic(){ if(this._musicInt) clearInterval(this._musicInt); this._musicInt=null; }
}
export const audio = new AudioEngine();
