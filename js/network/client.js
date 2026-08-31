import { CONFIG } from '../config.js';

export class NetClient {
  constructor({onState, onRoomUpdate, onError}){
    this.ws=null;
    this.connected=false;
    this.roomId=null;
    this.playerId=null;
    this.onState=onState;
    this.onRoomUpdate=onRoomUpdate;
    this.onError=onError;
    this.reconnectTimer=null;
  }
  connect(roomId='ROOM', name='Игрок', heroId='flux'){
    this.roomId=roomId; this.heroId=heroId; this.name=name;
    const url=CONFIG.WS_URL;
    try{
      this.ws=new WebSocket(url);
    }catch(e){ this.onError?.('WS не поддерживается'); return; }
    this.ws.onopen=()=>{
      this.connected=true;
      this.ws.send(JSON.stringify({type:'join', room:roomId, name, heroId}));
      this.onRoomUpdate?.({status:'Подключено! Ожидание игроков...'});
    };
    this.ws.onmessage=(ev)=>{
      try{
        const msg=JSON.parse(ev.data);
        this._handle(msg);
      }catch(e){}
    };
    this.ws.onclose=()=>{
      this.connected=false;
      this.onRoomUpdate?.({status:'Отключено. Оффлайн режим доступен.'});
      // auto reconnect attempt once
      if(!this.reconnectTimer){
        this.reconnectTimer=setTimeout(()=>{ this.reconnectTimer=null; }, 3000);
      }
    };
    this.ws.onerror=()=>{
      this.onError?.('Не удалось подключиться к серверу. Играем офлайн.');
      this.onRoomUpdate?.({status:'Сервер недоступен — офлайн с ботами'});
    };
  }
  _handle(msg){
    switch(msg.type){
      case 'joined': this.playerId=msg.id; this.onRoomUpdate?.({teams:msg.teams, you:msg.id, status:`В комнате ${msg.room} — ждём 6 игроков`}); break;
      case 'room': this.onRoomUpdate?.({teams:msg.teams, status:msg.status}); break;
      case 'start': this.onState?.('start', msg); break;
      case 'state': this.onState?.('state', msg); break;
      case 'error': this.onError?.(msg.message); break;
    }
  }
  send(type, data){
    if(this.ws && this.ws.readyState===1){
      this.ws.send(JSON.stringify({type, ...data}));
    }
  }
  ready(){ this.send('ready', {}); }
  leave(){
    try{ this.ws?.close(); }catch(e){}
    this.connected=false;
  }
  // during game, send inputs
  sendInput(inp){
    this.send('input', inp);
  }
}
