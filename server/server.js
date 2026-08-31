import { WebSocketServer } from 'ws';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const PORT_WS = process.env.PORT ? Number(process.env.PORT) : 3001;
const PORT_HTTP = 3000;

// --- Simple static file server for local dev (optional) ---
const MIME = {
  '.html':'text/html', '.js':'text/javascript', '.css':'text/css',
  '.json':'application/json', '.png':'image/png', '.jpg':'image/jpeg',
  '.svg':'image/svg+xml', '.ico':'image/x-icon', '.wav':'audio/wav'
};

const httpServer = http.createServer((req,res)=>{
  let url = req.url.split('?')[0];
  if(url === '/') url='/index.html';
  const filePath = path.join(ROOT, url);
  // prevent path traversal
  if(!filePath.startsWith(ROOT)){
    res.writeHead(403); res.end('Forbidden'); return;
  }
  fs.readFile(filePath, (err,data)=>{
    if(err){
      res.writeHead(404, {'Content-Type':'text/plain'});
      res.end('Not found: '+ url);
      return;
    }
    const ext=path.extname(filePath);
    res.writeHead(200, {'Content-Type': MIME[ext]||'application/octet-stream', 'Cache-Control':'no-cache'});
    res.end(data);
  });
});

httpServer.listen(PORT_HTTP, ()=> console.log(`[Fluxy2 HTTP] http://localhost:${PORT_HTTP}`));
httpServer.on('error', e=> {
  if(e.code==='EADDRINUSE') console.log(`HTTP ${PORT_HTTP} busy, WS only`);
  else console.error(e);
});

// --- WebSocket MOBA lobby server ---
const wss = new WebSocketServer({ port: PORT_WS });

console.log(`[Fluxy2 WS] ws://localhost:${PORT_WS}`);

const rooms = new Map(); // roomId -> {blue:[], red:[], clients:Set}

function getRoom(roomId){
  if(!rooms.has(roomId)) rooms.set(roomId, { blue:[], red:[], clients:new Set(), readyCount:0 });
  return rooms.get(roomId);
}

function broadcast(roomId, data){
  const room=rooms.get(roomId);
  if(!room) return;
  const msg=JSON.stringify(data);
  for(const ws of room.clients){
    if(ws.readyState===1) ws.send(msg);
  }
}

function assignTeam(room, player){
  // balance 3v3
  if(room.blue.length <= room.red.length && room.blue.length < 3) room.blue.push(player);
  else if(room.red.length < 3) room.red.push(player);
  else room.blue.push(player); // fallback
}

