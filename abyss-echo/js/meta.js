/* 局外成长与存档：点数、属性升级、内容解锁、统计 */
(function (G) {
  'use strict';

  var KEY = 'abyss-echo-meta-v1';

  var UPGRADES = [
    { id: 'maxHp',    name: '生命上限',  base: 40, max: 10, per: 4,     desc: '每级 +4 最大生命' },
    { id: 'atk',      name: '基础攻击',  base: 40, max: 10, per: 0.8,   desc: '每级 +0.8 攻击力' },
    { id: 'def',      name: '防御',      base: 50, max: 8,  per: 0.5,   desc: '每级 +0.5 防御' },
    { id: 'crit',     name: '暴击率',    base: 50, max: 8,  per: 0.4,   desc: '每级 +0.4% 暴击率' },
    { id: 'gold',     name: '初始金币',  base: 60, max: 5,  per: 12,    desc: '每级 +12 初始金币' },
    { id: 'regen',    name: '每层回复',  base: 70, max: 5,  per: 1.5,   desc: '每层回复 +1.5% 最大生命' },
    { id: 'goldGain', name: '金币获取',  base: 70, max: 5,  per: 4,     desc: '金币获取 +4%' },
    { id: 'resource', name: '初始资源',  base: 60, max: 5,  per: 5,     desc: '开局资源 +5' }
  ];

  var UNLOCKS = [
    { id: 'skill_warrior', name: '剑士 · 旋风斩', cost: 150, skill: 'whirlwind',   desc: '解锁剑士第三主动技能：240% 伤害，冷却 4 回合' },
    { id: 'skill_mage',    name: '法师 · 冰锥',   cost: 150, skill: 'icicle',      desc: '解锁法师第三主动技能：远程 140% 伤害，冷却 2 回合' },
    { id: 'skill_rogue',   name: '盗贼 · 毒刃',   cost: 150, skill: 'poisonblade', desc: '解锁盗贼第三主动技能：170% 伤害，冷却 2 回合' },
    { id: 'skill_priest',  name: '牧师 · 圣光',   cost: 150, skill: 'holylight',   desc: '解锁牧师第三主动技能：150% 伤害，冷却 3 回合' }
  ];

  var Meta = {
    data: null,

    load: function () {
      var raw = null;
      try { raw = localStorage.getItem(KEY); } catch (e) { raw = null; }

      if (raw) {
        try { this.data = JSON.parse(raw); } catch (e) { this.data = null; }
      }
      if (!this.data) this.data = this.defaults();

      this.migrate();
      this.save();
      return this.data;
    },

    defaults: function () {
      var upgrades = {};
      for (var i = 0; i < UPGRADES.length; i++) upgrades[UPGRADES[i].id] = 0;

      return {
        version: 1,
        points: 0,
        upgrades: upgrades,
        unlocks: [],
        usedCodes: [],
        stats: { runs: 0, wins: 0, kills: 0, bestFloor: 0, totalTurns: 0 }
      };
    },

    migrate: function () {
      var d = this.data;
      if (!d.upgrades) d.upgrades = {};
      for (var i = 0; i < UPGRADES.length; i++) {
        if (typeof d.upgrades[UPGRADES[i].id] !== 'number') d.upgrades[UPGRADES[i].id] = 0;
      }
      if (!d.unlocks) d.unlocks = [];
      if (!d.usedCodes) d.usedCodes = [];
      if (!d.stats) d.stats = { runs: 0, wins: 0, kills: 0, bestFloor: 0, totalTurns: 0 };
      d.version = 1;
    },

    save: function () {
      try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* 忽略 */ }
    },

    reset: function () {
      this.data = this.defaults();
      this.save();
    },

    /* ---------------- 点数 ---------------- */

    addPoints: function (n) {
      this.data.points += n;
      this.save();
    },

    spendPoints: function (n) {
      if (this.data.points < n) return false;
      this.data.points -= n;
      this.save();
      return true;
    },

    /* ---------------- 属性升级 ---------------- */

    upgradeDef: function (id) {
      for (var i = 0; i < UPGRADES.length; i++) {
        if (UPGRADES[i].id === id) return UPGRADES[i];
      }
      return null;
    },

    upgradeCost: function (id) {
      var def = this.upgradeDef(id);
      if (!def) return Infinity;
      var lv = this.data.upgrades[id] || 0;
      return Math.round(def.base * Math.pow(1.35, lv));
    },

    canUpgrade: function (id) {
      var def = this.upgradeDef(id);
      if (!def) return false;
      var lv = this.data.upgrades[id] || 0;
      if (lv >= def.max) return false;
      return this.data.points >= this.upgradeCost(id);
    },

    buyUpgrade: function (id) {
      if (!this.canUpgrade(id)) return false;
      var cost = this.upgradeCost(id);
      if (!this.spendPoints(cost)) return false;
      this.data.upgrades[id] = (this.data.upgrades[id] || 0) + 1;
      this.save();
      return true;
    },

    /* ---------------- 内容解锁 ---------------- */

    hasUnlock: function (id) {
      return this.data.unlocks.indexOf(id) >= 0;
    },

    unlockDef: function (id) {
      for (var i = 0; i < UNLOCKS.length; i++) {
        if (UNLOCKS[i].id === id) return UNLOCKS[i];
      }
      return null;
    },

    buyUnlock: function (id) {
      var def = this.unlockDef(id);
      if (!def || this.hasUnlock(id)) return false;
      if (!this.spendPoints(def.cost)) return false;
      this.data.unlocks.push(id);
      this.save();
      return true;
    },

    /* ---------------- 兑换码 ---------------- */

    redeemCode: function (code) {
      if (!window.EchoCode) return { ok: false, msg: '兑换模块未加载' };

      var res = window.EchoCode.decode(code);
      if (!res) return { ok: false, msg: '兑换码无效，请检查是否输入正确' };
      if (res.expired) return { ok: false, msg: '兑换码已过期' };
      if (res.points <= 0) return { ok: false, msg: '兑换码不含点数' };

      var clean = String(code).toUpperCase().replace(/[^0-9A-Z]/g, '');
      if (clean.indexOf('ECHO') === 0) clean = clean.slice(4);

      if (this.data.usedCodes.indexOf(clean) >= 0) {
        return { ok: false, msg: '该兑换码已经使用过了' };
      }

      this.data.usedCodes.push(clean);
      if (this.data.usedCodes.length > 200) this.data.usedCodes.shift();
      this.data.points += res.points;
      this.save();

      return { ok: true, points: res.points };
    },

    /* ---------------- 应用到角色 ---------------- */

    applyToPlayer: function (player) {
      var u = this.data.upgrades;

      player.maxHp += (u.maxHp || 0) * 4;
      player.hp = player.maxHp;
      player.atk += (u.atk || 0) * 0.8;
      player.def += (u.def || 0) * 0.5;
      player.crit += (u.crit || 0) * 0.004;
      player.gold = (player.gold || 0) + (u.gold || 0) * 12;
      player.resource = Math.min(player.resourceMax, player.resource + (u.resource || 0) * 5);

      player.metaRegen = (u.regen || 0) * 0.015;
      player.metaGoldGain = (u.goldGain || 0) * 0.04;

      for (var i = 0; i < UNLOCKS.length; i++) {
        var def = UNLOCKS[i];
        if (def.skill && this.hasUnlock(def.id) && player.skills.indexOf(def.skill) < 0) {
          player.skills.push(def.skill);
        }
      }
    },

    /* ---------------- 统计 ---------------- */

    recordRun: function (result) {
      var s = this.data.stats;
      s.runs++;
      if (result.won) s.wins++;
      s.kills += result.kills || 0;
      s.bestFloor = Math.max(s.bestFloor, result.floor || 0);
      s.totalTurns += result.turns || 0;
      this.save();
    },

    UPGRADES: UPGRADES,
    UNLOCKS: UNLOCKS
  };

  G.Meta = Meta;
})(window.Game = window.Game || {});
