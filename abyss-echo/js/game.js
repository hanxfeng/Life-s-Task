/* 游戏核心逻辑：职业、资源、回合、战斗、天赋、装备、特殊格、楼层 */
(function (G) {
  'use strict';

  var DIRS = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [1, 1], [1, -1], [-1, 1], [-1, -1]
  ];

  var Game = {
    rng: null,
    seed: 0,
    seedText: '',
    classId: 'warrior',
    floor: 1,
    map: null,
    player: null,
    monsters: [],
    cooldowns: {},
    state: null,
    stats: null,
    over: false,
    won: false,
    paused: false,
    pendingTalents: [],
    talentOptions: null,
    shopStock: null,
    currentEvent: null,

    /* ---------------- 开局 ---------------- */

    startRun: function (classId, seedText) {
      this.newRun(seedText, classId);
    },

    newRun: function (seedText, classId) {
      var text = String(seedText || '').trim();
      var seed = text ? G.hashSeed(text) : (Math.random() * 0xffffffff) >>> 0;

      this.classId = classId || 'warrior';
      this.seed = seed;
      this.seedText = text || seed.toString(36).toUpperCase().slice(0, 8);
      this.rng = new G.RNG(seed);
      this.floor = 1;
      this.player = G.Combat.makePlayer(this.classId);
      this.player.gold = 0;
      this.player.equipment = {};
      for (var si = 0; si < G.DATA.SLOT_KEYS.length; si++) {
        this.player.equipment[G.DATA.SLOT_KEYS[si]] = null;
      }

      if (G.Meta) G.Meta.applyToPlayer(this.player);

      this.cooldowns = {};
      this.over = false;
      this.won = false;
      this.paused = false;
      this.pendingTalents = [];
      this.talentOptions = null;
      this.shopStock = null;
      this.currentEvent = null;
      this.stats = {
        kills: 0,
        floors: 0,
        damageDealt: 0,
        damageTaken: 0,
        turns: 0
      };
      this.state = {
        phase: 'player',
        moveLeft: this.player.move,
        canAct: true,
        turn: 1,
        log: [],
        floaters: []
      };

      this.newFloor();
      this.log('你以「' + this.player.name + '」的身份踏入深渊。', 'sys');
      this.log('寻找 ▼ 楼梯进入下一层。', 'sys');

      if (G.Render) {
        G.Render.hideOverlay();
        G.Render.hideClassSelect();
        G.Render.hideTalentSelect();
        G.Render.hideShop();
        G.Render.hideEvent();
      }
    },

    newFloor: function () {
      var map = G.MapGen.generate(this.rng, this.floor);
      this.map = map;

      this.player.x = map.spawn.x;
      this.player.y = map.spawn.y;

      this.monsters = [];

      var pool = G.DATA.FLOOR_TABLE[Math.min(G.DATA.FLOOR_TABLE.length - 1, this.floor - 1)];

      /* 层主 / 最终 Boss */
      var eliteType = this.rng.pick(pool);
      var elite = G.Combat.makeMonster(this.rng, eliteType, this.floor);

      if (this.floor >= G.DATA.MAX_FLOOR) {
        elite.name = '深渊之主';
        elite.glyph = '主';
        elite.color = '#e8c170';
        elite.hp = Math.round(elite.hp * 4.5);
        elite.maxHp = elite.hp;
        elite.atk = Math.round(elite.atk * 1.6);
        elite.def = Math.round(elite.def * 1.6);
        elite.exp = Math.round(elite.exp * 7);
        elite.isFinalBoss = true;
        elite.x = map.stairs.x;
        elite.y = map.stairs.y;
      } else {
        elite.name = '层主·' + elite.name;
        elite.color = '#e8c170';
        elite.hp = Math.round(elite.hp * 2.2);
        elite.maxHp = elite.hp;
        elite.atk = Math.round(elite.atk * 1.2);
        elite.exp = Math.round(elite.exp * 2.5);
        elite.isElite = true;
        var spot = this.findEliteSpot(map.stairs);
        elite.x = spot.x;
        elite.y = spot.y;
      }
      this.monsters.push(elite);

      /* 普通怪 */
      var count = G.DATA.monstersForFloor(this.floor);
      var candidates = [];
      for (var i = 0; i < map.floors.length; i++) {
        var f = map.floors[i];
        var d = Math.max(Math.abs(f.x - map.spawn.x), Math.abs(f.y - map.spawn.y));
        if (d >= 6) candidates.push(f);
      }
      this.rng.shuffle(candidates);

      var placed = 0;
      for (var n = 0; n < candidates.length && placed < count; n++) {
        var pos = candidates[n];
        if (pos.x === elite.x && pos.y === elite.y) continue;
        if (this.monsterAt(pos.x, pos.y)) continue;
        var type = this.rng.pick(pool);
        var m = G.Combat.makeMonster(this.rng, type, this.floor);
        m.x = pos.x;
        m.y = pos.y;
        this.monsters.push(m);
        placed++;
      }

      this.state.phase = 'player';
      this.state.moveLeft = this.player.move;
      this.state.canAct = true;
      this.computeFOV();
    },

    findEliteSpot: function (center) {
      var map = this.map;
      for (var r = 1; r <= 5; r++) {
        for (var dy = -r; dy <= r; dy++) {
          for (var dx = -r; dx <= r; dx++) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
            var x = center.x + dx;
            var y = center.y + dy;
            if (!G.MapGen.walkable(map.tiles, x, y)) continue;
            if (map.tiles[y * map.W + x] !== 1) continue;
            return { x: x, y: y };
          }
        }
      }
      return { x: center.x, y: center.y };
    },

    /* ---------------- 视野 ---------------- */

    computeFOV: function () {
      var p = this.player;
      var map = this.map;
      var W = map.W;
      var H = map.H;
      var vis = map.visible;
      vis.fill(0);

      var R = 7;
      var R2 = R * R + 1;

      for (var y = p.y - R; y <= p.y + R; y++) {
        if (y < 0 || y >= H) continue;
        for (var x = p.x - R; x <= p.x + R; x++) {
          if (x < 0 || x >= W) continue;
          var dx = x - p.x;
          var dy = y - p.y;
          if (dx * dx + dy * dy > R2) continue;
          if (this.hasLOS(p.x, p.y, x, y)) {
            var idx = y * W + x;
            vis[idx] = 1;
            map.explored[idx] = 1;
          }
        }
      }
    },

    hasLOS: function (x0, y0, x1, y1) {
      var dx = Math.abs(x1 - x0);
      var dy = Math.abs(y1 - y0);
      var sx = x0 < x1 ? 1 : -1;
      var sy = y0 < y1 ? 1 : -1;
      var err = dx - dy;
      var x = x0;
      var y = y0;
      var W = this.map.W;
      var H = this.map.H;
      var tiles = this.map.tiles;
      var guard = 0;

      while (guard++ < 160) {
        if (x === x1 && y === y1) return true;
        var e2 = 2 * err;
        if (e2 > -dy) { err -= dy; x += sx; }
        if (e2 < dx) { err += dx; y += sy; }
        if (x === x1 && y === y1) return true;
        if (x < 0 || y < 0 || x >= W || y >= H) return false;
        if (tiles[y * W + x] === 0) return false;
      }
      return false;
    },

    /* ---------------- 查询 ---------------- */

    monsterAt: function (x, y) {
      for (var i = 0; i < this.monsters.length; i++) {
        var m = this.monsters[i];
        if (m.alive && m.x === x && m.y === y) return m;
      }
      return null;
    },

    isOccupiedByPlayer: function (x, y) {
      return this.player.x === x && this.player.y === y;
    },

    /* ---------------- 移动 ---------------- */

    tryMove: function (dx, dy) {
      if (this.over || this.won || this.paused) return;
      if (this.state.phase !== 'player') return;

      var p = this.player;
      var nx = p.x + dx;
      var ny = p.y + dy;

      if (!G.MapGen.walkable(this.map.tiles, nx, ny)) return;

      var m = this.monsterAt(nx, ny);
      if (m) {
        this.playerAttack(m);
        return;
      }

      if (this.state.moveLeft <= 0) {
        this.log('移动力已耗尽，按空格结束回合。');
        return;
      }

      p.x = nx;
      p.y = ny;
      this.state.moveLeft--;
      this.computeFOV();
      this.onEnterTile();
    },

    moveTo: function (tx, ty) {
      if (this.over || this.won || this.paused) return;
      if (this.state.phase !== 'player') return;
      if (this.state.moveLeft <= 0) return;
      if (tx < 0 || ty < 0 || tx >= this.map.W || ty >= this.map.H) return;

      var target = this.monsterAt(tx, ty);
      if (target) {
        if (G.Combat.isAdjacent(this.player, target)) {
          this.playerAttack(target);
        } else {
          var approach = G.MapGen.findPath(this.map, this.player.x, this.player.y, tx, ty);
          if (approach && approach.length >= 2) {
            this.walkPath(approach.slice(0, approach.length - 1));
          }
        }
        return;
      }

      var path = G.MapGen.findPath(this.map, this.player.x, this.player.y, tx, ty);
      if (!path) return;
      this.walkPath(path);
    },

    walkPath: function (path) {
      for (var i = 0; i < path.length; i++) {
        if (this.over || this.won || this.paused) break;
        if (this.state.moveLeft <= 0) break;

        var step = path[i];
        var m = this.monsterAt(step.x, step.y);
        if (m) {
          if (G.Combat.isAdjacent(this.player, m)) this.playerAttack(m);
          break;
        }

        this.player.x = step.x;
        this.player.y = step.y;
        this.state.moveLeft--;
        this.computeFOV();
        this.onEnterTile();

        if (this.over || this.won || this.paused) break;
      }
    },

    onEnterTile: function () {
      var idx = this.player.y * this.map.W + this.player.x;
      var t = this.map.tiles[idx];

      if (t === 2) { this.checkStairs(); return; }
      if (t === 3) { this.openChest(idx); return; }
      if (t === 4) { this.openShop(idx); return; }
      if (t === 5) { this.openEvent(idx); return; }
    },

    /* ---------------- 战斗 ---------------- */

    playerAttack: function (target) {
      if (this.over || this.won || this.paused) return;
      if (this.state.phase !== 'player') return;
      if (!this.state.canAct) {
        this.log('本回合已经行动过了。');
        return;
      }
      if (!G.Combat.isAdjacent(this.player, target)) {
        this.log('目标不在近战范围内。');
        return;
      }

      this.performHit(target, 1.0, false);
      this.gainResource(this.player.resourceOnHit);
      this.consumeAction();
    },

    performHit: function (target, mult, isSkill) {
      var p = this.player;
      var atk = p.atk;
      if (isSkill) atk *= (1 + p.mods.skillDmg);

      var r = G.Combat.rollDamage(this.rng, atk, target.def, mult, p.crit, p.mods.critDmg);
      var dmg = r.dmg + p.mods.bonusDmg;

      target.hp -= dmg;
      this.stats.damageDealt += dmg;

      this.addFloater(target.x, target.y,
        (r.crit ? '暴击 ' : '') + dmg,
        r.crit ? '#ffd166' : '#ff9a8a');

      this.log((r.crit ? '暴击！' : '') + '你对 ' + target.name + ' 造成 ' + dmg + ' 点伤害。', 'good');

      if (p.mods.lifesteal > 0) {
        this.healPlayer(Math.max(1, Math.round(dmg * p.mods.lifesteal)));
      }

      if (target.hp <= 0) this.killMonster(target);
    },

    healPlayer: function (n) {
      var p = this.player;
      var before = p.hp;
      p.hp = Math.min(p.maxHp, p.hp + n);
      var real = Math.round(p.hp - before);
      if (real > 0) this.addFloater(p.x, p.y, '+' + real, '#9fd8a8');
    },

    killMonster: function (m) {
      m.alive = false;
      m.hp = 0;
      this.stats.kills++;
      this.log('你击败了 ' + m.name + '。', (m.isElite || m.isFinalBoss) ? 'sys' : 'good');
      this.addFloater(m.x, m.y, '+' + m.exp + ' 经验', '#9fd8a8');
      this.gainExp(m.exp);

      var gold = this.rng.int(1, 3) + Math.floor(this.floor / 2);
      this.player.gold += Math.round(gold * (1 + (this.player.metaGoldGain || 0)));

      var heal = this.player.mods.onKillHeal;
      if (heal > 0) this.healPlayer(heal);

      if (m.isElite || m.isFinalBoss) {
        this.log('掉落了一件装备。', 'sys');
        this.grantItem(this.makeRandomItem(this.floor, 2));
      }

      if (m.isFinalBoss) {
        this.gameOver(true);
      }
    },

    gainExp: function (n) {
      var p = this.player;
      p.exp += n;
      var need = G.DATA.expForLevel(p.level);

      while (p.exp >= need) {
        p.exp -= need;
        p.level++;
        p.maxHp += 8;
        p.atk += 1.5;
        p.def += 0.5;
        p.hp = Math.min(p.maxHp, p.hp + 20);
        this.log('升级！你现在是 Lv.' + p.level + '。', 'sys');
        this.addFloater(p.x, p.y, '升级！', '#ffd166');
        need = G.DATA.expForLevel(p.level);

        if (p.level % 3 === 0) {
          this.pendingTalents.push(this.rollTalentOptions());
        }
      }
    },

    /* ---------------- 资源 ---------------- */

    gainResource: function (n) {
      if (!n) return;
      var p = this.player;
      p.resource = Math.max(0, Math.min(p.resourceMax, p.resource + n));
    },

    spendResource: function (n) {
      this.gainResource(-n);
    },

    /* ---------------- 技能 ---------------- */

    useSkill: function (skillId) {
      if (this.over || this.won || this.paused) return;
      if (this.state.phase !== 'player') return;

      var skill = G.DATA.SKILLS[skillId];
      if (!skill) return;

      if (!this.state.canAct) {
        this.log('本回合已经行动过了。');
        return;
      }

      var cd = this.cooldowns[skillId] || 0;
      if (cd > 0) {
        this.log(skill.name + ' 冷却中（剩余 ' + cd + ' 回合）。');
        return;
      }

      var p = this.player;
      if (p.resource < skill.cost) {
        this.log(p.resourceName + '不足（需要 ' + skill.cost + '）。');
        return;
      }

      if (skill.heal) {
        if (p.hp >= p.maxHp) {
          this.log('生命已满。');
          return;
        }
        this.spendResource(skill.cost);
        var healed = Math.min(skill.heal, p.maxHp - p.hp);
        this.healPlayer(healed);
        this.log('你恢复了 ' + healed + ' 点生命。', 'good');
        this.cooldowns[skillId] = skill.cd;
        this.consumeAction();
        return;
      }

      var target = this.findSkillTarget(skill);
      if (!target) {
        this.log('射程内没有敌人。');
        return;
      }

      this.spendResource(skill.cost);
      this.performHit(target, skill.mult, true);
      this.cooldowns[skillId] = skill.cd;
      this.consumeAction();
    },

    findSkillTarget: function (skill) {
      var best = null;
      var bestD = 999;

      for (var i = 0; i < this.monsters.length; i++) {
        var m = this.monsters[i];
        if (!m.alive) continue;
        var d = G.Combat.distance(this.player, m);
        if (d > skill.range) continue;
        if (skill.range > 1 && !this.hasLOS(this.player.x, this.player.y, m.x, m.y)) continue;
        if (d < bestD) {
          best = m;
          bestD = d;
        }
      }
      return best;
    },

    wait: function () {
      if (this.over || this.won || this.paused) return;
      if (this.state.phase !== 'player') return;
      this.endTurn();
    },

    consumeAction: function () {
      this.state.canAct = false;
      this.endTurn();
    },

    /* ---------------- 回合推进 ---------------- */

    endTurn: function () {
      if (this.over || this.won) return;

      this.state.phase = 'enemy';
      this.enemyTurn();

      if (this.over || this.won) return;

      for (var k in this.cooldowns) {
        if (this.cooldowns[k] > 0) this.cooldowns[k]--;
      }

      var regen = this.player.resourceRegen + this.player.mods.resourceRegen;
      if (regen > 0) this.gainResource(regen);

      this.state.turn++;
      this.stats.turns++;
      this.state.phase = 'player';
      this.state.moveLeft = this.player.move;
      this.state.canAct = true;
      this.computeFOV();

      if (this.pendingTalents.length) this.offerTalent();
    },

    enemyTurn: function () {
      var self = this;
      var alive = [];
      for (var i = 0; i < this.monsters.length; i++) {
        if (this.monsters[i].alive) alive.push(this.monsters[i]);
      }

      alive.sort(function (a, b) {
        return G.Combat.distance(a, self.player) - G.Combat.distance(b, self.player);
      });

      var field = G.MapGen.distanceField(this.map, this.player.x, this.player.y);
      var W = this.map.W;

      for (var j = 0; j < alive.length; j++) {
        if (this.over || this.won) break;
        var m = alive[j];
        if (!m.alive) continue;

        if (G.Combat.isAdjacent(m, this.player)) {
          this.enemyAttack(m);
          continue;
        }

        var curD = field[m.y * W + m.x];
        var best = null;
        var bestD = curD;

        for (var d = 0; d < DIRS.length; d++) {
          var dx = DIRS[d][0];
          var dy = DIRS[d][1];
          var nx = m.x + dx;
          var ny = m.y + dy;
          if (!G.MapGen.walkable(this.map.tiles, nx, ny)) continue;
          if (dx !== 0 && dy !== 0) {
            if (!G.MapGen.walkable(this.map.tiles, m.x + dx, m.y) ||
                !G.MapGen.walkable(this.map.tiles, m.x, m.y + dy)) continue;
          }
          if (this.monsterAt(nx, ny)) continue;
          if (this.isOccupiedByPlayer(nx, ny)) continue;

          var nd = field[ny * W + nx];
          if (nd < bestD) {
            bestD = nd;
            best = { x: nx, y: ny };
          }
        }

        if (best) {
          m.x = best.x;
          m.y = best.y;
        }

        if (G.Combat.isAdjacent(m, this.player)) {
          this.enemyAttack(m);
        }
      }
    },

    enemyAttack: function (m) {
      var p = this.player;
      var r = G.Combat.rollDamage(this.rng, m.atk, p.def, 1.0, 0.05, 0);
      p.hp -= r.dmg;
      this.stats.damageTaken += r.dmg;

      this.addFloater(p.x, p.y, '-' + r.dmg, '#ff6b6b');
      this.log(m.name + ' 对你造成 ' + r.dmg + ' 点伤害。', 'bad');

      if (p.resourceOnHurt) this.gainResource(p.resourceOnHurt);

      if (p.mods.thorns > 0) {
        m.hp -= p.mods.thorns;
        this.addFloater(m.x, m.y, '-' + p.mods.thorns, '#e0a548');
        this.log('荆棘反弹 ' + p.mods.thorns + ' 点伤害。', 'good');
        if (m.hp <= 0) this.killMonster(m);
      }

      if (p.hp <= 0) {
        p.hp = 0;
        this.gameOver(false);
      }
    },

    /* ---------------- 天赋 ---------------- */

    rollTalentOptions: function () {
      var pool = G.DATA.TALENTS[this.player.classId] || [];
      var owned = this.player.talents;
      var options = [];

      for (var line = 0; line < 3; line++) {
        var linePool = [];
        for (var i = 0; i < pool.length; i++) {
          if (pool[i].line === line && owned.indexOf(pool[i].id) < 0) linePool.push(pool[i]);
        }
        if (linePool.length) options.push(this.rng.pick(linePool));
      }

      if (options.length < 3) {
        var rest = [];
        for (var j = 0; j < pool.length; j++) {
          if (owned.indexOf(pool[j].id) < 0 && options.indexOf(pool[j]) < 0) {
            rest.push(pool[j]);
          }
        }
        this.rng.shuffle(rest);
        while (options.length < 3 && rest.length) options.push(rest.pop());
      }
      return options;
    },

    offerTalent: function () {
      if (!this.pendingTalents.length) {
        this.paused = false;
        return;
      }
      this.talentOptions = this.pendingTalents.shift();
      this.paused = true;

      if (G.Render && G.Render.showTalentSelect) {
        G.Render.showTalentSelect(this.talentOptions, this.player.classId);
      }
    },

    chooseTalent: function (talentId) {
      if (!this.talentOptions) return;

      var chosen = null;
      for (var i = 0; i < this.talentOptions.length; i++) {
        if (this.talentOptions[i].id === talentId) {
          chosen = this.talentOptions[i];
          break;
        }
      }
      if (!chosen) return;

      this.player.talents.push(chosen.id);
      this.applyTalent(chosen);
      this.talentOptions = null;

      if (G.Render && G.Render.hideTalentSelect) G.Render.hideTalentSelect();
      this.log('获得天赋「' + chosen.name + '」：' + chosen.desc, 'sys');

      if (this.pendingTalents.length) {
        this.offerTalent();
      } else {
        this.paused = false;
      }
    },

    applyTalent: function (t) {
      var p = this.player;
      var e = t.effect;

      switch (e.type) {
        case 'stat':
          if (e.stat === 'maxHp') {
            p.maxHp += e.value;
            p.hp += e.value;
          } else {
            p[e.stat] += e.value;
          }
          break;

        case 'statPct':
          if (e.stat === 'maxHp') {
            var add = Math.round(p.maxHp * e.value);
            p.maxHp += add;
            p.hp += add;
          } else if (e.stat === 'atk') {
            p.atk = Math.round(p.atk * (1 + e.value) * 10) / 10;
          } else if (e.stat === 'def') {
            p.def = Math.round(p.def * (1 + e.value) * 10) / 10;
          }
          break;

        case 'lifesteal': p.mods.lifesteal += e.value; break;
        case 'thorns': p.mods.thorns += e.value; break;
        case 'onKillHeal': p.mods.onKillHeal += e.value; break;
        case 'critDmg': p.mods.critDmg += e.value; break;
        case 'skillDmg': p.mods.skillDmg += e.value; break;
        case 'bonusDmg': p.mods.bonusDmg += e.value; break;
        case 'resourceMax': p.resourceMax += e.value; break;
        case 'resourceRegen': p.mods.resourceRegen += e.value; break;
        default: break;
      }
    },

    /* ---------------- 装备 ---------------- */

    makeRandomItem: function (floor, rarity) {
      var slot = this.rng.pick(G.DATA.SLOT_KEYS);
      return this.makeItem(slot, rarity, floor);
    },

    makeItem: function (slot, rarity, floor) {
      var r = G.DATA.RARITIES[rarity];
      var affixKeys = Object.keys(G.DATA.AFFIXES);
      this.rng.shuffle(affixKeys);

      var count = Math.min(affixKeys.length, r.affixes + (this.rng.chance(0.3) ? 1 : 0));
      var affixes = [];

      for (var i = 0; i < count; i++) {
        var key = affixKeys[i];
        var def = G.DATA.AFFIXES[key];
        var base = def.min + this.rng.next() * (def.max - def.min);
        var scale = r.mult * (1 + (floor - 1) * 0.12);
        var value = def.pct
          ? Math.round(base * scale * 1000) / 1000
          : Math.max(1, Math.round(base * scale));
        affixes.push({ stat: key, value: value });
      }

      var names = G.DATA.ITEM_BASE_NAMES[slot];
      return {
        slot: slot,
        name: this.rng.pick(names),
        rarity: rarity,
        color: r.color,
        affixes: affixes
      };
    },

    itemScore: function (item) {
      if (!item) return -1;
      var s = item.rarity * 10 + item.affixes.length * 2;
      for (var i = 0; i < item.affixes.length; i++) {
        var a = item.affixes[i];
        if (a.stat === 'maxHp') s += a.value * 0.1;
        else if (a.stat === 'atk') s += a.value * 1.5;
        else s += a.value * 0.8;
      }
      return s;
    },

    itemPrice: function (item) {
      return 25 + item.rarity * 30 + this.floor * 3;
    },

    grantItem: function (item) {
      var p = this.player;
      var cur = p.equipment[item.slot];

      if (!cur || this.itemScore(item) >= this.itemScore(cur)) {
        if (cur) {
          this.adjustItemStats(cur, -1);
          var refund = 2 + cur.rarity * 3;
          p.gold += refund;
          this.log('替换下 ' + cur.name + '，分解获得 ' + refund + ' 金币。', 'sys');
        }
        p.equipment[item.slot] = item;
        this.adjustItemStats(item, 1);
        this.log('装备了「' + item.name + '」（' + G.DATA.RARITIES[item.rarity].name + '）。', 'good');
      } else {
        var gold = 2 + item.rarity * 2;
        p.gold += gold;
        this.log('「' + item.name + '」不如当前装备，分解为 ' + gold + ' 金币。', 'sys');
      }
    },

    adjustItemStats: function (item, sign) {
      var p = this.player;
      for (var i = 0; i < item.affixes.length; i++) {
        var a = item.affixes[i];
        switch (a.stat) {
          case 'maxHp':
            p.maxHp += sign * a.value;
            if (sign > 0) p.hp += a.value;
            p.hp = Math.max(1, Math.min(p.hp, p.maxHp));
            break;
          case 'atk': p.atk += sign * a.value; break;
          case 'def': p.def += sign * a.value; break;
          case 'crit': p.crit += sign * a.value; break;
          case 'move': p.move += sign * a.value; break;
          case 'lifesteal': p.mods.lifesteal += sign * a.value; break;
          case 'thorns': p.mods.thorns += sign * a.value; break;
          case 'bonusDmg': p.mods.bonusDmg += sign * a.value; break;
          case 'skillDmg': p.mods.skillDmg += sign * a.value; break;
          case 'critDmg': p.mods.critDmg += sign * a.value; break;
          case 'resourceMax': p.resourceMax += sign * a.value; break;
          default: break;
        }
      }
    },

    /* ---------------- 特殊格 ---------------- */

    openChest: function (idx) {
      this.map.tiles[idx] = 1;

      if (this.rng.chance(0.45)) {
        var gold = this.rng.int(10, 25) + this.floor * 3;
        this.player.gold += gold;
        this.log('宝箱中找到了 ' + gold + ' 金币。', 'good');
        this.addFloater(this.player.x, this.player.y, '+' + gold, '#ffd166');
      } else {
        this.grantItem(this.makeRandomItem(this.floor, 1));
      }
    },

    openShop: function (idx) {
      this.map.tiles[idx] = 1;
      this.shopStock = [];
      for (var i = 0; i < 3; i++) {
        var rar = Math.min(3, this.rng.int(0, 2) + (this.floor >= 5 ? 1 : 0));
        this.shopStock.push(this.makeRandomItem(this.floor, rar));
      }
      this.paused = true;
      if (G.Render && G.Render.showShop) G.Render.showShop(this.shopStock, this.player.gold);
    },

    buyShopItem: function (index) {
      if (!this.shopStock) return;
      var item = this.shopStock[index];
      if (!item) return;

      var price = this.itemPrice(item);
      if (this.player.gold < price) {
        this.log('金币不足。', 'bad');
        return;
      }

      this.player.gold -= price;
      this.shopStock[index] = null;
      this.grantItem(item);

      if (G.Render && G.Render.refreshShop) {
        G.Render.refreshShop(this.shopStock, this.player.gold);
      }
    },

    closeShop: function () {
      this.shopStock = null;
      this.paused = false;
      if (G.Render && G.Render.hideShop) G.Render.hideShop();
    },

    openEvent: function (idx) {
      this.map.tiles[idx] = 1;
      this.currentEvent = this.rng.pick(G.DATA.EVENTS);
      this.paused = true;
      if (G.Render && G.Render.showEvent) G.Render.showEvent(this.currentEvent);
    },

    chooseEventOption: function (index) {
      var ev = this.currentEvent;
      if (!ev) return;
      var opt = ev.options[index];
      if (!opt) return;

      this.applyEventEffect(opt.effect || {});
      this.currentEvent = null;
      this.paused = false;
      if (G.Render && G.Render.hideEvent) G.Render.hideEvent();
    },

    applyEventEffect: function (e) {
      var p = this.player;

      if (e.hpPct) {
        var loss = Math.max(1, Math.floor(p.maxHp * e.hpPct));
        p.hp = Math.max(1, p.hp - loss);
        this.log('你失去了 ' + loss + ' 点生命。', 'bad');
      }

      if (e.healPct) {
        var heal = Math.floor(p.maxHp * e.healPct);
        this.healPlayer(heal);
        this.log('你恢复了 ' + heal + ' 点生命。', 'good');
      }

      if (e.atk) {
        p.atk += e.atk;
        this.log('攻击 ' + (e.atk > 0 ? '+' : '') + e.atk + '。', 'sys');
      }

      if (e.def) {
        p.def += e.def;
        this.log('防御 ' + (e.def > 0 ? '+' : '') + e.def + '。', 'sys');
      }

      if (e.gold) {
        if (e.gold > 0) {
          p.gold += e.gold;
          this.log('获得 ' + e.gold + ' 金币。', 'good');
        } else {
          p.gold = Math.max(0, p.gold + e.gold);
          this.log('失去 ' + (-e.gold) + ' 金币。', 'bad');
        }
      }

      if (e.gamble) {
        var g = e.gamble;
        if (p.gold < g.cost) {
          this.log('金币不足，赌局作废。', 'bad');
          return;
        }
        p.gold -= g.cost;
        if (this.rng.chance(g.chance)) {
          p.gold += g.win;
          this.log('赌赢了！获得 ' + g.win + ' 金币。', 'good');
        } else {
          this.log('赌输了，损失 ' + g.cost + ' 金币。', 'bad');
        }
      }

      if (e.item) {
        this.grantItem(this.makeRandomItem(this.floor, 2));
      }
    },

    /* ---------------- 楼层与结束 ---------------- */

    checkStairs: function () {
      var idx = this.player.y * this.map.W + this.player.x;
      if (this.map.tiles[idx] !== 2) return;

      if (this.floor >= G.DATA.MAX_FLOOR) {
        var bossAlive = false;
        for (var i = 0; i < this.monsters.length; i++) {
          if (this.monsters[i].isFinalBoss && this.monsters[i].alive) bossAlive = true;
        }
        if (bossAlive) {
          this.log('深渊之主仍在，楼梯被封锁。', 'bad');
          return;
        }
        this.gameOver(true);
        return;
      }

      this.floor++;
      this.stats.floors++;

      var metaRegen = Math.round(this.player.maxHp * (this.player.metaRegen || 0));
      if (metaRegen > 0) {
        this.healPlayer(metaRegen);
        this.log('祭坛的祝福恢复了 ' + metaRegen + ' 点生命。', 'good');
      }

      this.log('你进入了第 ' + this.floor + ' 层。', 'sys');
      this.newFloor();
    },

    gameOver: function (won) {
      if (this.over) return;
      this.over = true;
      this.won = !!won;
      this.state.phase = 'over';

      this.log(won
        ? '你逃出了深渊。'
        : '你倒在了第 ' + this.floor + ' 层。', won ? 'sys' : 'bad');

      if (G.Meta) {
        G.Meta.recordRun({
          won: this.won,
          floor: this.floor,
          kills: this.stats.kills,
          turns: this.stats.turns
        });
      }

      if (G.Render && G.Render.showOverlay) {
        G.Render.showOverlay({
          won: this.won,
          floor: this.floor,
          seed: this.seedText,
          stats: this.stats
        });
      }
    },

    /* ---------------- 杂项 ---------------- */

    log: function (text, cls) {
      this.state.log.push({ text: text, cls: cls || '' });
      if (this.state.log.length > 80) this.state.log.shift();
    },

    addFloater: function (x, y, text, color) {
      this.state.floaters.push({
        x: x,
        y: y,
        text: text,
        color: color,
        life: 1,
        maxLife: 1
      });
    },

    tick: function (dt) {
      if (!this.state) return;
      var list = this.state.floaters;
      for (var i = list.length - 1; i >= 0; i--) {
        list[i].life -= dt * 1.4;
        if (list[i].life <= 0) list.splice(i, 1);
      }
    }
  };

  G.Game = Game;
})(window.Game = window.Game || {});
