/* 战斗计算与角色工厂 */
(function (G) {
  'use strict';

  /**
   * 伤害 = 攻击 * 倍率 * 暴击倍率 * (1 - 防御减伤)
   * 防御减伤 = def / (def + 40)
   */
  function rollDamage(rng, atk, def, mult, critRate, critDmgBonus) {
    var crit = rng.chance(critRate || 0);
    var critMult = crit ? (1.5 + (critDmgBonus || 0)) : 1;
    var raw = atk * mult * critMult;
    var reduce = def / (def + 40);
    var dmg = Math.max(1, Math.round(raw * (1 - reduce)));
    return { dmg: dmg, crit: crit };
  }

  function makeMonster(rng, typeId, floor) {
    var t = G.DATA.MONSTERS[typeId];
    var scale = 1 + (floor - 1) * 0.22;
    var expScale = 1 + (floor - 1) * 0.18;

    return {
      type: t.id,
      name: t.name,
      glyph: t.glyph,
      color: t.color,
      hp: Math.round(t.hp * scale),
      maxHp: Math.round(t.hp * scale),
      atk: Math.round(t.atk * scale),
      def: Math.round(t.def * scale),
      exp: Math.round(t.exp * expScale),
      x: 0,
      y: 0,
      alive: true
    };
  }

  function makePlayer(classId) {
    var c = G.DATA.CLASSES[classId] || G.DATA.CLASSES.warrior;
    return {
      classId: c.id,
      name: c.name,
      glyph: c.glyph,
      color: c.color,
      desc: c.desc,
      maxHp: c.base.maxHp,
      hp: c.base.maxHp,
      atk: c.base.atk,
      def: c.base.def,
      crit: c.base.crit,
      move: c.base.move,
      level: 1,
      exp: 0,
      x: 0,
      y: 0,
      resource: c.resource.start,
      resourceMax: c.resource.max,
      resourceName: c.resource.name,
      resourceId: c.resource.id,
      resourceRegen: c.resource.regen || 0,
      resourceOnHit: c.resource.onHit || 0,
      resourceOnHurt: c.resource.onHurt || 0,
      skills: c.skills.slice(),
      talents: [],
      mods: {
        lifesteal: 0,
        thorns: 0,
        onKillHeal: 0,
        critDmg: 0,
        skillDmg: 0,
        bonusDmg: 0,
        resourceRegen: 0
      }
    };
  }

  function isAdjacent(a, b) {
    return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) === 1;
  }

  function chebyshev(a, b) {
    return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
  }

  G.Combat = {
    rollDamage: rollDamage,
    makeMonster: makeMonster,
    makePlayer: makePlayer,
    isAdjacent: isAdjacent,
    distance: chebyshev
  };
})(window.Game = window.Game || {});
