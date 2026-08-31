import { CONFIG } from '../config.js';

export const MAP = {
  w: CONFIG.MAP_W,
  h: CONFIG.MAP_H,
  bases: {
    blue:{x:120, y: CONFIG.MAP_H-120},
    red:{x: CONFIG.MAP_W-120, y:120},
  },
  towers:{
    blue:[
      {x:240, y:140, lane:'top'},
      {x:340, y: CONFIG.MAP_H-160, lane:'bot'},
      {x:200, y: CONFIG.MAP_H-300, lane:'mid1'},
      {x:300, y: CONFIG.MAP_H-400, lane:'mid2'},
    ],
    red:[
      {x: CONFIG.MAP_W-340, y:160, lane:'top2'},
      {x: CONFIG.MAP_W-240, y: CONFIG.MAP_H-140, lane:'bot2'},
      {x: CONFIG.MAP_W-200, y:300, lane:'mid1'},
      {x: CONFIG.MAP_W-300, y:400, lane:'mid2'},
    ]
  },
  nexus:{
    blue:{x:100, y: CONFIG.MAP_H-100},
    red:{x: CONFIG.MAP_W-100, y:100},
  },
  buffs:[
    {x: CONFIG.MAP_W/2, y: CONFIG.MAP_H/2},
    {x: CONFIG.MAP_W/2 -180, y: CONFIG.MAP_H/2 +120},
    {x: CONFIG.MAP_W/2 +180, y: CONFIG.MAP_H/2 -120},
  ],
  // path waypoints for minions per lane
  lanes:{
    top: [{x:120,y:140},{x: CONFIG.MAP_W-120,y:140}],
    bot: [{x:120,y:CONFIG.MAP_H-140},{x: CONFIG.MAP_W-120,y:CONFIG.MAP_H-140}],
    mid: [{x:120,y:CONFIG.MAP_H-120},{x: CONFIG.MAP_W/2,y:CONFIG.MAP_H/2},{x:CONFIG.MAP_W-120,y:120}],
  }
};

export function getSpawnPos(team, index){
  const base = MAP.bases[team];
  const offs=[[ -30,-10],[0,20],[30,-10]];
  const o=offs[index%3];
  return {x: base.x + o[0], y: base.y + o[1]};
}
