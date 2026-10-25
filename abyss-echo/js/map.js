/* 地图生成、BFS 距离场、寻路 */
(function (G) {
  'use strict';

  var W = 30;
  var H = 20;

  var DIRS = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [1, 1], [1, -1], [-1, 1], [-1, -1]
  ];

  function idx(x, y) {
    return y * W + x;
  }

  function overlap(a, b, pad) {
    return a.x - pad < b.x + b.w &&
           a.x + a.w + pad > b.x &&
           a.y - pad < b.y + b.h &&
           a.y + a.h + pad > b.y;
  }

  function carveRoom(tiles, r) {
    for (var y = r.y; y < r.y + r.h; y++) {
      for (var x = r.x; x < r.x + r.w; x++) {
        tiles[idx(x, y)] = 1;
      }
    }
  }

  function roomCenter(r) {
    return { x: r.x + (r.w >> 1), y: r.y + (r.h >> 1) };
  }

  function carveCorridor(tiles, a, b, rng) {
    var hFirst = rng.chance(0.5);
    if (hFirst) {
      var x1 = Math.min(a.x, b.x);
      var x2 = Math.max(a.x, b.x);
      for (var x = x1; x <= x2; x++) tiles[idx(x, a.y)] = 1;
      var y1 = Math.min(a.y, b.y);
      var y2 = Math.max(a.y, b.y);
      for (var y = y1; y <= y2; y++) tiles[idx(b.x, y)] = 1;
    } else {
      var ya = Math.min(a.y, b.y);
      var yb = Math.max(a.y, b.y);
      for (var yy = ya; yy <= yb; yy++) tiles[idx(a.x, yy)] = 1;
      var xa = Math.min(a.x, b.x);
      var xb = Math.max(a.x, b.x);
      for (var xx = xa; xx <= xb; xx++) tiles[idx(xx, b.y)] = 1;
    }
  }

  /**
   * 生成一层地图。
   * tiles: 0=墙 1=地板 2=楼梯
   */
  function generate(rng, floor) {
    var tiles = new Uint8Array(W * H);
    var rooms = [];
    var target = 7 + Math.min(3, (floor / 3) | 0);

    for (var t = 0; t < 140 && rooms.length < target; t++) {
      var w = rng.int(4, 8);
      var h = rng.int(3, 6);
      var x = rng.int(1, W - w - 2);
      var y = rng.int(1, H - h - 2);
      var r = { x: x, y: y, w: w, h: h };

      var ok = true;
      for (var i = 0; i < rooms.length; i++) {
        if (overlap(r, rooms[i], 1)) { ok = false; break; }
      }
      if (!ok) continue;

      rooms.push(r);
      carveRoom(tiles, r);
    }

    /* 逐个连接，形成连通图 */
    for (var j = 1; j < rooms.length; j++) {
      carveCorridor(tiles, roomCenter(rooms[j - 1]), roomCenter(rooms[j]), rng);
    }

    /* 额外补几条环路，避免单线走廊 */
    if (rooms.length > 3 && rng.chance(0.6)) {
      var a = rooms[0];
      var b = rooms[rooms.length - 1];
      carveCorridor(tiles, roomCenter(a), roomCenter(b), rng);
    }

    var spawn = roomCenter(rooms[0]);
    var stairs = roomCenter(rooms[rooms.length - 1]);
    tiles[idx(stairs.x, stairs.y)] = 2;

    /* 特殊格：宝箱 / 商店 / 事件 */
    var specials = { chests: [], shops: [], events: [] };
    var roomPool = rooms.slice(1, rooms.length - 1);
    rng.shuffle(roomPool);

    function takeSpot() {
      while (roomPool.length) {
        var room = roomPool.pop();
        var c = roomCenter(room);
        if (tiles[idx(c.x, c.y)] === 1) return c;
      }
      return null;
    }

    if (floor >= 2) {
      var shopSpot = takeSpot();
      if (shopSpot) {
        tiles[idx(shopSpot.x, shopSpot.y)] = 4;
        specials.shops.push(shopSpot);
      }
    }

    var chestCount = rng.int(1, 2);
    for (var ci = 0; ci < chestCount; ci++) {
      var chestSpot = takeSpot();
      if (chestSpot) {
        tiles[idx(chestSpot.x, chestSpot.y)] = 3;
        specials.chests.push(chestSpot);
      }
    }

    var eventSpot = takeSpot();
    if (eventSpot) {
      tiles[idx(eventSpot.x, eventSpot.y)] = 5;
      specials.events.push(eventSpot);
    }

    /* 收集可行走格 */
    var floors = [];
    for (var yy = 0; yy < H; yy++) {
      for (var xx = 0; xx < W; xx++) {
        if (tiles[idx(xx, yy)] === 1) floors.push({ x: xx, y: yy });
      }
    }

    return {
      W: W,
      H: H,
      tiles: tiles,
      rooms: rooms,
      spawn: spawn,
      stairs: stairs,
      floors: floors,
      specials: specials,
      explored: new Uint8Array(W * H),
      visible: new Uint8Array(W * H)
    };
  }

  function walkable(tiles, x, y) {
    if (x < 0 || y < 0 || x >= W || y >= H) return false;
    var t = tiles[y * W + x];
    return t >= 1 && t <= 5;
  }

  /* 以 (sx,sy) 为源的距离场，用于怪物追踪 */
  function distanceField(map, sx, sy) {
    var tiles = map.tiles;
    var dist = new Uint16Array(W * H);
    dist.fill(65535);

    var start = sy * W + sx;
    dist[start] = 0;
    var queue = [start];
    var head = 0;

    while (head < queue.length) {
      var cur = queue[head++];
      var cx = cur % W;
      var cy = (cur / W) | 0;
      var cd = dist[cur];

      for (var i = 0; i < DIRS.length; i++) {
        var dx = DIRS[i][0];
        var dy = DIRS[i][1];
        var nx = cx + dx;
        var ny = cy + dy;
        if (!walkable(tiles, nx, ny)) continue;
        if (dx !== 0 && dy !== 0) {
          if (!walkable(tiles, cx + dx, cy) || !walkable(tiles, cx, cy + dy)) continue;
        }
        var ni = ny * W + nx;
        if (dist[ni] !== 65535) continue;
        dist[ni] = cd + 1;
        queue.push(ni);
      }
    }
    return dist;
  }

  /* BFS 寻路，返回从起点到终点的路径（不含起点） */
  function findPath(map, sx, sy, tx, ty) {
    if (sx === tx && sy === ty) return [];
    var tiles = map.tiles;
    var start = sy * W + sx;
    var goal = ty * W + tx;
    if (!walkable(tiles, tx, ty)) return null;

    var prev = new Int32Array(W * H);
    prev.fill(-1);
    prev[start] = start;

    var queue = [start];
    var head = 0;

    while (head < queue.length) {
      var cur = queue[head++];
      if (cur === goal) break;
      var cx = cur % W;
      var cy = (cur / W) | 0;

      for (var i = 0; i < DIRS.length; i++) {
        var dx = DIRS[i][0];
        var dy = DIRS[i][1];
        var nx = cx + dx;
        var ny = cy + dy;
        if (!walkable(tiles, nx, ny)) continue;
        if (dx !== 0 && dy !== 0) {
          if (!walkable(tiles, cx + dx, cy) || !walkable(tiles, cx, cy + dy)) continue;
        }
        var ni = ny * W + nx;
        if (prev[ni] !== -1) continue;
        prev[ni] = cur;
        queue.push(ni);
      }
    }

    if (prev[goal] === -1) return null;

    var path = [];
    var c = goal;
    var guard = 0;
    while (c !== start && guard++ < W * H) {
      path.push({ x: c % W, y: (c / W) | 0 });
      c = prev[c];
    }
    path.reverse();
    return path;
  }

  G.MapGen = {
    W: W,
    H: H,
    DIRS: DIRS,
    idx: idx,
    generate: generate,
    walkable: walkable,
    distanceField: distanceField,
    findPath: findPath
  };
})(window.Game = window.Game || {});
