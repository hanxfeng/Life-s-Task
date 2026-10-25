/* 入口：营地、职业选择、游戏循环、输入绑定 */
(function (G) {
  'use strict';

  var lastTime = 0;
  var currentCampTab = 'altar';

  var DIR_MAP = {
    n: [0, -1],
    s: [0, 1],
    w: [-1, 0],
    e: [1, 0],
    nw: [-1, -1],
    ne: [1, -1],
    sw: [-1, 1],
    se: [1, 1]
  };

  var KEY_DIR = {
    w: 'n', W: 'n', ArrowUp: 'n',
    s: 's', S: 's', ArrowDown: 's',
    a: 'w', A: 'w', ArrowLeft: 'w',
    d: 'e', D: 'e', ArrowRight: 'e'
  };

  function boot() {
    G.Meta.load();

    var canvas = document.getElementById('gameCanvas');
    G.Render.init(canvas);

    bindUI();
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);

    onResize();
    G.Render.showCamp();
    requestAnimationFrame(loop);
  }

  function onResize() {
    G.Render.resize();
  }

  function loop(ts) {
    var dt = lastTime ? Math.min(0.05, (ts - lastTime) / 1000) : 0.016;
    lastTime = ts;

    G.Game.tick(dt);
    G.Render.draw(G.Game);
    G.Render.syncAll(G.Game);

    requestAnimationFrame(loop);
  }

  function playing() {
    return G.Game && G.Game.state && G.Game.player;
  }

  function handleDir(dir) {
    if (!playing()) return;
    if (dir === 'wait') {
      G.Game.wait();
      return;
    }
    var d = DIR_MAP[dir];
    if (d) G.Game.tryMove(d[0], d[1]);
  }

  function redeemCode() {
    var input = document.getElementById('codeInput');
    if (!input) return;

    var res = G.Meta.redeemCode(input.value);
    if (res.ok) {
      input.value = '';
      G.Render.renderCampTab('code');
      G.Render.showCampMessage('兑换成功，获得 ' + res.points + ' 点数', true);
    } else {
      G.Render.showCampMessage(res.msg, false);
    }
  }

  function bindUI() {
    document.addEventListener('keydown', function (e) {
      if (e.repeat) return;
      if (document.activeElement && document.activeElement.tagName === 'INPUT') return;

      var dir = KEY_DIR[e.key];
      if (dir) {
        e.preventDefault();
        handleDir(dir);
        return;
      }

      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (playing()) G.Game.wait();
        return;
      }

      if (e.key === '1' || e.key === '2' || e.key === '3' || e.key === '4') {
        if (!playing()) return;
        var idx = parseInt(e.key, 10) - 1;
        var p = G.Game.player;
        if (p.skills[idx]) G.Game.useSkill(p.skills[idx]);
      }
    });

    var wrap = document.getElementById('canvasWrap');
    wrap.addEventListener('click', function (e) {
      if (!playing() || G.Game.over || G.Game.paused) return;
      var pos = G.Render.screenToTile(e.clientX, e.clientY);
      G.Game.moveTo(pos.x, pos.y);
    });

    document.getElementById('waitBtn').addEventListener('click', function () {
      if (playing()) G.Game.wait();
    });

    var dpad = document.querySelector('.dpad');
    dpad.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-dir]');
      if (!btn) return;
      handleDir(btn.getAttribute('data-dir'));
    });

    document.getElementById('skillList').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-skill]');
      if (!btn) return;
      G.Game.useSkill(btn.getAttribute('data-skill'));
    });

    document.getElementById('classList').addEventListener('click', function (e) {
      var card = e.target.closest('[data-class]');
      if (!card) return;
      G.Game.startRun(card.getAttribute('data-class'));
    });

    document.getElementById('talentList').addEventListener('click', function (e) {
      var card = e.target.closest('[data-talent]');
      if (!card) return;
      G.Game.chooseTalent(card.getAttribute('data-talent'));
    });

    document.getElementById('shopList').addEventListener('click', function (e) {
      var card = e.target.closest('[data-shop]');
      if (!card) return;
      G.Game.buyShopItem(parseInt(card.getAttribute('data-shop'), 10));
    });

    document.getElementById('shopCloseBtn').addEventListener('click', function () {
      G.Game.closeShop();
    });

    document.getElementById('eventOptions').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-event]');
      if (!btn) return;
      G.Game.chooseEventOption(parseInt(btn.getAttribute('data-event'), 10));
    });

    /* ---------------- 营地 ---------------- */

    document.getElementById('startRunBtn').addEventListener('click', function () {
      G.Render.hideCamp();
      G.Render.showClassSelect();
    });

    document.getElementById('campTabs').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-tab]');
      if (!btn) return;
      currentCampTab = btn.getAttribute('data-tab');
      G.Render.showCampMessage('');
      G.Render.renderCampTab(currentCampTab);
    });

    var campBody = document.getElementById('campBody');

    campBody.addEventListener('click', function (e) {
      var up = e.target.closest('[data-buy-upgrade]');
      if (up) {
        var id = up.getAttribute('data-buy-upgrade');
        var ok = G.Meta.buyUpgrade(id);
        G.Render.renderCampTab('altar');
        G.Render.showCampMessage(ok ? '升级成功' : '点数不足', ok);
        return;
      }

      var un = e.target.closest('[data-buy-unlock]');
      if (un) {
        var uid = un.getAttribute('data-buy-unlock');
        var ok2 = G.Meta.buyUnlock(uid);
        G.Render.renderCampTab('unlock');
        G.Render.showCampMessage(ok2 ? '解锁成功' : '点数不足', ok2);
        return;
      }

      if (e.target.id === 'redeemBtn') redeemCode();
    });

    campBody.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && e.target.id === 'codeInput') {
        e.preventDefault();
        redeemCode();
      }
    });

    document.getElementById('overlayBtn').addEventListener('click', function () {
      G.Render.hideOverlay();
      G.Render.showCamp();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window.Game = window.Game || {});
