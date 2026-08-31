export const HEROES = [
  {
    id:'flux',
    name:'ФЛЮКС',
    role:'Универсал',
    color:'#00ff9c',
    desc:'Баланс мощи и скорости. Мастер энергетических импульсов.',
    stats:{atk:7, def:6, spd:7, mag:7},
    maxHp:520, maxMp:280, atk:32, def:12, speed:170,
    range:150,
    abilities:{
      q:{name:'ИМПУЛЬС', desc:'Мощный выстрел энергией', dmg:85, cd:5, cost:30, range:280, type:'projectile'},
      w:{name:'ЩИТ ФЛЮКСА', desc:'+80 щита на 4с', dmg:0, cd:9, cost:40, type:'shield', shield:80},
      e:{name:'РЫВОК', desc:'Рывок вперёд + урон по пути', dmg:60, cd:7, cost:25, type:'dash'},
    }
  },
  {
    id:'ember',
    name:'ЭМБЕР',
    role:'Маг',
    color:'#ff4d00',
    desc:'Пламенный маг. Сжигает всё на линии.',
    stats:{atk:5, def:4, spd:5, mag:10},
    maxHp:440, maxMp:360, atk:26, def:8, speed:160,
    range:155,
    abilities:{
      q:{name:'ОГНЕННЫЙ ШАР', desc:'Шар огня с AoE взрывом', dmg:95, cd:6, cost:35, range:300, type:'projectile_aoe'},
      w:{name:'СТЕНА ОГНЯ', desc:'Линия огня 3 сек', dmg:55, cd:10, cost:50, type:'aoe'},
      e:{name:'ВОСПЛАМЕНЕНИЕ', desc:'Ускоряет себя + урон вокруг', dmg:40, cd:12, cost:30, type:'buff'},
    }
  },
  {
    id:'titan',
    name:'ТИТАН',
    role:'Танк',
    color:'#7a7a8c',
    desc:'Непробиваемый голем. Врывается и оглушает.',
    stats:{atk:8, def:10, spd:3, mag:3},
    maxHp:720, maxMp:200, atk:38, def:22, speed:145,
    range:95,
    abilities:{
      q:{name:'УДАР МОЛОТА', desc:'Ближний удар с оглушением', dmg:75, cd:6, cost:25, range:110, type:'melee_stun'},
      w:{name:'КРЕПОСТЬ', desc:'-50% урона на 3с', dmg:0, cd:11, cost:30, type:'fortify'},
      e:{name:'ТАРАН', desc:'Рывок с отбрасыванием', dmg:70, cd:8, cost:35, type:'dash_knock'},
    }
  },
  {
    id:'volt',
    name:'ВОЛЬТ',
    role:'Стрелок',
    color:'#ffe600',
    desc:'Сверхмобильный стрелок. Катует сквозь башни.',
    stats:{atk:9, def:3, spd:9, mag:4},
    maxHp:460, maxMp:240, atk:36, def:9, speed:185,
    range:165,
    abilities:{
      q:{name:'ДВОЙНОЙ ВЫСТРЕЛ', desc:'2 пули подряд', dmg:48, cd:4, cost:20, range:300, type:'double'},
      w:{name:'МИНА', desc:'Ставит мину-ловушку', dmg:110, cd:9, cost:35, type:'trap'},
      e:{name:'ПЕРЕКАТ', desc:'Рывок + невидимость 1с', dmg:0, cd:6, cost:20, type:'dash_stealth'},
    }
  },
  {
    id:'frost',
    name:'ФРОСТ',
    role:'Контроль',
    color:'#4dc9ff',
    desc:'Ледяная ведьма. Замедляет и замораживает.',
    stats:{atk:4, def:5, spd:6, mag:9},
    maxHp:480, maxMp:340, atk:24, def:10, speed:162,
    range:150,
    abilities:{
      q:{name:'ЛЕДЯНОЕ КОПЬЁ', desc:'Пробивает линию, замедляет', dmg:80, cd:5, cost:30, range:320, type:'pierce'},
      w:{name:'ВЬЮГА', desc:'AoE замедление + урон', dmg:50, cd:9, cost:40, type:'aoe_slow'},
      e:{name:'ЗАМОРОЗКА', desc:'Заморозить ближайшего врага', dmg:45, cd:10, cost:45, type:'freeze'},
    }
  },
  {
    id:'shade',
    name:'ШЕЙД',
    role:'Ассасин',
    color:'#b84dff',
    desc:'Тень из пикселей. Исчезает и бьёт в спину.',
    stats:{atk:10, def:4, spd:8, mag:6},
    maxHp:450, maxMp:260, atk:42, def:8, speed:178,
    range:85,
    abilities:{
      q:{name:'КЛИНОК ТЕНИ', desc:'Бросок клинка, возврат', dmg:90, cd:6, cost:30, range:250, type:'boomerang'},
      w:{name:'ИСЧЕЗНОВЕНИЕ', desc:'Невидимость 2с + крит', dmg:0, cd:12, cost:35, type:'stealth_crit'},
      e:{name:'ТЕНЕВОЙ ШАГ', desc:'Телепорт к курсору', dmg:55, cd:7, cost:25, type:'blink'},
    }
  },
];

export function getHero(id){ return HEROES.find(h=>h.id===id) || HEROES[0]; }