wss.on('connection', (ws)=>{
  let player=null;
  let roomId=null;

  ws.on('message', (buf)=>{
    let msg; try{ msg=JSON.parse(buf.toString()); }catch(e){ return; }

    if(msg.type==='join'){
      roomId = (msg.room||'ROOM').toUpperCase().slice(0,12);
      const room=getRoom(roomId);
      // prevent duplicate names?
      if(room.clients.size >= 6){
        ws.send(JSON.stringify({type:'error', message:'Комната заполнена (6/6)'}));
        return;
      }
      player={
        id: Math.random().toString(36).slice(2,8),
        name: (msg.name||'Игрок').slice(0,12) || 'Игрок',
        heroId: msg.heroId||'flux',
        ready:false,
        ws,
        isBot:false
      };
      ws._player=player; ws._room=roomId;
      room.clients.add(ws);
      assignTeam(room, player);
      ws.send(JSON.stringify({type:'joined', id:player.id, room:roomId, teams: {blue: room.blue.map(p=>({id:p.id,name:p.name,heroId:p.heroId,ready:p.ready})), red: room.red.map(p=>({id:p.id,name:p.name,heroId:p.heroId,ready:p.ready}))}}));
      broadcast(roomId, {type:'room', teams:{blue: room.blue.map(p=>({id:p.id,name:p.name,heroId:p.heroId,ready:p.ready})), red: room.red.map(p=>({id:p.id,name:p.name,heroId:p.heroId,ready:p.ready}))}, status:`Игроков ${room.clients.size}/6 • Нажмите ГОТОВ`});
      console.log(`[JOIN] ${player.name} -> ${roomId} (${room.clients.size}/6)`);

      // auto-fill bots if 1 player and waiting? not yet
    }

    if(msg.type==='ready' && player && roomId){
      const room=rooms.get(roomId);
      player.ready=!player.ready;
      broadcast(roomId, {type:'room', teams:{blue: room.blue.map(p=>({id:p.id,name:p.name,heroId:p.heroId,ready:p.ready})), red: room.red.map(p=>({id:p.id,name:p.name,heroId:p.heroId,ready:p.ready}))}, status: player.ready? `${player.name} готов!` : `${player.name} не готов`});
      // check if all ready and at least 2 players? For demo, start when all present are ready and >=1
      const total=room.clients.size;
      const readyCount=[...room.blue, ...room.red].filter(p=>p.ready).length;
      if(readyCount===total && total>=1){
        // fill bots to 6
        const needBlue=3-room.blue.length, needRed=3-room.red.length;
        const heroes=['ember','titan','volt','frost','shade','flux'];
        let hi=0;
        for(let i=0;i<needBlue;i++) room.blue.push({id:'bot'+Math.random().toString(36).slice(2,5), name:'Бот-'+(hi+1), heroId:heroes[hi++%heroes.length], ready:true, isBot:true});
        for(let i=0;i<needRed;i++) room.red.push({id:'bot'+Math.random().toString(36).slice(2,5), name:'Бот-'+(hi+1), heroId:heroes[hi++%heroes.length], ready:true, isBot:true});
        // broadcast start to each client individually with their id
        for(const client of room.clients){
          client.send(JSON.stringify({type:'start', teams:{blue: room.blue.map(p=>({id:p.id,name:p.name,heroId:p.heroId,isBot:!!p.isBot,ready:p.ready})), red: room.red.map(p=>({id:p.id,name:p.name,heroId:p.heroId,isBot:!!p.isBot,ready:p.ready}))}, you: client._player.id, room: roomId}));
        }
        console.log(`[START] room ${roomId} with ${room.blue.length} vs ${room.red.length}`);
        // optional: clear room after start (or keep for next game)
        // we keep but reset ready for rematch
        setTimeout(()=>{
          // reset for next match if players stay
          [...room.blue, ...room.red].forEach(p=> p.ready=false);
          // remove bots (they will be re-added next ready)
          room.blue=room.blue.filter(p=>!p.isBot);
          room.red=room.red.filter(p=>!p.isBot);
        }, 2000);
      }
    }

    if(msg.type==='input' && player && roomId){
      // relay input to other players in room (for authoritative server later)
      const room=rooms.get(roomId);
      for(const c of room.clients){
        if(c!==ws && c.readyState===1) c.send(JSON.stringify({type:'state', from:player.id, input:msg}));
      }
    }
  });

  ws.on('close', ()=>{
    if(roomId && rooms.has(roomId)){
      const room=rooms.get(roomId);
      room.clients.delete(ws);
      if(player){
        room.blue=room.blue.filter(p=>p.id!==player.id);
        room.red=room.red.filter(p=>p.id!==player.id);
        broadcast(roomId, {type:'room', teams:{blue: room.blue.map(p=>({id:p.id,name:p.name,heroId:p.heroId,ready:p.ready})), red: room.red.map(p=>({id:p.id,name:p.name,heroId:p.heroId,ready:p.ready}))}, status:`${player.name} вышел`});
      }
      if(room.clients.size===0) rooms.delete(roomId);
      console.log(`[LEAVE] ${player?.name||'unknown'} from ${roomId}`);
    }
  });
});

// graceful
process.on('SIGINT', ()=>{ wss.close(); httpServer.close(); process.exit(0); });
