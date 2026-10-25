/* 兑换码：Crockford Base32，12 字符编码 60 bit
 * 字段：点数 12 bit | 时间戳 22 bit（分钟） | nonce 18 bit | 校验 8 bit
 * 生成端与消费端共用本文件的不同函数。
 */
(function (root) {
  'use strict';

  var ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  var EPOCH = Date.UTC(2026, 0, 1);
  var EXPIRE_MINUTES = 90 * 24 * 60;

  function nowMinutes() {
    return Math.floor((Date.now() - EPOCH) / 60000);
  }

  function crc8(bytes) {
    var crc = 0;
    for (var i = 0; i < bytes.length; i++) {
      crc ^= bytes[i];
      for (var j = 0; j < 8; j++) {
        crc = (crc & 0x80) ? (((crc << 1) ^ 0x07) & 0xff) : ((crc << 1) & 0xff);
      }
    }
    return crc & 0xff;
  }

  function bytesOf(base) {
    var arr = [];
    for (var i = 6; i >= 0; i--) {
      arr.push(Number((base >> BigInt(i * 8)) & 0xffn));
    }
    return arr;
  }

  function encode(points, timestamp, nonce) {
    points = Math.max(0, Math.min(4095, points | 0));
    timestamp = Math.max(0, Math.min(4194303, timestamp | 0));
    nonce = Math.max(0, Math.min(262143, nonce | 0));

    var base = (BigInt(points) << 40n) | (BigInt(timestamp) << 18n) | BigInt(nonce);
    var cs = crc8(bytesOf(base));
    var full = (base << 8n) | BigInt(cs);

    var chars = '';
    for (var i = 11; i >= 0; i--) {
      chars += ALPHABET[Number((full >> BigInt(i * 5)) & 31n)];
    }
    return 'ECHO-' + chars.slice(0, 4) + '-' + chars.slice(4, 8) + '-' + chars.slice(8, 12);
  }

  function decode(code) {
    if (!code) return null;

    var clean = String(code).toUpperCase().replace(/[^0-9A-Z]/g, '');
    if (clean.indexOf('ECHO') === 0) clean = clean.slice(4);
    if (clean.length !== 12) return null;

    var full = 0n;
    for (var i = 0; i < 12; i++) {
      var idx = ALPHABET.indexOf(clean[i]);
      if (idx < 0) return null;
      full = (full << 5n) | BigInt(idx);
    }

    var cs = Number(full & 0xffn);
    var base = full >> 8n;

    if (crc8(bytesOf(base)) !== cs) return null;

    var nonce = Number(base & 0x3ffffn);
    var ts = Number((base >> 18n) & 0x3fffffn);
    var points = Number((base >> 40n) & 0xfffn);

    var age = nowMinutes() - ts;
    var expired = age > EXPIRE_MINUTES || age < -24 * 60;

    return {
      points: points,
      timestamp: ts,
      nonce: nonce,
      expired: expired
    };
  }

  /* 调试用：生成一个当前时间的码 */
  function generate(points) {
    var nonce = Math.floor(Math.random() * 262144);
    return encode(points, nowMinutes(), nonce);
  }

  root.EchoCode = {
    encode: encode,
    decode: decode,
    generate: generate,
    nowMinutes: nowMinutes,
    ALPHABET: ALPHABET
  };
})(window);
