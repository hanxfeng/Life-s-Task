/* Canvas 渲染 + DOM HUD + 遮罩界面 */
(function (G) {
  'use strict';

  var canvas = null;
  var ctx = null;
  var dpr = 1;
  var viewW = 0;
  var viewH = 0;
  var tile = 24;
  var offX = 0;
  var offY = 0;

  var dom = {};
  var lastLogRef = null;
  var lastSkillHtml = '';
  var lastEquipHtml = '';

  function cacheDom() {
    dom.floorNum = document.getElementById('floorNum');
    dom.seedText = document.getElementById('seedText');
    dom.heroAvatar = document.getElementById('heroAvatar');
    dom.heroName = document.getElementById('heroName');
    dom.heroLevel = document.getElementById('heroLevel');
    dom.hpFill = document.getElementById('hpFill');
    dom.hpText = document.getElementById('hpText');
    dom.resFill = document.getElementById('resFill');
    dom.resText = document.getElementById('resText');
    dom.expFill = document.getElementById('expFill');
    dom.expText = document.getElementById('expText');
    dom.statAtk = document.getElementById('statAtk');
    dom.statDef = document.getElementById('statDef');
    dom.statCrit = document.getElementById('statCrit');
    dom.statMove = document.getElementById('statMove');
    dom.skillList = document.getElementById('skillList');
    dom.logList = document.getElementById('logList');
    dom.turnHint = document.getElementById('turnHint');
    dom.goldText = document.getElementById('goldText');
    dom.equipList = document.getElementById('equipList');
    dom.overlay = document.getElementById('overlay');
    dom.overlayTitle = document.getElementById('overlayTitle');
    dom.overlayDesc = document.getElementById('overlayDesc');
    dom.overlayStats = document.getElementById('overlayStats');
    dom.classOverlay = document.getElementById('classOverlay');
    dom.classList = document.getElementById('classList');
    dom.talentOverlay = document.getElementById('talentOverlay');
    dom.talentList = document.getElementById('talentList');
    dom.shopOverlay = document.getElementById('shopOverlay');
    dom.shopGold = document.getElementById('shopGold');
    dom.shopList = document.getElementById('shopList');
    dom.shopCloseBtn = document.getElementById('shopCloseBtn');
    dom.eventOverlay = document.getElementById('eventOverlay');
    dom.eventTitle = document.getElementById('eventTitle');
    dom.eventDesc = document.getElementById('eventDesc');
    dom.eventOptions = document.getElementById('eventOptions');
    dom.campOverlay = document.getElementById('campOverlay');
    dom.campPoints = document.getElementById('campPoints');
    dom.campTabs = document.getElementById('campTabs');
    dom.campBody = document.getElementById('campBody');
    dom.campMsg = document.getElementById('campMsg');
  }

  function init(c) {
    canvas = c;
    ctx = canvas.getContext('2d');
    cacheDom();
  }

  function resize() {
    if (!canvas) return;
    var wrap = canvas.parentElement;
    var rect = wrap.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    viewW = Math.max(1, Math.floor(rect.width));
    viewH = Math.max(1, Math.floor(rect.height));
    canvas.width = Math.floor(viewW * dpr);
    canvas.height = Math.floor(viewH * dpr);
    canvas.style.width = viewW + 'px';
    canvas.style.height = viewH + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function layout(map) {
    tile = Math.floor(Math.min(viewW / map.W, viewH / map.H));
    tile = Math.max(10, Math.min(42, tile));
    offX = Math.floor((viewW - map.W * tile) / 2);
    offY = Math.floor((viewH - map.H * tile) / 2);
  }

  function drawEntity(x, y, glyph, color, isPlayer, big) {
    var sx = offX + x * tile;
    var sy = offY + y * tile;
    var pad = Math.max(1, Math.floor(tile * (big ? 0.04 : 0.1)));

    ctx.save();
    ctx.globalAlpha = isPlayer ? 0.28 : 0.2;
    ctx.fillStyle = color;
    ctx.fillRect(sx + pad, sy + pad, tile - pad * 2, tile - pad * 2);
    ctx.restore();

    if (isPlayer) {
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = Math.max(1, tile * 0.05);
      ctx.strokeRect(sx + pad + 0.5, sy + pad + 0.5, tile - pad * 2 - 1, tile - pad * 2 - 1);
    }

    ctx.fillStyle = color;
    ctx.font = Math.floor(tile * (big ? 0.66 : 0.56)) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(glyph, sx + tile / 2, sy + tile / 2 + 1);
  }

  function draw(game) {
    if (!game || !game.map) return;
    var map = game.map;
    var W = map.W;
    var H = map.H;
    var tiles = map.tiles;
    var visible = map.visible;
    var explored = map.explored;

    layout(map);

    ctx.clearRect(0, 0, viewW, viewH);
    ctx.fillStyle = '#05070a';
    ctx.fillRect(0, 0, viewW, viewH);

    for (var y = 0; y < H; y++) {
      for (var x = 0; x < W; x++) {
        var i = y * W + x;
        var t = tiles[i];
        var vis = visible[i];
        var exp = explored[i];
        if (!vis && !exp) continue;

        var sx = offX + x * tile;
        var sy = offY + y * tile;

        if (t === 0) {
          ctx.fillStyle = vis ? '#242a38' : '#141924';
        } else if (t === 2) {
          ctx.fillStyle = vis ? '#1f4a37' : '#122a20';
        } else if (t === 3) {
          ctx.fillStyle = vis ? '#2a2416' : '#17130b';
        } else if (t === 4) {
          ctx.fillStyle = vis ? '#16241c' : '#0c1510';
        } else if (t === 5) {
          ctx.fillStyle = vis ? '#221a2c' : '#120e18';
        } else {
          ctx.fillStyle = vis ? '#151b27' : '#0b0f17';
        }
        ctx.fillRect(sx, sy, tile, tile);

        if (t === 0) {
          ctx.fillStyle = vis ? '#2f3648' : '#1a2030';
          ctx.fillRect(sx, sy, tile, Math.max(1, Math.floor(tile * 0.09)));
        } else if (t >= 2) {
          var glyph = t === 2 ? '▼' : (t === 3 ? '▣' : (t === 4 ? '$' : '?'));
          var glyphColor = t === 2 ? (vis ? '#7ae0a8' : '#3a6b52')
            : t === 3 ? (vis ? '#e8c170' : '#6b5a2e')
            : t === 4 ? (vis ? '#7ec07a' : '#3d6b52')
            : (vis ? '#c8b6e8' : '#5a4a6e');

          ctx.fillStyle = glyphColor;
          ctx.font = Math.floor(tile * 0.58) + 'px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(glyph, sx + tile / 2, sy + tile / 2 + 1);
        }
      }
    }

    /* 怪物 */
    for (var k = 0; k < game.monsters.length; k++) {
      var m = game.monsters[k];
      if (!m.alive) continue;
      if (!visible[m.y * W + m.x]) continue;

      var isBoss = m.isElite || m.isFinalBoss;
      drawEntity(m.x, m.y, m.glyph, m.color, false, isBoss);

      if (isBoss) {
        var bsx = offX + m.x * tile;
        var bsy = offY + m.y * tile;
        ctx.strokeStyle = '#e8c170';
        ctx.lineWidth = Math.max(1, tile * 0.06);
        ctx.strokeRect(bsx + 1, bsy + 1, tile - 2, tile - 2);
      }

      var ratio = Math.max(0, m.hp / m.maxHp);
      var sx2 = offX + m.x * tile;
      var sy2 = offY + m.y * tile;
      var bh = Math.max(2, Math.floor(tile * 0.1));
      ctx.fillStyle = '#160c10';
      ctx.fillRect(sx2 + 1, sy2 + tile - bh - 1, tile - 2, bh);
      ctx.fillStyle = ratio > 0.5 ? '#c94f4f' : '#e08a3a';
      ctx.fillRect(sx2 + 1, sy2 + tile - bh - 1, Math.max(0, (tile - 2) * ratio), bh);
    }

    /* 玩家 */
    drawEntity(game.player.x, game.player.y, game.player.glyph, game.player.color, true, false);

    /* 飘字 */
    var floats = game.state.floaters;
    for (var f = 0; f < floats.length; f++) {
      var fl = floats[f];
      var fx = offX + fl.x * tile + tile / 2;
      var fy = offY + fl.y * tile + tile / 2 - (1 - fl.life) * tile * 1.4;
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, fl.life));
      ctx.fillStyle = fl.color;
      ctx.font = 'bold ' + Math.floor(tile * 0.52) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(fl.text, fx, fy);
      ctx.restore();
    }

    /* 暗角 */
    var grd = ctx.createRadialGradient(viewW / 2, viewH / 2, Math.min(viewW, viewH) * 0.28,
                                       viewW / 2, viewH / 2, Math.max(viewW, viewH) * 0.72);
    grd.addColorStop(0, 'rgba(0,0,0,0)');
    grd.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, viewW, viewH);
  }

  function syncSkills(game) {
    var p = game.player;
    var html = '';
    for (var i = 0; i < p.skills.length; i++) {
      var s = G.DATA.SKILLS[p.skills[i]];
      if (!s) continue;
      var cd = game.cooldowns[s.id] || 0;
      var noRes = p.resource < s.cost;
      var disabled = cd > 0 || !game.state.canAct || game.over || noRes;
      var cdText = cd > 0 ? cd + ' 回合' : (noRes ? s.cost + ' ' + p.resourceName : '就绪');
      html += '<button class="skill-btn" data-skill="' + s.id + '"' + (disabled ? ' disabled' : '') + '>' +
        '<span class="skill-glyph" style="background:' + s.color + '22;color:' + s.color + '">' + s.glyph + '</span>' +
        '<span class="skill-info">' +
          '<span class="skill-name">' + s.name + ' <span class="skill-key">' + (i + 1) + '</span></span>' +
          '<span class="skill-desc">' + s.desc + '</span>' +
        '</span>' +
        '<span class="skill-cd' + (cd === 0 && !noRes ? ' ready' : '') + '">' + cdText + '</span>' +
        '</button>';
    }
    if (html !== lastSkillHtml) {
      dom.skillList.innerHTML = html;
      lastSkillHtml = html;
    }
  }

  function syncEquipment(game) {
    var p = game.player;
    var html = '';

    for (var i = 0; i < G.DATA.SLOT_KEYS.length; i++) {
      var key = G.DATA.SLOT_KEYS[i];
      var item = p.equipment[key];
      var label = G.DATA.SLOT_NAMES[key];

      if (item) {
        var parts = [];
        for (var j = 0; j < item.affixes.length; j++) {
          var a = item.affixes[j];
          var def = G.DATA.AFFIXES[a.stat];
          var v = def.pct ? Math.round(a.value * 100) + '%' : a.value;
          parts.push(def.name + '+' + v);
        }
        html += '<div class="equip-row" title="' + parts.join('，') + '">' +
          '<span class="equip-slot">' + label + '</span>' +
          '<span class="equip-name" style="color:' + item.color + '">' + item.name + '</span>' +
          '</div>';
      } else {
        html += '<div class="equip-row empty">' +
          '<span class="equip-slot">' + label + '</span>' +
          '<span class="equip-name">—</span>' +
          '</div>';
      }
    }

    if (html !== lastEquipHtml) {
      dom.equipList.innerHTML = html;
      lastEquipHtml = html;
    }
  }

  function syncLog(game) {
    var log = game.state.log;
    var last = log.length ? log[log.length - 1] : null;
    if (last === lastLogRef) return;
    lastLogRef = last;

    var start = Math.max(0, log.length - 40);
    var html = '';
    for (var i = start; i < log.length; i++) {
      html += '<div class="log-line ' + log[i].cls + '">' + escapeHtml(log[i].text) + '</div>';
    }
    dom.logList.innerHTML = html;
    dom.logList.scrollTop = dom.logList.scrollHeight;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function syncAll(game) {
    if (!game || !game.player || !game.state) return;
    var p = game.player;

    dom.floorNum.textContent = game.floor;
    dom.seedText.textContent = game.seedText;

    dom.heroAvatar.textContent = p.glyph;
    dom.heroName.textContent = p.name;
    dom.heroLevel.textContent = p.level;

    var hpRatio = Math.max(0, p.hp) / p.maxHp;
    dom.hpFill.style.width = (hpRatio * 100).toFixed(1) + '%';
    dom.hpText.textContent = Math.max(0, Math.round(p.hp)) + ' / ' + p.maxHp;

    var resRatio = p.resourceMax > 0 ? Math.max(0, Math.min(1, p.resource / p.resourceMax)) : 0;
    dom.resFill.style.width = (resRatio * 100).toFixed(1) + '%';
    dom.resFill.style.background = 'linear-gradient(90deg, ' + p.color + '44, ' + p.color + ')';
    dom.resText.textContent = p.resourceName + ' ' + Math.round(p.resource) + ' / ' + p.resourceMax;

    var need = G.DATA.expForLevel(p.level);
    var expRatio = Math.min(1, p.exp / need);
    dom.expFill.style.width = (expRatio * 100).toFixed(1) + '%';
    dom.expText.textContent = p.exp + ' / ' + need;

    dom.statAtk.textContent = Math.round(p.atk * 10) / 10;
    dom.statDef.textContent = Math.round(p.def * 10) / 10;
    dom.statCrit.textContent = Math.round(p.crit * 100) + '%';
    dom.statMove.textContent = game.state.moveLeft + '/' + p.move;

    dom.goldText.textContent = p.gold;

    var enemy = game.state.phase === 'enemy';
    dom.turnHint.textContent = game.paused
      ? (game.shopStock ? '商店中' : (game.currentEvent ? '事件中' : '天赋选择中'))
      : (enemy ? '敌方行动' : '你的回合');
    dom.turnHint.classList.toggle('enemy', enemy || game.paused);

    syncSkills(game);
    syncEquipment(game);
    syncLog(game);
  }

  function screenToTile(clientX, clientY) {
    var rect = canvas.getBoundingClientRect();
    var x = clientX - rect.left;
    var y = clientY - rect.top;
    return {
      x: Math.floor((x - offX) / tile),
      y: Math.floor((y - offY) / tile)
    };
  }

  /* ---------------- 遮罩 ---------------- */

  function showOverlay(data) {
    if (!dom.overlay) return;
    dom.overlay.classList.remove('hidden');
    dom.overlayTitle.textContent = data.won ? '你逃出了深渊' : '你倒下了';
    dom.overlayTitle.classList.toggle('win', !!data.won);
    dom.overlayDesc.textContent = data.won
      ? '你抵达了第 ' + data.floor + ' 层，深渊的尽头暂时安静了。'
      : '你止步于第 ' + data.floor + ' 层。';

    var s = data.stats || {};
    dom.overlayStats.innerHTML =
      row('到达层数', data.floor) +
      row('击杀数', s.kills || 0) +
      row('造成伤害', Math.round(s.damageDealt || 0)) +
      row('承受伤害', Math.round(s.damageTaken || 0)) +
      row('总回合', s.turns || 0) +
      row('本局种子', data.seed || '—');

    function row(label, value) {
      return '<div class="overlay-stat">' + label + '<b>' + value + '</b></div>';
    }
  }

  function hideOverlay() {
    if (dom.overlay) dom.overlay.classList.add('hidden');
  }

  function showClassSelect() {
    if (!dom.classOverlay) return;
    var order = ['warrior', 'mage', 'rogue', 'priest'];
    var html = '';

    for (var i = 0; i < order.length; i++) {
      var c = G.DATA.CLASSES[order[i]];
      if (!c) continue;

      var names = [];
      for (var j = 0; j < c.skills.length; j++) {
        var sk = G.DATA.SKILLS[c.skills[j]];
        if (sk) names.push(sk.name);
      }

      html += '<div class="class-card" data-class="' + c.id + '">' +
        '<h3><span class="class-glyph" style="background:' + c.color + '22;color:' + c.color + '">' +
        c.glyph + '</span>' + c.name + '</h3>' +
        '<div class="class-role">' + c.desc + '</div>' +
        '<div class="class-stats">' +
          '<span>生命 <b>' + c.base.maxHp + '</b></span>' +
          '<span>攻击 <b>' + c.base.atk + '</b></span>' +
          '<span>防御 <b>' + c.base.def + '</b></span>' +
          '<span>暴击 <b>' + Math.round(c.base.crit * 100) + '%</b></span>' +
        '</div>' +
        '<div class="class-skills">技能：' + names.join(' / ') + '　资源：' + c.resource.name + '</div>' +
        '</div>';
    }

    dom.classList.innerHTML = html;
    dom.classOverlay.classList.remove('hidden');
  }

  function hideClassSelect() {
    if (dom.classOverlay) dom.classOverlay.classList.add('hidden');
  }

  function showTalentSelect(options, classId) {
    if (!dom.talentOverlay) return;
    var lines = G.DATA.LINES[classId] || ['', '', ''];
    var html = '';

    for (var i = 0; i < options.length; i++) {
      var t = options[i];
      html += '<div class="talent-card" data-talent="' + t.id + '">' +
        '<div class="talent-line">' + (lines[t.line] || '') + '</div>' +
        '<div class="talent-name">' + t.name + '</div>' +
        '<div class="talent-desc">' + t.desc + '</div>' +
        '</div>';
    }

    dom.talentList.innerHTML = html;
    dom.talentOverlay.classList.remove('hidden');
  }

  function hideTalentSelect() {
    if (dom.talentOverlay) dom.talentOverlay.classList.add('hidden');
  }

  /* ---------------- 商店 ---------------- */

  function renderShop(stock, gold) {
    if (!dom.shopList) return;
    dom.shopGold.textContent = gold;
    var html = '';

    for (var i = 0; i < stock.length; i++) {
      var item = stock[i];
      if (!item) {
        html += '<div class="shop-card sold">已售出</div>';
        continue;
      }

      var parts = [];
      for (var j = 0; j < item.affixes.length; j++) {
        var a = item.affixes[j];
        var def = G.DATA.AFFIXES[a.stat];
        var v = def.pct ? Math.round(a.value * 100) + '%' : a.value;
        parts.push(def.name + '+' + v);
      }

      var price = G.Game.itemPrice(item);
      html += '<div class="shop-card" data-shop="' + i + '">' +
        '<div class="shop-item-name" style="color:' + item.color + '">' + item.name + '</div>' +
        '<div class="shop-item-rare" style="color:' + item.color + '">' +
        G.DATA.RARITIES[item.rarity].name + '</div>' +
        '<div class="shop-affixes">' + parts.join('<br>') + '</div>' +
        '<div class="shop-price">◈ ' + price + '</div>' +
        '</div>';
    }

    dom.shopList.innerHTML = html;
  }

  function showShop(stock, gold) {
    if (!dom.shopOverlay) return;
    renderShop(stock, gold);
    dom.shopOverlay.classList.remove('hidden');
  }

  function refreshShop(stock, gold) {
    renderShop(stock, gold);
  }

  function hideShop() {
    if (dom.shopOverlay) dom.shopOverlay.classList.add('hidden');
  }

  /* ---------------- 事件 ---------------- */

  function showEvent(ev) {
    if (!dom.eventOverlay) return;
    dom.eventTitle.textContent = ev.title;
    dom.eventDesc.textContent = ev.desc;

    var html = '';
    for (var i = 0; i < ev.options.length; i++) {
      html += '<button class="event-option" data-event="' + i + '">' + ev.options[i].text + '</button>';
    }
    dom.eventOptions.innerHTML = html;
    dom.eventOverlay.classList.remove('hidden');
  }

  function hideEvent() {
    if (dom.eventOverlay) dom.eventOverlay.classList.add('hidden');
  }

  /* ---------------- 营地 ---------------- */

  function showCamp() {
    if (!dom.campOverlay) return;
    renderCampPoints();
    renderCampTab('altar');
    showCampMessage('');
    dom.campOverlay.classList.remove('hidden');
  }

  function hideCamp() {
    if (dom.campOverlay) dom.campOverlay.classList.add('hidden');
  }

  function renderCampPoints() {
    if (dom.campPoints && G.Meta) dom.campPoints.textContent = G.Meta.data.points;
  }

  function showCampMessage(msg, ok) {
    if (!dom.campMsg) return;
    dom.campMsg.textContent = msg || '';
    dom.campMsg.className = 'camp-msg' + (ok === true ? ' ok' : ok === false ? ' err' : '');
  }

  function renderCampTab(tab) {
    if (!dom.campBody || !G.Meta) return;

    var tabs = dom.campTabs.querySelectorAll('button');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].classList.toggle('active', tabs[i].getAttribute('data-tab') === tab);
    }

    var html = '';
    if (tab === 'altar') html = renderAltar();
    else if (tab === 'unlock') html = renderUnlocks();
    else if (tab === 'code') html = renderCodeTab();

    dom.campBody.innerHTML = html;
    renderCampPoints();
  }

  function renderAltar() {
    var meta = G.Meta;
    var html = '';

    for (var i = 0; i < meta.UPGRADES.length; i++) {
      var def = meta.UPGRADES[i];
      var lv = meta.data.upgrades[def.id] || 0;
      var maxed = lv >= def.max;
      var cost = meta.upgradeCost(def.id);
      var can = meta.canUpgrade(def.id);

      html += '<div class="camp-row">' +
        '<div class="camp-row-main">' +
          '<div class="camp-name">' + def.name +
            '<span class="camp-lv">Lv.' + lv + ' / ' + def.max + '</span></div>' +
          '<div class="camp-desc">' + def.desc + '</div>' +
        '</div>' +
        (maxed
          ? '<span class="camp-max">已满级</span>'
          : '<button class="camp-buy" data-buy-upgrade="' + def.id + '"' + (can ? '' : ' disabled') + '>◈ ' + cost + '</button>') +
        '</div>';
    }

    return html;
  }

  function renderUnlocks() {
    var meta = G.Meta;
    var html = '';

    for (var i = 0; i < meta.UNLOCKS.length; i++) {
      var def = meta.UNLOCKS[i];
      var owned = meta.hasUnlock(def.id);
      var can = meta.data.points >= def.cost;

      html += '<div class="camp-row">' +
        '<div class="camp-row-main">' +
          '<div class="camp-name">' + def.name + '</div>' +
          '<div class="camp-desc">' + def.desc + '</div>' +
        '</div>' +
        (owned
          ? '<span class="camp-owned">已解锁</span>'
          : '<button class="camp-buy" data-buy-unlock="' + def.id + '"' + (can ? '' : ' disabled') + '>◈ ' + def.cost + '</button>') +
        '</div>';
    }

    return html;
  }

  function renderCodeTab() {
    var s = G.Meta.data.stats;
    return '<div class="camp-code-row">' +
      '<input id="codeInput" placeholder="ECHO-XXXX-XXXX-XXXX" maxlength="24" autocomplete="off" spellcheck="false">' +
      '<button id="redeemBtn">兑换</button>' +
      '</div>' +
      '<p class="camp-note">点数由外部项目生成兑换码后在此兑换，本游戏不产出点数。</p>' +
      '<p class="camp-note">已使用兑换码：' + G.Meta.data.usedCodes.length + ' 个</p>' +
      '<div class="camp-stats">' +
        '<div class="camp-stat">总场次<b>' + s.runs + '</b></div>' +
        '<div class="camp-stat">通关次数<b>' + s.wins + '</b></div>' +
        '<div class="camp-stat">累计击杀<b>' + s.kills + '</b></div>' +
        '<div class="camp-stat">最深层数<b>' + s.bestFloor + '</b></div>' +
      '</div>' +
      '<p class="camp-hint">测试用：浏览器控制台执行 EchoCode.generate(100) 可生成 100 点的测试码。</p>';
  }

  G.Render = {
    init: init,
    resize: resize,
    draw: draw,
    syncAll: syncAll,
    screenToTile: screenToTile,
    showOverlay: showOverlay,
    hideOverlay: hideOverlay,
    showClassSelect: showClassSelect,
    hideClassSelect: hideClassSelect,
    showTalentSelect: showTalentSelect,
    hideTalentSelect: hideTalentSelect,
    showShop: showShop,
    refreshShop: refreshShop,
    hideShop: hideShop,
    showEvent: showEvent,
    hideEvent: hideEvent,
    showCamp: showCamp,
    hideCamp: hideCamp,
    renderCampTab: renderCampTab,
    renderCampPoints: renderCampPoints,
    showCampMessage: showCampMessage
  };
})(window.Game = window.Game || {});
