/* 静态数据：职业 / 技能 / 怪物 / 楼层表 / 天赋 */
(function (G) {
  'use strict';

  /* ---------------- 职业 ---------------- */
  var CLASSES = {
    warrior: {
      id: 'warrior',
      name: '剑士',
      glyph: '剑',
      color: '#d8a24a',
      desc: '近战重装，靠攻击与受击积累怒气，打出高额重击。',
      base: { maxHp: 110, atk: 12, def: 6, crit: 0.05, move: 3 },
      resource: { id: 'rage', name: '怒气', max: 100, start: 0, regen: 0, onHit: 12, onHurt: 8 },
      skills: ['heavy']
    },
    mage: {
      id: 'mage',
      name: '法师',
      glyph: '法',
      color: '#5aa9d8',
      desc: '远程施法，法力自然恢复，以法术压制敌人。',
      base: { maxHp: 82, atk: 15, def: 3, crit: 0.06, move: 3 },
      resource: { id: 'mana', name: '法力', max: 30, start: 12, regen: 2 },
      skills: ['arcanebolt', 'firebolt']
    },
    rogue: {
      id: 'rogue',
      name: '盗贼',
      glyph: '贼',
      color: '#7ec07a',
      desc: '敏捷刺客，普攻积累连击，消耗连击打出爆发。',
      base: { maxHp: 92, atk: 13, def: 4, crit: 0.12, move: 4 },
      resource: { id: 'combo', name: '连击', max: 5, start: 0, regen: 0, onHit: 1 },
      skills: ['stab', 'shadowstep']
    },
    priest: {
      id: 'priest',
      name: '牧师',
      glyph: '牧',
      color: '#c8b6e8',
      desc: '信仰续航，普攻积累信仰，治疗与审判并用。',
      base: { maxHp: 96, atk: 11, def: 5, crit: 0.04, move: 3 },
      resource: { id: 'faith', name: '信仰', max: 40, start: 20, regen: 2 },
      skills: ['smite', 'mend']
    }
  };

  /* ---------------- 技能 ---------------- */
  var SKILLS = {
    heavy: {
      id: 'heavy', name: '重击', glyph: '重', color: '#e0713a',
      cost: 25, cd: 2, range: 1, mult: 1.8,
      desc: '消耗 25 怒气，造成 180% 攻击伤害。'
    },
    arcanebolt: {
      id: 'arcanebolt', name: '奥术飞弹', glyph: '弹', color: '#5aa9d8',
      cost: 0, cd: 0, range: 5, mult: 0.9,
      desc: '远程造成 90% 攻击伤害，不消耗法力。'
    },
    firebolt: {
      id: 'firebolt', name: '火球术', glyph: '火', color: '#e0663a',
      cost: 5, cd: 0, range: 5, mult: 1.6,
      desc: '消耗 5 法力，远程造成 160% 攻击伤害。'
    },
    stab: {
      id: 'stab', name: '刺击', glyph: '刺', color: '#7ec07a',
      cost: 1, cd: 0, range: 1, mult: 1.2,
      desc: '消耗 1 连击，造成 120% 攻击伤害。'
    },
    shadowstep: {
      id: 'shadowstep', name: '影步', glyph: '影', color: '#6a9a88',
      cost: 2, cd: 3, range: 1, mult: 2.2,
      desc: '消耗 2 连击，造成 220% 攻击伤害，冷却 3 回合。'
    },
    smite: {
      id: 'smite', name: '审判', glyph: '审', color: '#e8d48a',
      cost: 10, cd: 0, range: 1, mult: 1.4,
      desc: '消耗 10 信仰，造成 140% 攻击伤害。'
    },
    mend: {
      id: 'mend', name: '治疗', glyph: '愈', color: '#9fd8a8',
      cost: 12, cd: 2, range: 0, mult: 0, heal: 28,
      desc: '消耗 12 信仰，恢复 28 点生命。'
    },
    whirlwind: {
      id: 'whirlwind', name: '旋风斩', glyph: '旋', color: '#e0713a',
      cost: 40, cd: 4, range: 1, mult: 2.4,
      desc: '消耗 40 怒气，造成 240% 攻击伤害，冷却 4 回合。'
    },
    icicle: {
      id: 'icicle', name: '冰锥', glyph: '锥', color: '#6fc4e8',
      cost: 7, cd: 2, range: 4, mult: 1.4,
      desc: '消耗 7 法力，远程造成 140% 攻击伤害，冷却 2 回合。'
    },
    poisonblade: {
      id: 'poisonblade', name: '毒刃', glyph: '毒', color: '#7ec07a',
      cost: 2, cd: 2, range: 1, mult: 1.7,
      desc: '消耗 2 连击，造成 170% 攻击伤害，冷却 2 回合。'
    },
    holylight: {
      id: 'holylight', name: '圣光', glyph: '圣', color: '#e8d48a',
      cost: 15, cd: 3, range: 1, mult: 1.5,
      desc: '消耗 15 信仰，造成 150% 攻击伤害，冷却 3 回合。'
    }
  };

  /* ---------------- 怪物 ---------------- */
  var MONSTERS = {
    rat: { id: 'rat', name: '巨鼠', glyph: '鼠', color: '#b8544a', hp: 18, atk: 6, def: 1, exp: 6 },
    skeleton: { id: 'skeleton', name: '骷髅兵', glyph: '骷', color: '#9aa4b8', hp: 26, atk: 8, def: 3, exp: 9 },
    spider: { id: 'spider', name: '暗影蛛', glyph: '蛛', color: '#7a5aa8', hp: 22, atk: 9, def: 2, exp: 10 },
    brute: { id: 'brute', name: '石胄卫', glyph: '胄', color: '#8a7a5a', hp: 40, atk: 11, def: 5, exp: 16 }
  };

  var FLOOR_TABLE = [
    ['rat', 'rat', 'skeleton'],
    ['rat', 'skeleton', 'skeleton'],
    ['skeleton', 'spider'],
    ['spider', 'brute'],
    ['brute', 'spider'],
    ['brute', 'skeleton'],
    ['brute', 'brute', 'spider'],
    ['brute', 'brute']
  ];

  /* ---------------- 天赋 ---------------- */
  /* effect.type:
     stat / statPct / lifesteal / thorns / onKillHeal /
     critDmg / skillDmg / bonusDmg / resourceMax / resourceRegen */
  var TALENTS = {
    warrior: [
      { id: 'w0a', line: 0, name: '怒火', desc: '攻击力 +2', effect: { type: 'stat', stat: 'atk', value: 2 } },
      { id: 'w0b', line: 0, name: '嗜战', desc: '攻击力 +3', effect: { type: 'stat', stat: 'atk', value: 3 } },
      { id: 'w0c', line: 0, name: '狂怒', desc: '暴击伤害 +25%', effect: { type: 'critDmg', value: 0.25 } },
      { id: 'w0d', line: 0, name: '浴血', desc: '击杀回复 6 点生命', effect: { type: 'onKillHeal', value: 6 } },
      { id: 'w0e', line: 0, name: '血战', desc: '攻击力 +20%', effect: { type: 'statPct', stat: 'atk', value: 0.2 } },

      { id: 'w1a', line: 1, name: '坚壁', desc: '防御 +2', effect: { type: 'stat', stat: 'def', value: 2 } },
      { id: 'w1b', line: 1, name: '铁躯', desc: '最大生命 +15', effect: { type: 'stat', stat: 'maxHp', value: 15 } },
      { id: 'w1c', line: 1, name: '荆棘', desc: '受击时反弹 3 点伤害', effect: { type: 'thorns', value: 3 } },
      { id: 'w1d', line: 1, name: '盾墙', desc: '防御 +3', effect: { type: 'stat', stat: 'def', value: 3 } },
      { id: 'w1e', line: 1, name: '不破', desc: '最大生命 +25%', effect: { type: 'statPct', stat: 'maxHp', value: 0.25 } },

      { id: 'w2a', line: 2, name: '锐锋', desc: '暴击率 +6%', effect: { type: 'stat', stat: 'crit', value: 0.06 } },
      { id: 'w2b', line: 2, name: '重锤', desc: '攻击力 +4', effect: { type: 'stat', stat: 'atk', value: 4 } },
      { id: 'w2c', line: 2, name: '破甲', desc: '技能伤害 +15%', effect: { type: 'skillDmg', value: 0.15 } },
      { id: 'w2d', line: 2, name: '疾行', desc: '移动力 +1', effect: { type: 'stat', stat: 'move', value: 1 } },
      { id: 'w2e', line: 2, name: '斩尽', desc: '攻击力 +20%', effect: { type: 'statPct', stat: 'atk', value: 0.2 } }
    ],

    mage: [
      { id: 'm0a', line: 0, name: '火种', desc: '攻击力 +2', effect: { type: 'stat', stat: 'atk', value: 2 } },
      { id: 'm0b', line: 0, name: '炽焰', desc: '每次攻击附加 3 点伤害', effect: { type: 'bonusDmg', value: 3 } },
      { id: 'm0c', line: 0, name: '燎原', desc: '技能伤害 +15%', effect: { type: 'skillDmg', value: 0.15 } },
      { id: 'm0d', line: 0, name: '炎爆', desc: '攻击力 +4', effect: { type: 'stat', stat: 'atk', value: 4 } },
      { id: 'm0e', line: 0, name: '焚世', desc: '攻击力 +20%', effect: { type: 'statPct', stat: 'atk', value: 0.2 } },

      { id: 'm1a', line: 1, name: '寒霜', desc: '防御 +2', effect: { type: 'stat', stat: 'def', value: 2 } },
      { id: 'm1b', line: 1, name: '冰甲', desc: '最大生命 +12', effect: { type: 'stat', stat: 'maxHp', value: 12 } },
      { id: 'm1c', line: 1, name: '凝滞', desc: '移动力 +1', effect: { type: 'stat', stat: 'move', value: 1 } },
      { id: 'm1d', line: 1, name: '霜心', desc: '暴击率 +5%', effect: { type: 'stat', stat: 'crit', value: 0.05 } },
      { id: 'm1e', line: 1, name: '永冻', desc: '攻击力 +20%', effect: { type: 'statPct', stat: 'atk', value: 0.2 } },

      { id: 'm2a', line: 2, name: '法泉', desc: '法力上限 +10', effect: { type: 'resourceMax', value: 10 } },
      { id: 'm2b', line: 2, name: '涌流', desc: '每回合额外恢复 1 法力', effect: { type: 'resourceRegen', value: 1 } },
      { id: 'm2c', line: 2, name: '速咏', desc: '技能伤害 +15%', effect: { type: 'skillDmg', value: 0.15 } },
      { id: 'm2d', line: 2, name: '奥能', desc: '攻击力 +5', effect: { type: 'stat', stat: 'atk', value: 5 } },
      { id: 'm2e', line: 2, name: '虚空', desc: '攻击力 +25%', effect: { type: 'statPct', stat: 'atk', value: 0.25 } }
    ],

    rogue: [
      { id: 'r0a', line: 0, name: '利刃', desc: '暴击率 +6%', effect: { type: 'stat', stat: 'crit', value: 0.06 } },
      { id: 'r0b', line: 0, name: '穿刺', desc: '暴击伤害 +25%', effect: { type: 'critDmg', value: 0.25 } },
      { id: 'r0c', line: 0, name: '迅捷', desc: '攻击力 +3', effect: { type: 'stat', stat: 'atk', value: 3 } },
      { id: 'r0d', line: 0, name: '疾风', desc: '移动力 +1', effect: { type: 'stat', stat: 'move', value: 1 } },
      { id: 'r0e', line: 0, name: '致命', desc: '攻击力 +20%', effect: { type: 'statPct', stat: 'atk', value: 0.2 } },

      { id: 'r1a', line: 1, name: '轻身', desc: '移动力 +1', effect: { type: 'stat', stat: 'move', value: 1 } },
      { id: 'r1b', line: 1, name: '暗影', desc: '防御 +2', effect: { type: 'stat', stat: 'def', value: 2 } },
      { id: 'r1c', line: 1, name: '隐忍', desc: '最大生命 +12', effect: { type: 'stat', stat: 'maxHp', value: 12 } },
      { id: 'r1d', line: 1, name: '反射', desc: '受击时反弹 2 点伤害', effect: { type: 'thorns', value: 2 } },
      { id: 'r1e', line: 1, name: '无踪', desc: '攻击力 +20%', effect: { type: 'statPct', stat: 'atk', value: 0.2 } },

      { id: 'r2a', line: 2, name: '涂毒', desc: '每次攻击附加 3 点伤害', effect: { type: 'bonusDmg', value: 3 } },
      { id: 'r2b', line: 2, name: '腐蚀', desc: '攻击力 +3', effect: { type: 'stat', stat: 'atk', value: 3 } },
      { id: 'r2c', line: 2, name: '收割', desc: '击杀回复 5 点生命', effect: { type: 'onKillHeal', value: 5 } },
      { id: 'r2d', line: 2, name: '剧毒', desc: '暴击率 +5%', effect: { type: 'stat', stat: 'crit', value: 0.05 } },
      { id: 'r2e', line: 2, name: '万毒', desc: '攻击力 +25%', effect: { type: 'statPct', stat: 'atk', value: 0.25 } }
    ],

    priest: [
      { id: 'p0a', line: 0, name: '祷言', desc: '最大生命 +15', effect: { type: 'stat', stat: 'maxHp', value: 15 } },
      { id: 'p0b', line: 0, name: '恩泽', desc: '击杀回复 4 点生命', effect: { type: 'onKillHeal', value: 4 } },
      { id: 'p0c', line: 0, name: '庇护', desc: '防御 +2', effect: { type: 'stat', stat: 'def', value: 2 } },
      { id: 'p0d', line: 0, name: '生命', desc: '最大生命 +20%', effect: { type: 'statPct', stat: 'maxHp', value: 0.2 } },
      { id: 'p0e', line: 0, name: '神恩', desc: '最大生命 +25', effect: { type: 'stat', stat: 'maxHp', value: 25 } },

      { id: 'p1a', line: 1, name: '制裁', desc: '攻击力 +3', effect: { type: 'stat', stat: 'atk', value: 3 } },
      { id: 'p1b', line: 1, name: '圣裁', desc: '技能伤害 +15%', effect: { type: 'skillDmg', value: 0.15 } },
      { id: 'p1c', line: 1, name: '裁决', desc: '暴击率 +5%', effect: { type: 'stat', stat: 'crit', value: 0.05 } },
      { id: 'p1d', line: 1, name: '天罚', desc: '攻击力 +4', effect: { type: 'stat', stat: 'atk', value: 4 } },
      { id: 'p1e', line: 1, name: '终审', desc: '攻击力 +25%', effect: { type: 'statPct', stat: 'atk', value: 0.25 } },

      { id: 'p2a', line: 2, name: '苦行', desc: '攻击力 +4', effect: { type: 'stat', stat: 'atk', value: 4 } },
      { id: 'p2b', line: 2, name: '鞭笞', desc: '每次攻击附加 4 点伤害', effect: { type: 'bonusDmg', value: 4 } },
      { id: 'p2c', line: 2, name: '血誓', desc: '暴击伤害 +20%', effect: { type: 'critDmg', value: 0.2 } },
      { id: 'p2d', line: 2, name: '狂热', desc: '攻击力 +3', effect: { type: 'stat', stat: 'atk', value: 3 } },
      { id: 'p2e', line: 2, name: '殉道', desc: '攻击力 +25%', effect: { type: 'statPct', stat: 'atk', value: 0.25 } }
    ]
  };

  var LINES = {
    warrior: ['狂战', '守护', '破军'],
    mage: ['火焰', '冰霜', '奥术'],
    rogue: ['背刺', '影遁', '毒刃'],
    priest: ['圣愈', '审判', '苦修']
  };

  /* ---------------- 装备 ---------------- */
  var SLOT_KEYS = ['weapon', 'offhand', 'head', 'body', 'trinket1', 'trinket2'];

  var SLOT_NAMES = {
    weapon: '武器',
    offhand: '副手',
    head: '头部',
    body: '身体',
    trinket1: '饰品 I',
    trinket2: '饰品 II'
  };

  var RARITIES = [
    { id: 0, name: '普通', color: '#9aa4b8', affixes: 1, mult: 1.0 },
    { id: 1, name: '精良', color: '#7ec07a', affixes: 2, mult: 1.35 },
    { id: 2, name: '稀有', color: '#5aa9d8', affixes: 3, mult: 1.8 },
    { id: 3, name: '史诗', color: '#b07ae8', affixes: 4, mult: 2.4 }
  ];

  var AFFIXES = {
    atk:         { name: '攻击',     min: 1,    max: 3,    pct: false },
    def:         { name: '防御',     min: 1,    max: 2,    pct: false },
    maxHp:       { name: '生命',     min: 6,    max: 14,   pct: false },
    crit:        { name: '暴击',     min: 0.02, max: 0.05, pct: true  },
    move:        { name: '移动',     min: 1,    max: 1,    pct: false },
    lifesteal:   { name: '吸血',     min: 0.04, max: 0.08, pct: true  },
    thorns:      { name: '反伤',     min: 1,    max: 3,    pct: false },
    bonusDmg:    { name: '附加伤害', min: 1,    max: 3,    pct: false },
    skillDmg:    { name: '技能伤害', min: 0.06, max: 0.12, pct: true  },
    critDmg:     { name: '暴击伤害', min: 0.10, max: 0.20, pct: true  },
    resourceMax: { name: '资源上限', min: 4,    max: 10,   pct: false }
  };

  var ITEM_BASE_NAMES = {
    weapon:   ['短剑', '战斧', '法杖', '匕首', '长枪'],
    offhand:  ['圆盾', '法典', '副刃', '护符'],
    head:     ['头盔', '兜帽', '头冠'],
    body:     ['胸甲', '长袍', '皮甲'],
    trinket1: ['戒指', '项链', '护符'],
    trinket2: ['戒指', '项链', '护符']
  };

  /* ---------------- 随机事件 ---------------- */
  var EVENTS = [
    {
      id: 'altar',
      title: '血色祭坛',
      desc: '一座低语着的祭坛，似乎渴求鲜血。',
      options: [
        { text: '献祭 15% 生命，攻击 +3', effect: { hpPct: 0.15, atk: 3 } },
        { text: '转身离开', effect: {} }
      ]
    },
    {
      id: 'spring',
      title: '静谧之泉',
      desc: '泉水泛着微光，似乎能治愈伤口。',
      options: [
        { text: '饮用泉水，恢复 30% 生命', effect: { healPct: 0.3 } },
        { text: '灌装带走，换取 25 金币', effect: { gold: 25 } }
      ]
    },
    {
      id: 'gambler',
      title: '蒙面赌徒',
      desc: '他摇晃着骰盅：“押 20，赢了拿 60。”',
      options: [
        { text: '押上 20 金币', effect: { gamble: { cost: 20, win: 60, chance: 0.45 } } },
        { text: '不赌', effect: {} }
      ]
    },
    {
      id: 'forge',
      title: '废弃锻炉',
      desc: '炉火未熄，还能锻造些什么。',
      options: [
        { text: '锻打武器，攻击 +4', effect: { atk: 4 } },
        { text: '搜寻废料，获得 20 金币', effect: { gold: 20 } }
      ]
    },
    {
      id: 'curse',
      title: '低语雕像',
      desc: '雕像许诺力量，代价是脆弱。',
      options: [
        { text: '接受：攻击 +6，防御 -3', effect: { atk: 6, def: -3 } },
        { text: '拒绝', effect: {} }
      ]
    }
  ];

  G.DATA = {
    CLASSES: CLASSES,
    SLOT_KEYS: SLOT_KEYS,
    SLOT_NAMES: SLOT_NAMES,
    RARITIES: RARITIES,
    AFFIXES: AFFIXES,
    ITEM_BASE_NAMES: ITEM_BASE_NAMES,
    EVENTS: EVENTS,
    SKILLS: SKILLS,
    MONSTERS: MONSTERS,
    FLOOR_TABLE: FLOOR_TABLE,
    TALENTS: TALENTS,
    LINES: LINES,
    MAX_FLOOR: 8,

    expForLevel: function (level) {
      return 18 + (level - 1) * 14;
    },

    monstersForFloor: function (floor) {
      return Math.min(14, 6 + floor);
    }
  };
})(window.Game = window.Game || {});
