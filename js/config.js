export const CONFIG = {
  MAP_W: 1600,
  MAP_H: 1000,
  TICK_RATE: 60,
  MINION_SPAWN_INTERVAL: 25000,
  GOLD_TICK: 2,
  RESPAWN_TIME: 6000,
  TOWER_RANGE: 170,
  TOWER_DAMAGE: 28,
  NEXUS_HP: 2500,
  TOWER_HP: 900,
  MINION_HP: 110,
  HERO_BASE_SPEED: 170,
  PROJECTILE_SPEED: 520,
  CAMERA_LERP: 0.12,
  WS_URL: (() => {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    // if served from vite/serve, ws is on same host port 3001 else fallback
    return `${proto}//${location.hostname}:3001`;
  })(),
};
