import { Renderer } from './engine/renderer.js';
import { Input } from './engine/input.js';
import { Game } from './game/game.js';
import { UIManager } from './ui/menu.js';
import { HUD } from './ui/hud.js';
import { HEROES } from './data/heroes.js';
import { NetClient } from './network/client.js';
import { audio } from './engine/audio.js';

const canvas=document.getElementById('game-canvas');
const minimap=document.getElementById('minimap');
const renderer=new Renderer(canvas);
const input=new Input(canvas);
const hud=new HUD();

let game=null;
let rafId=null;
let lastFpsUpdate=0;
let frameCount=0;
let curFps=60;
let net=null;
let selectedHeroId='flux';

const ui=new UIManager({
  onPlayOffline: (heroId, name)=>{
    selectedHeroId=heroId;
    startOffline(heroId, name);
  },
  onPlayOnline: ()=>{
    setupLobby();
  }
});

function buildTeamsOffline(localHeroId, localName){
  // pick 2 random allies + 3 enemies
  const pool=[...HEROES];
  const local=pool.find(h=>h.id===localHeroId) || pool[0];
  const others=pool.filter(h=>h.id!==localHeroId);
  // shuffle
  for(let i=others.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [others[i],others[j]]=[others[j],others[i]]; }
  const blue=[
    {heroId:local.id, name:localName, isLocal:true},
    {heroId:others[0].id, name:others[0].name, isBot:true},
    {heroId:others[1].id, name:others[1].name, isBot:true},
  ];
  const red=[
    {heroId:others[2].id, name:others[2].name, isBot:true},
    {heroId:others[3].id, name:others[3].name, isBot:true},
    {heroId:others[4].id, name:others[4].name, isBot:true},
  ];
  return {blue, red};
}

function startOffline(heroId, name){
  audio.init(); audio.playMusic(true);
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById('screen-game').classList.add('active');
  renderer.resize();
  const teams=buildTeamsOffline(heroId, name);
  game=new Game({
    renderer, input, mode:'offline', localHeroId:heroId, localName:name,
    onEvent:(type, data)=>{
      if(type==='killfeed') hud.pushKillfeed(data);
      if(type==='gameEnd'){
        setTimeout(()=> ui.showResult(data), 800);
        audio.stopMusic();
        cancelAnimationFrame(rafId);
      }
    }
  });
  game.init(teams);
  loop();
  // pause btn
  document.getElementById('btn-pause').onclick=()=>{
    game.paused=!game.paused;
    document.getElementById('btn-pause').textContent= game.paused? '▶ ПРОДОЛЖИТЬ' : 'II ПАУЗА';
  };
}

function loop(){
  const now=performance.now();
  const dt=Math.min(0.033, (now - (game.lastLoop||now))/1000);
  game.lastLoop=now;
  game.update(dt);
  game.render();
  game.renderMinimap(minimap);
  hud.update(game.getStateForHUD(), curFps);
  // fps counter
  frameCount++;
  if(now - lastFpsUpdate > 500){
    curFps = frameCount * 1000 / (now - lastFpsUpdate);
    lastFpsUpdate=now; frameCount=0;
  }
  if(game.running) rafId=requestAnimationFrame(loop);
}

// LOBBY / ONLINE
function setupLobby(){
  const statusEl=document.getElementById('lobby-status');
  const teamBlue=document.getElementById('team-blue');
  const teamRed=document.getElementById('team-red');
  const inputName=document.getElementById('input-name');
  const inputRoom=document.getElementById('input-room');
  const btnReady=document.getElementById('btn-ready');
  const btnJoin=document.getElementById('btn-join-room');
  inputName.value=localStorage.getItem('fluxy_name')||'';
  inputRoom.value=localStorage.getItem('fluxy_room')||'ROOM1';
  let ready=false;

  function renderTeams(teams){
    if(!teams) return;
    teamBlue.innerHTML=''; teamRed.innerHTML='';
    (teams.blue||[]).forEach(p=>{
      const li=document.createElement('li');
      li.className=p.ready?'ready':'';
      li.innerHTML=`<span>${p.name} — ${p.heroId}</span><span>${p.ready?'✓':''}</span>`;
      teamBlue.appendChild(li);
    });
    (teams.red||[]).forEach(p=>{
      const li=document.createElement('li');
      li.className=p.ready?'ready':'';
      li.innerHTML=`<span>${p.name} — ${p.heroId}</span><span>${p.ready?'✓':''}</span>`;
      teamRed.appendChild(li);
    });
  }

  net=new NetClient({
    onRoomUpdate: (data)=>{
      if(data.status) statusEl.textContent=data.status;
      if(data.teams) renderTeams(data.teams);
    },
    onState: (type, msg)=>{
      if(type==='start'){
        // server says start game with given teams
        audio.init(); audio.playMusic(true);
        document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
        document.getElementById('screen-game').classList.add('active');
        renderer.resize();
        // mark local
        const teams=msg.teams;
        // ensure local hero is marked
        game=new Game({
          renderer, input, mode:'online', localHeroId: selectedHeroId, localName: inputName.value||'Игрок',
          onEvent:(t,d)=>{
            if(t==='killfeed') hud.pushKillfeed(d);
            if(t==='gameEnd'){ setTimeout(()=> ui.showResult(d),800); audio.stopMusic(); cancelAnimationFrame(rafId);}
          }
        });
        // convert
        const toTeam=(arr)=> arr.map(p=> ({heroId:p.heroId, name:p.name, isLocal: p.id===msg.you, isBot: p.isBot}));
        game.init({blue: toTeam(teams.blue), red: toTeam(teams.red)});
        loop();
      }
    },
    onError:(msg)=>{
      statusEl.textContent=msg;
      // fallback button to start offline
      const fallback=document.createElement('button');
      fallback.className='pixel-btn small';
      fallback.textContent='ИГРАТЬ ОФФЛАЙН';
      fallback.onclick=()=> {
        const hid= ui.selected?.id || selectedHeroId;
        const name=inputName.value.trim()||'Игрок';
        startOffline(hid, name);
      };
      statusEl.appendChild(document.createElement('br'));
      statusEl.appendChild(fallback);
    }
  });

  btnJoin.onclick=()=>{
    const name=inputName.value.trim()||'Игрок';
    const room=(inputRoom.value.trim()||'ROOM1').toUpperCase();
    const heroId= ui.selected?.id || 'flux';
    selectedHeroId=heroId;
    localStorage.setItem('fluxy_name', name);
    localStorage.setItem('fluxy_room', room);
    statusEl.textContent='Подключение...';
    net.connect(room, name, heroId);
  };
  btnReady.onclick=()=>{
    ready=!ready;
    btnReady.textContent= ready ? 'ГОТОВ ✓' : 'ГОТОВ';
    btnReady.style.background= ready ? '#00ff9c' : '';
    net.ready();
  };
}

// global fallback: if directly opened game screen without lobby, allow offline start via hero select
document.getElementById('btn-start-battle')?.addEventListener('click', ()=>{
  // handled in UIManager already, but ensure audio
  audio.init();
});

// handle visibility: pause when hidden
document.addEventListener('visibilitychange', ()=>{
  if(game && document.hidden) game.paused=true;
});

// initial music hint - play on first click
window.addEventListener('click', ()=>{ audio.init(); }, {once:true});

// expose for debug
window.FLUXY={ startOffline, HEROES };
