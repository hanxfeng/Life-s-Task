/* 种子随机数（mulberry32），保证同种子同地图 */
(function (G) {
  'use strict';

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function RNG(seed) {
    this.seed = seed >>> 0;
    this._next = mulberry32(this.seed);
  }

  RNG.prototype.next = function () {
    return this._next();
  };

  RNG.prototype.int = function (min, max) {
    if (max <= min) return min;
    return min + Math.floor(this._next() * (max - min + 1));
  };

  RNG.prototype.pick = function (arr) {
    return arr[this.int(0, arr.length - 1)];
  };

  RNG.prototype.chance = function (p) {
    return this._next() < p;
  };

  RNG.prototype.shuffle = function (arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = this.int(0, i);
      var t = arr[i];
      arr[i] = arr[j];
      arr[j] = t;
    }
    return arr;
  };

  function hashSeed(str) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }

  G.RNG = RNG;
  G.hashSeed = hashSeed;
})(window.Game = window.Game || {});
