"use strict";
const fs$3 = require("fs");
const path$2 = require("path");
const require$$3 = require("events");
const require$$5 = require("assert");
require("util");
const electron = require("electron");
const electronUpdater = require("electron-updater");
const log = require("electron-log");
const Store = require("electron-store");
const ini = require("ini");
const crypto = require("crypto");
function getDefaultExportFromCjs(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
}
var old$1 = {};
var pathModule = path$2;
var isWindows = process.platform === "win32";
var fs$2 = fs$3;
var DEBUG = process.env.NODE_DEBUG && /fs/.test(process.env.NODE_DEBUG);
function rethrow() {
  var callback;
  if (DEBUG) {
    var backtrace = new Error();
    callback = debugCallback;
  } else
    callback = missingCallback;
  return callback;
  function debugCallback(err) {
    if (err) {
      backtrace.message = err.message;
      err = backtrace;
      missingCallback(err);
    }
  }
  function missingCallback(err) {
    if (err) {
      if (process.throwDeprecation)
        throw err;
      else if (!process.noDeprecation) {
        var msg = "fs: missing callback " + (err.stack || err.message);
        if (process.traceDeprecation)
          console.trace(msg);
        else
          console.error(msg);
      }
    }
  }
}
function maybeCallback(cb) {
  return typeof cb === "function" ? cb : rethrow();
}
pathModule.normalize;
if (isWindows) {
  var nextPartRe = /(.*?)(?:[\/\\]+|$)/g;
} else {
  var nextPartRe = /(.*?)(?:[\/]+|$)/g;
}
if (isWindows) {
  var splitRootRe = /^(?:[a-zA-Z]:|[\\\/]{2}[^\\\/]+[\\\/][^\\\/]+)?[\\\/]*/;
} else {
  var splitRootRe = /^[\/]*/;
}
old$1.realpathSync = function realpathSync(p, cache) {
  p = pathModule.resolve(p);
  if (cache && Object.prototype.hasOwnProperty.call(cache, p)) {
    return cache[p];
  }
  var original = p, seenLinks = {}, knownHard = {};
  var pos;
  var current;
  var base;
  var previous;
  start();
  function start() {
    var m = splitRootRe.exec(p);
    pos = m[0].length;
    current = m[0];
    base = m[0];
    previous = "";
    if (isWindows && !knownHard[base]) {
      fs$2.lstatSync(base);
      knownHard[base] = true;
    }
  }
  while (pos < p.length) {
    nextPartRe.lastIndex = pos;
    var result = nextPartRe.exec(p);
    previous = current;
    current += result[0];
    base = previous + result[1];
    pos = nextPartRe.lastIndex;
    if (knownHard[base] || cache && cache[base] === base) {
      continue;
    }
    var resolvedLink;
    if (cache && Object.prototype.hasOwnProperty.call(cache, base)) {
      resolvedLink = cache[base];
    } else {
      var stat = fs$2.lstatSync(base);
      if (!stat.isSymbolicLink()) {
        knownHard[base] = true;
        if (cache) cache[base] = base;
        continue;
      }
      var linkTarget = null;
      if (!isWindows) {
        var id = stat.dev.toString(32) + ":" + stat.ino.toString(32);
        if (seenLinks.hasOwnProperty(id)) {
          linkTarget = seenLinks[id];
        }
      }
      if (linkTarget === null) {
        fs$2.statSync(base);
        linkTarget = fs$2.readlinkSync(base);
      }
      resolvedLink = pathModule.resolve(previous, linkTarget);
      if (cache) cache[base] = resolvedLink;
      if (!isWindows) seenLinks[id] = linkTarget;
    }
    p = pathModule.resolve(resolvedLink, p.slice(pos));
    start();
  }
  if (cache) cache[original] = p;
  return p;
};
old$1.realpath = function realpath(p, cache, cb) {
  if (typeof cb !== "function") {
    cb = maybeCallback(cache);
    cache = null;
  }
  p = pathModule.resolve(p);
  if (cache && Object.prototype.hasOwnProperty.call(cache, p)) {
    return process.nextTick(cb.bind(null, null, cache[p]));
  }
  var original = p, seenLinks = {}, knownHard = {};
  var pos;
  var current;
  var base;
  var previous;
  start();
  function start() {
    var m = splitRootRe.exec(p);
    pos = m[0].length;
    current = m[0];
    base = m[0];
    previous = "";
    if (isWindows && !knownHard[base]) {
      fs$2.lstat(base, function(err) {
        if (err) return cb(err);
        knownHard[base] = true;
        LOOP();
      });
    } else {
      process.nextTick(LOOP);
    }
  }
  function LOOP() {
    if (pos >= p.length) {
      if (cache) cache[original] = p;
      return cb(null, p);
    }
    nextPartRe.lastIndex = pos;
    var result = nextPartRe.exec(p);
    previous = current;
    current += result[0];
    base = previous + result[1];
    pos = nextPartRe.lastIndex;
    if (knownHard[base] || cache && cache[base] === base) {
      return process.nextTick(LOOP);
    }
    if (cache && Object.prototype.hasOwnProperty.call(cache, base)) {
      return gotResolvedLink(cache[base]);
    }
    return fs$2.lstat(base, gotStat);
  }
  function gotStat(err, stat) {
    if (err) return cb(err);
    if (!stat.isSymbolicLink()) {
      knownHard[base] = true;
      if (cache) cache[base] = base;
      return process.nextTick(LOOP);
    }
    if (!isWindows) {
      var id = stat.dev.toString(32) + ":" + stat.ino.toString(32);
      if (seenLinks.hasOwnProperty(id)) {
        return gotTarget(null, seenLinks[id], base);
      }
    }
    fs$2.stat(base, function(err2) {
      if (err2) return cb(err2);
      fs$2.readlink(base, function(err3, target) {
        if (!isWindows) seenLinks[id] = target;
        gotTarget(err3, target);
      });
    });
  }
  function gotTarget(err, target, base2) {
    if (err) return cb(err);
    var resolvedLink = pathModule.resolve(previous, target);
    if (cache) cache[base2] = resolvedLink;
    gotResolvedLink(resolvedLink);
  }
  function gotResolvedLink(resolvedLink) {
    p = pathModule.resolve(resolvedLink, p.slice(pos));
    start();
  }
};
var fs_realpath = realpath2;
realpath2.realpath = realpath2;
realpath2.sync = realpathSync2;
realpath2.realpathSync = realpathSync2;
realpath2.monkeypatch = monkeypatch;
realpath2.unmonkeypatch = unmonkeypatch;
var fs$1 = fs$3;
var origRealpath = fs$1.realpath;
var origRealpathSync = fs$1.realpathSync;
var version = process.version;
var ok = /^v[0-5]\./.test(version);
var old = old$1;
function newError(er) {
  return er && er.syscall === "realpath" && (er.code === "ELOOP" || er.code === "ENOMEM" || er.code === "ENAMETOOLONG");
}
function realpath2(p, cache, cb) {
  if (ok) {
    return origRealpath(p, cache, cb);
  }
  if (typeof cache === "function") {
    cb = cache;
    cache = null;
  }
  origRealpath(p, cache, function(er, result) {
    if (newError(er)) {
      old.realpath(p, cache, cb);
    } else {
      cb(er, result);
    }
  });
}
function realpathSync2(p, cache) {
  if (ok) {
    return origRealpathSync(p, cache);
  }
  try {
    return origRealpathSync(p, cache);
  } catch (er) {
    if (newError(er)) {
      return old.realpathSync(p, cache);
    } else {
      throw er;
    }
  }
}
function monkeypatch() {
  fs$1.realpath = realpath2;
  fs$1.realpathSync = realpathSync2;
}
function unmonkeypatch() {
  fs$1.realpath = origRealpath;
  fs$1.realpathSync = origRealpathSync;
}
var concatMap$1 = function(xs, fn) {
  var res = [];
  for (var i = 0; i < xs.length; i++) {
    var x = fn(xs[i], i);
    if (isArray(x)) res.push.apply(res, x);
    else res.push(x);
  }
  return res;
};
var isArray = Array.isArray || function(xs) {
  return Object.prototype.toString.call(xs) === "[object Array]";
};
var balancedMatch = balanced$1;
function balanced$1(a, b, str) {
  if (a instanceof RegExp) a = maybeMatch(a, str);
  if (b instanceof RegExp) b = maybeMatch(b, str);
  var r = range(a, b, str);
  return r && {
    start: r[0],
    end: r[1],
    pre: str.slice(0, r[0]),
    body: str.slice(r[0] + a.length, r[1]),
    post: str.slice(r[1] + b.length)
  };
}
function maybeMatch(reg, str) {
  var m = str.match(reg);
  return m ? m[0] : null;
}
balanced$1.range = range;
function range(a, b, str) {
  var begs, beg, left, right, result;
  var ai = str.indexOf(a);
  var bi = str.indexOf(b, ai + 1);
  var i = ai;
  if (ai >= 0 && bi > 0) {
    if (a === b) {
      return [ai, bi];
    }
    begs = [];
    left = str.length;
    while (i >= 0 && !result) {
      if (i == ai) {
        begs.push(i);
        ai = str.indexOf(a, i + 1);
      } else if (begs.length == 1) {
        result = [begs.pop(), bi];
      } else {
        beg = begs.pop();
        if (beg < left) {
          left = beg;
          right = bi;
        }
        bi = str.indexOf(b, i + 1);
      }
      i = ai < bi && ai >= 0 ? ai : bi;
    }
    if (begs.length) {
      result = [left, right];
    }
  }
  return result;
}
var concatMap = concatMap$1;
var balanced = balancedMatch;
var braceExpansion = expandTop;
var escSlash = "\0SLASH" + Math.random() + "\0";
var escOpen = "\0OPEN" + Math.random() + "\0";
var escClose = "\0CLOSE" + Math.random() + "\0";
var escComma = "\0COMMA" + Math.random() + "\0";
var escPeriod = "\0PERIOD" + Math.random() + "\0";
function numeric(str) {
  return parseInt(str, 10) == str ? parseInt(str, 10) : str.charCodeAt(0);
}
function escapeBraces(str) {
  return str.split("\\\\").join(escSlash).split("\\{").join(escOpen).split("\\}").join(escClose).split("\\,").join(escComma).split("\\.").join(escPeriod);
}
function unescapeBraces(str) {
  return str.split(escSlash).join("\\").split(escOpen).join("{").split(escClose).join("}").split(escComma).join(",").split(escPeriod).join(".");
}
function parseCommaParts(str) {
  if (!str)
    return [""];
  var parts = [];
  var m = balanced("{", "}", str);
  if (!m)
    return str.split(",");
  var pre = m.pre;
  var body = m.body;
  var post = m.post;
  var p = pre.split(",");
  p[p.length - 1] += "{" + body + "}";
  var postParts = parseCommaParts(post);
  if (post.length) {
    p[p.length - 1] += postParts.shift();
    p.push.apply(p, postParts);
  }
  parts.push.apply(parts, p);
  return parts;
}
function expandTop(str) {
  if (!str)
    return [];
  if (str.substr(0, 2) === "{}") {
    str = "\\{\\}" + str.substr(2);
  }
  return expand$1(escapeBraces(str), true).map(unescapeBraces);
}
function embrace(str) {
  return "{" + str + "}";
}
function isPadded(el) {
  return /^-?0\d/.test(el);
}
function lte(i, y) {
  return i <= y;
}
function gte(i, y) {
  return i >= y;
}
function expand$1(str, isTop) {
  var expansions = [];
  var m = balanced("{", "}", str);
  if (!m || /\$$/.test(m.pre)) return [str];
  var isNumericSequence = /^-?\d+\.\.-?\d+(?:\.\.-?\d+)?$/.test(m.body);
  var isAlphaSequence = /^[a-zA-Z]\.\.[a-zA-Z](?:\.\.-?\d+)?$/.test(m.body);
  var isSequence = isNumericSequence || isAlphaSequence;
  var isOptions = m.body.indexOf(",") >= 0;
  if (!isSequence && !isOptions) {
    if (m.post.match(/,.*\}/)) {
      str = m.pre + "{" + m.body + escClose + m.post;
      return expand$1(str);
    }
    return [str];
  }
  var n;
  if (isSequence) {
    n = m.body.split(/\.\./);
  } else {
    n = parseCommaParts(m.body);
    if (n.length === 1) {
      n = expand$1(n[0], false).map(embrace);
      if (n.length === 1) {
        var post = m.post.length ? expand$1(m.post, false) : [""];
        return post.map(function(p) {
          return m.pre + n[0] + p;
        });
      }
    }
  }
  var pre = m.pre;
  var post = m.post.length ? expand$1(m.post, false) : [""];
  var N;
  if (isSequence) {
    var x = numeric(n[0]);
    var y = numeric(n[1]);
    var width = Math.max(n[0].length, n[1].length);
    var incr = n.length == 3 ? Math.abs(numeric(n[2])) : 1;
    var test = lte;
    var reverse = y < x;
    if (reverse) {
      incr *= -1;
      test = gte;
    }
    var pad = n.some(isPadded);
    N = [];
    for (var i = x; test(i, y); i += incr) {
      var c;
      if (isAlphaSequence) {
        c = String.fromCharCode(i);
        if (c === "\\")
          c = "";
      } else {
        c = String(i);
        if (pad) {
          var need = width - c.length;
          if (need > 0) {
            var z = new Array(need + 1).join("0");
            if (i < 0)
              c = "-" + z + c.slice(1);
            else
              c = z + c;
          }
        }
      }
      N.push(c);
    }
  } else {
    N = concatMap(n, function(el) {
      return expand$1(el, false);
    });
  }
  for (var j = 0; j < N.length; j++) {
    for (var k = 0; k < post.length; k++) {
      var expansion = pre + N[j] + post[k];
      if (!isTop || isSequence || expansion)
        expansions.push(expansion);
    }
  }
  return expansions;
}
var minimatch_1 = minimatch$1;
minimatch$1.Minimatch = Minimatch$1;
var path$1 = function() {
  try {
    return require("path");
  } catch (e) {
  }
}() || {
  sep: "/"
};
minimatch$1.sep = path$1.sep;
var GLOBSTAR = minimatch$1.GLOBSTAR = Minimatch$1.GLOBSTAR = {};
var expand = braceExpansion;
var plTypes = {
  "!": { open: "(?:(?!(?:", close: "))[^/]*?)" },
  "?": { open: "(?:", close: ")?" },
  "+": { open: "(?:", close: ")+" },
  "*": { open: "(?:", close: ")*" },
  "@": { open: "(?:", close: ")" }
};
var qmark = "[^/]";
var star = qmark + "*?";
var twoStarDot = "(?:(?!(?:\\/|^)(?:\\.{1,2})($|\\/)).)*?";
var twoStarNoDot = "(?:(?!(?:\\/|^)\\.).)*?";
var reSpecials = charSet("().*{}+?[]^$\\!");
function charSet(s) {
  return s.split("").reduce(function(set, c) {
    set[c] = true;
    return set;
  }, {});
}
var slashSplit = /\/+/;
minimatch$1.filter = filter;
function filter(pattern, options) {
  options = options || {};
  return function(p, i, list) {
    return minimatch$1(p, pattern, options);
  };
}
function ext(a, b) {
  b = b || {};
  var t = {};
  Object.keys(a).forEach(function(k) {
    t[k] = a[k];
  });
  Object.keys(b).forEach(function(k) {
    t[k] = b[k];
  });
  return t;
}
minimatch$1.defaults = function(def) {
  if (!def || typeof def !== "object" || !Object.keys(def).length) {
    return minimatch$1;
  }
  var orig = minimatch$1;
  var m = function minimatch2(p, pattern, options) {
    return orig(p, pattern, ext(def, options));
  };
  m.Minimatch = function Minimatch2(pattern, options) {
    return new orig.Minimatch(pattern, ext(def, options));
  };
  m.Minimatch.defaults = function defaults(options) {
    return orig.defaults(ext(def, options)).Minimatch;
  };
  m.filter = function filter2(pattern, options) {
    return orig.filter(pattern, ext(def, options));
  };
  m.defaults = function defaults(options) {
    return orig.defaults(ext(def, options));
  };
  m.makeRe = function makeRe2(pattern, options) {
    return orig.makeRe(pattern, ext(def, options));
  };
  m.braceExpand = function braceExpand2(pattern, options) {
    return orig.braceExpand(pattern, ext(def, options));
  };
  m.match = function(list, pattern, options) {
    return orig.match(list, pattern, ext(def, options));
  };
  return m;
};
Minimatch$1.defaults = function(def) {
  return minimatch$1.defaults(def).Minimatch;
};
function minimatch$1(p, pattern, options) {
  assertValidPattern(pattern);
  if (!options) options = {};
  if (!options.nocomment && pattern.charAt(0) === "#") {
    return false;
  }
  return new Minimatch$1(pattern, options).match(p);
}
function Minimatch$1(pattern, options) {
  if (!(this instanceof Minimatch$1)) {
    return new Minimatch$1(pattern, options);
  }
  assertValidPattern(pattern);
  if (!options) options = {};
  pattern = pattern.trim();
  if (!options.allowWindowsEscape && path$1.sep !== "/") {
    pattern = pattern.split(path$1.sep).join("/");
  }
  this.options = options;
  this.set = [];
  this.pattern = pattern;
  this.regexp = null;
  this.negate = false;
  this.comment = false;
  this.empty = false;
  this.partial = !!options.partial;
  this.make();
}
Minimatch$1.prototype.debug = function() {
};
Minimatch$1.prototype.make = make;
function make() {
  var pattern = this.pattern;
  var options = this.options;
  if (!options.nocomment && pattern.charAt(0) === "#") {
    this.comment = true;
    return;
  }
  if (!pattern) {
    this.empty = true;
    return;
  }
  this.parseNegate();
  var set = this.globSet = this.braceExpand();
  if (options.debug) this.debug = function debug() {
    console.error.apply(console, arguments);
  };
  this.debug(this.pattern, set);
  set = this.globParts = set.map(function(s) {
    return s.split(slashSplit);
  });
  this.debug(this.pattern, set);
  set = set.map(function(s, si, set2) {
    return s.map(this.parse, this);
  }, this);
  this.debug(this.pattern, set);
  set = set.filter(function(s) {
    return s.indexOf(false) === -1;
  });
  this.debug(this.pattern, set);
  this.set = set;
}
Minimatch$1.prototype.parseNegate = parseNegate;
function parseNegate() {
  var pattern = this.pattern;
  var negate = false;
  var options = this.options;
  var negateOffset = 0;
  if (options.nonegate) return;
  for (var i = 0, l = pattern.length; i < l && pattern.charAt(i) === "!"; i++) {
    negate = !negate;
    negateOffset++;
  }
  if (negateOffset) this.pattern = pattern.substr(negateOffset);
  this.negate = negate;
}
minimatch$1.braceExpand = function(pattern, options) {
  return braceExpand(pattern, options);
};
Minimatch$1.prototype.braceExpand = braceExpand;
function braceExpand(pattern, options) {
  if (!options) {
    if (this instanceof Minimatch$1) {
      options = this.options;
    } else {
      options = {};
    }
  }
  pattern = typeof pattern === "undefined" ? this.pattern : pattern;
  assertValidPattern(pattern);
  if (options.nobrace || !/\{(?:(?!\{).)*\}/.test(pattern)) {
    return [pattern];
  }
  return expand(pattern);
}
var MAX_PATTERN_LENGTH = 1024 * 64;
var assertValidPattern = function(pattern) {
  if (typeof pattern !== "string") {
    throw new TypeError("invalid pattern");
  }
  if (pattern.length > MAX_PATTERN_LENGTH) {
    throw new TypeError("pattern is too long");
  }
};
Minimatch$1.prototype.parse = parse;
var SUBPARSE = {};
function parse(pattern, isSub) {
  assertValidPattern(pattern);
  var options = this.options;
  if (pattern === "**") {
    if (!options.noglobstar)
      return GLOBSTAR;
    else
      pattern = "*";
  }
  if (pattern === "") return "";
  var re = "";
  var hasMagic = !!options.nocase;
  var escaping = false;
  var patternListStack = [];
  var negativeLists = [];
  var stateChar;
  var inClass = false;
  var reClassStart = -1;
  var classStart = -1;
  var patternStart = pattern.charAt(0) === "." ? "" : options.dot ? "(?!(?:^|\\/)\\.{1,2}(?:$|\\/))" : "(?!\\.)";
  var self = this;
  function clearStateChar() {
    if (stateChar) {
      switch (stateChar) {
        case "*":
          re += star;
          hasMagic = true;
          break;
        case "?":
          re += qmark;
          hasMagic = true;
          break;
        default:
          re += "\\" + stateChar;
          break;
      }
      self.debug("clearStateChar %j %j", stateChar, re);
      stateChar = false;
    }
  }
  for (var i = 0, len = pattern.length, c; i < len && (c = pattern.charAt(i)); i++) {
    this.debug("%s	%s %s %j", pattern, i, re, c);
    if (escaping && reSpecials[c]) {
      re += "\\" + c;
      escaping = false;
      continue;
    }
    switch (c) {
      case "/": {
        return false;
      }
      case "\\":
        clearStateChar();
        escaping = true;
        continue;
      case "?":
      case "*":
      case "+":
      case "@":
      case "!":
        this.debug("%s	%s %s %j <-- stateChar", pattern, i, re, c);
        if (inClass) {
          this.debug("  in class");
          if (c === "!" && i === classStart + 1) c = "^";
          re += c;
          continue;
        }
        self.debug("call clearStateChar %j", stateChar);
        clearStateChar();
        stateChar = c;
        if (options.noext) clearStateChar();
        continue;
      case "(":
        if (inClass) {
          re += "(";
          continue;
        }
        if (!stateChar) {
          re += "\\(";
          continue;
        }
        patternListStack.push({
          type: stateChar,
          start: i - 1,
          reStart: re.length,
          open: plTypes[stateChar].open,
          close: plTypes[stateChar].close
        });
        re += stateChar === "!" ? "(?:(?!(?:" : "(?:";
        this.debug("plType %j %j", stateChar, re);
        stateChar = false;
        continue;
      case ")":
        if (inClass || !patternListStack.length) {
          re += "\\)";
          continue;
        }
        clearStateChar();
        hasMagic = true;
        var pl = patternListStack.pop();
        re += pl.close;
        if (pl.type === "!") {
          negativeLists.push(pl);
        }
        pl.reEnd = re.length;
        continue;
      case "|":
        if (inClass || !patternListStack.length || escaping) {
          re += "\\|";
          escaping = false;
          continue;
        }
        clearStateChar();
        re += "|";
        continue;
      case "[":
        clearStateChar();
        if (inClass) {
          re += "\\" + c;
          continue;
        }
        inClass = true;
        classStart = i;
        reClassStart = re.length;
        re += c;
        continue;
      case "]":
        if (i === classStart + 1 || !inClass) {
          re += "\\" + c;
          escaping = false;
          continue;
        }
        var cs = pattern.substring(classStart + 1, i);
        try {
          RegExp("[" + cs + "]");
        } catch (er) {
          var sp = this.parse(cs, SUBPARSE);
          re = re.substr(0, reClassStart) + "\\[" + sp[0] + "\\]";
          hasMagic = hasMagic || sp[1];
          inClass = false;
          continue;
        }
        hasMagic = true;
        inClass = false;
        re += c;
        continue;
      default:
        clearStateChar();
        if (escaping) {
          escaping = false;
        } else if (reSpecials[c] && !(c === "^" && inClass)) {
          re += "\\";
        }
        re += c;
    }
  }
  if (inClass) {
    cs = pattern.substr(classStart + 1);
    sp = this.parse(cs, SUBPARSE);
    re = re.substr(0, reClassStart) + "\\[" + sp[0];
    hasMagic = hasMagic || sp[1];
  }
  for (pl = patternListStack.pop(); pl; pl = patternListStack.pop()) {
    var tail = re.slice(pl.reStart + pl.open.length);
    this.debug("setting tail", re, pl);
    tail = tail.replace(/((?:\\{2}){0,64})(\\?)\|/g, function(_, $1, $2) {
      if (!$2) {
        $2 = "\\";
      }
      return $1 + $1 + $2 + "|";
    });
    this.debug("tail=%j\n   %s", tail, tail, pl, re);
    var t = pl.type === "*" ? star : pl.type === "?" ? qmark : "\\" + pl.type;
    hasMagic = true;
    re = re.slice(0, pl.reStart) + t + "\\(" + tail;
  }
  clearStateChar();
  if (escaping) {
    re += "\\\\";
  }
  var addPatternStart = false;
  switch (re.charAt(0)) {
    case "[":
    case ".":
    case "(":
      addPatternStart = true;
  }
  for (var n = negativeLists.length - 1; n > -1; n--) {
    var nl = negativeLists[n];
    var nlBefore = re.slice(0, nl.reStart);
    var nlFirst = re.slice(nl.reStart, nl.reEnd - 8);
    var nlLast = re.slice(nl.reEnd - 8, nl.reEnd);
    var nlAfter = re.slice(nl.reEnd);
    nlLast += nlAfter;
    var openParensBefore = nlBefore.split("(").length - 1;
    var cleanAfter = nlAfter;
    for (i = 0; i < openParensBefore; i++) {
      cleanAfter = cleanAfter.replace(/\)[+*?]?/, "");
    }
    nlAfter = cleanAfter;
    var dollar = "";
    if (nlAfter === "" && isSub !== SUBPARSE) {
      dollar = "$";
    }
    var newRe = nlBefore + nlFirst + nlAfter + dollar + nlLast;
    re = newRe;
  }
  if (re !== "" && hasMagic) {
    re = "(?=.)" + re;
  }
  if (addPatternStart) {
    re = patternStart + re;
  }
  if (isSub === SUBPARSE) {
    return [re, hasMagic];
  }
  if (!hasMagic) {
    return globUnescape(pattern);
  }
  var flags = options.nocase ? "i" : "";
  try {
    var regExp = new RegExp("^" + re + "$", flags);
  } catch (er) {
    return new RegExp("$.");
  }
  regExp._glob = pattern;
  regExp._src = re;
  return regExp;
}
minimatch$1.makeRe = function(pattern, options) {
  return new Minimatch$1(pattern, options || {}).makeRe();
};
Minimatch$1.prototype.makeRe = makeRe;
function makeRe() {
  if (this.regexp || this.regexp === false) return this.regexp;
  var set = this.set;
  if (!set.length) {
    this.regexp = false;
    return this.regexp;
  }
  var options = this.options;
  var twoStar = options.noglobstar ? star : options.dot ? twoStarDot : twoStarNoDot;
  var flags = options.nocase ? "i" : "";
  var re = set.map(function(pattern) {
    return pattern.map(function(p) {
      return p === GLOBSTAR ? twoStar : typeof p === "string" ? regExpEscape(p) : p._src;
    }).join("\\/");
  }).join("|");
  re = "^(?:" + re + ")$";
  if (this.negate) re = "^(?!" + re + ").*$";
  try {
    this.regexp = new RegExp(re, flags);
  } catch (ex) {
    this.regexp = false;
  }
  return this.regexp;
}
minimatch$1.match = function(list, pattern, options) {
  options = options || {};
  var mm = new Minimatch$1(pattern, options);
  list = list.filter(function(f) {
    return mm.match(f);
  });
  if (mm.options.nonull && !list.length) {
    list.push(pattern);
  }
  return list;
};
Minimatch$1.prototype.match = function match(f, partial) {
  if (typeof partial === "undefined") partial = this.partial;
  this.debug("match", f, this.pattern);
  if (this.comment) return false;
  if (this.empty) return f === "";
  if (f === "/" && partial) return true;
  var options = this.options;
  if (path$1.sep !== "/") {
    f = f.split(path$1.sep).join("/");
  }
  f = f.split(slashSplit);
  this.debug(this.pattern, "split", f);
  var set = this.set;
  this.debug(this.pattern, "set", set);
  var filename;
  var i;
  for (i = f.length - 1; i >= 0; i--) {
    filename = f[i];
    if (filename) break;
  }
  for (i = 0; i < set.length; i++) {
    var pattern = set[i];
    var file = f;
    if (options.matchBase && pattern.length === 1) {
      file = [filename];
    }
    var hit = this.matchOne(file, pattern, partial);
    if (hit) {
      if (options.flipNegate) return true;
      return !this.negate;
    }
  }
  if (options.flipNegate) return false;
  return this.negate;
};
Minimatch$1.prototype.matchOne = function(file, pattern, partial) {
  var options = this.options;
  this.debug(
    "matchOne",
    { "this": this, file, pattern }
  );
  this.debug("matchOne", file.length, pattern.length);
  for (var fi = 0, pi = 0, fl = file.length, pl = pattern.length; fi < fl && pi < pl; fi++, pi++) {
    this.debug("matchOne loop");
    var p = pattern[pi];
    var f = file[fi];
    this.debug(pattern, p, f);
    if (p === false) return false;
    if (p === GLOBSTAR) {
      this.debug("GLOBSTAR", [pattern, p, f]);
      var fr = fi;
      var pr = pi + 1;
      if (pr === pl) {
        this.debug("** at the end");
        for (; fi < fl; fi++) {
          if (file[fi] === "." || file[fi] === ".." || !options.dot && file[fi].charAt(0) === ".") return false;
        }
        return true;
      }
      while (fr < fl) {
        var swallowee = file[fr];
        this.debug("\nglobstar while", file, fr, pattern, pr, swallowee);
        if (this.matchOne(file.slice(fr), pattern.slice(pr), partial)) {
          this.debug("globstar found match!", fr, fl, swallowee);
          return true;
        } else {
          if (swallowee === "." || swallowee === ".." || !options.dot && swallowee.charAt(0) === ".") {
            this.debug("dot detected!", file, fr, pattern, pr);
            break;
          }
          this.debug("globstar swallow a segment, and continue");
          fr++;
        }
      }
      if (partial) {
        this.debug("\n>>> no match, partial?", file, fr, pattern, pr);
        if (fr === fl) return true;
      }
      return false;
    }
    var hit;
    if (typeof p === "string") {
      hit = f === p;
      this.debug("string match", p, f, hit);
    } else {
      hit = f.match(p);
      this.debug("pattern match", p, f, hit);
    }
    if (!hit) return false;
  }
  if (fi === fl && pi === pl) {
    return true;
  } else if (fi === fl) {
    return partial;
  } else if (pi === pl) {
    return fi === fl - 1 && file[fi] === "";
  }
  throw new Error("wtf?");
};
function globUnescape(s) {
  return s.replace(/\\(.)/g, "$1");
}
function regExpEscape(s) {
  return s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}
var inherits = { exports: {} };
var inherits_browser = { exports: {} };
var hasRequiredInherits_browser;
function requireInherits_browser() {
  if (hasRequiredInherits_browser) return inherits_browser.exports;
  hasRequiredInherits_browser = 1;
  if (typeof Object.create === "function") {
    inherits_browser.exports = function inherits2(ctor, superCtor) {
      if (superCtor) {
        ctor.super_ = superCtor;
        ctor.prototype = Object.create(superCtor.prototype, {
          constructor: {
            value: ctor,
            enumerable: false,
            writable: true,
            configurable: true
          }
        });
      }
    };
  } else {
    inherits_browser.exports = function inherits2(ctor, superCtor) {
      if (superCtor) {
        ctor.super_ = superCtor;
        var TempCtor = function() {
        };
        TempCtor.prototype = superCtor.prototype;
        ctor.prototype = new TempCtor();
        ctor.prototype.constructor = ctor;
      }
    };
  }
  return inherits_browser.exports;
}
try {
  var util = require("util");
  if (typeof util.inherits !== "function") throw "";
  inherits.exports = util.inherits;
} catch (e) {
  inherits.exports = requireInherits_browser();
}
var inheritsExports = inherits.exports;
var pathIsAbsolute = { exports: {} };
function posix(path2) {
  return path2.charAt(0) === "/";
}
function win32(path2) {
  var splitDeviceRe = /^([a-zA-Z]:|[\\\/]{2}[^\\\/]+[\\\/]+[^\\\/]+)?([\\\/])?([\s\S]*?)$/;
  var result = splitDeviceRe.exec(path2);
  var device = result[1] || "";
  var isUnc = Boolean(device && device.charAt(1) !== ":");
  return Boolean(result[2] || isUnc);
}
pathIsAbsolute.exports = process.platform === "win32" ? win32 : posix;
pathIsAbsolute.exports.posix = posix;
pathIsAbsolute.exports.win32 = win32;
var pathIsAbsoluteExports = pathIsAbsolute.exports;
var common = {};
common.setopts = setopts;
common.ownProp = ownProp;
common.makeAbs = makeAbs;
common.finish = finish;
common.mark = mark;
common.isIgnored = isIgnored;
common.childrenIgnored = childrenIgnored;
function ownProp(obj, field) {
  return Object.prototype.hasOwnProperty.call(obj, field);
}
var fs = fs$3;
var path = path$2;
var minimatch = minimatch_1;
var isAbsolute = pathIsAbsoluteExports;
var Minimatch = minimatch.Minimatch;
function alphasort(a, b) {
  return a.localeCompare(b, "en");
}
function setupIgnores(self, options) {
  self.ignore = options.ignore || [];
  if (!Array.isArray(self.ignore))
    self.ignore = [self.ignore];
  if (self.ignore.length) {
    self.ignore = self.ignore.map(ignoreMap);
  }
}
function ignoreMap(pattern) {
  var gmatcher = null;
  if (pattern.slice(-3) === "/**") {
    var gpattern = pattern.replace(/(\/\*\*)+$/, "");
    gmatcher = new Minimatch(gpattern, { dot: true });
  }
  return {
    matcher: new Minimatch(pattern, { dot: true }),
    gmatcher
  };
}
function setopts(self, pattern, options) {
  if (!options)
    options = {};
  if (options.matchBase && -1 === pattern.indexOf("/")) {
    if (options.noglobstar) {
      throw new Error("base matching requires globstar");
    }
    pattern = "**/" + pattern;
  }
  self.silent = !!options.silent;
  self.pattern = pattern;
  self.strict = options.strict !== false;
  self.realpath = !!options.realpath;
  self.realpathCache = options.realpathCache || /* @__PURE__ */ Object.create(null);
  self.follow = !!options.follow;
  self.dot = !!options.dot;
  self.mark = !!options.mark;
  self.nodir = !!options.nodir;
  if (self.nodir)
    self.mark = true;
  self.sync = !!options.sync;
  self.nounique = !!options.nounique;
  self.nonull = !!options.nonull;
  self.nosort = !!options.nosort;
  self.nocase = !!options.nocase;
  self.stat = !!options.stat;
  self.noprocess = !!options.noprocess;
  self.absolute = !!options.absolute;
  self.fs = options.fs || fs;
  self.maxLength = options.maxLength || Infinity;
  self.cache = options.cache || /* @__PURE__ */ Object.create(null);
  self.statCache = options.statCache || /* @__PURE__ */ Object.create(null);
  self.symlinks = options.symlinks || /* @__PURE__ */ Object.create(null);
  setupIgnores(self, options);
  self.changedCwd = false;
  var cwd = process.cwd();
  if (!ownProp(options, "cwd"))
    self.cwd = cwd;
  else {
    self.cwd = path.resolve(options.cwd);
    self.changedCwd = self.cwd !== cwd;
  }
  self.root = options.root || path.resolve(self.cwd, "/");
  self.root = path.resolve(self.root);
  if (process.platform === "win32")
    self.root = self.root.replace(/\\/g, "/");
  self.cwdAbs = isAbsolute(self.cwd) ? self.cwd : makeAbs(self, self.cwd);
  if (process.platform === "win32")
    self.cwdAbs = self.cwdAbs.replace(/\\/g, "/");
  self.nomount = !!options.nomount;
  options.nonegate = true;
  options.nocomment = true;
  options.allowWindowsEscape = false;
  self.minimatch = new Minimatch(pattern, options);
  self.options = self.minimatch.options;
}
function finish(self) {
  var nou = self.nounique;
  var all = nou ? [] : /* @__PURE__ */ Object.create(null);
  for (var i = 0, l = self.matches.length; i < l; i++) {
    var matches = self.matches[i];
    if (!matches || Object.keys(matches).length === 0) {
      if (self.nonull) {
        var literal = self.minimatch.globSet[i];
        if (nou)
          all.push(literal);
        else
          all[literal] = true;
      }
    } else {
      var m = Object.keys(matches);
      if (nou)
        all.push.apply(all, m);
      else
        m.forEach(function(m2) {
          all[m2] = true;
        });
    }
  }
  if (!nou)
    all = Object.keys(all);
  if (!self.nosort)
    all = all.sort(alphasort);
  if (self.mark) {
    for (var i = 0; i < all.length; i++) {
      all[i] = self._mark(all[i]);
    }
    if (self.nodir) {
      all = all.filter(function(e) {
        var notDir = !/\/$/.test(e);
        var c = self.cache[e] || self.cache[makeAbs(self, e)];
        if (notDir && c)
          notDir = c !== "DIR" && !Array.isArray(c);
        return notDir;
      });
    }
  }
  if (self.ignore.length)
    all = all.filter(function(m2) {
      return !isIgnored(self, m2);
    });
  self.found = all;
}
function mark(self, p) {
  var abs = makeAbs(self, p);
  var c = self.cache[abs];
  var m = p;
  if (c) {
    var isDir = c === "DIR" || Array.isArray(c);
    var slash = p.slice(-1) === "/";
    if (isDir && !slash)
      m += "/";
    else if (!isDir && slash)
      m = m.slice(0, -1);
    if (m !== p) {
      var mabs = makeAbs(self, m);
      self.statCache[mabs] = self.statCache[abs];
      self.cache[mabs] = self.cache[abs];
    }
  }
  return m;
}
function makeAbs(self, f) {
  var abs = f;
  if (f.charAt(0) === "/") {
    abs = path.join(self.root, f);
  } else if (isAbsolute(f) || f === "") {
    abs = f;
  } else if (self.changedCwd) {
    abs = path.resolve(self.cwd, f);
  } else {
    abs = path.resolve(f);
  }
  if (process.platform === "win32")
    abs = abs.replace(/\\/g, "/");
  return abs;
}
function isIgnored(self, path2) {
  if (!self.ignore.length)
    return false;
  return self.ignore.some(function(item) {
    return item.matcher.match(path2) || !!(item.gmatcher && item.gmatcher.match(path2));
  });
}
function childrenIgnored(self, path2) {
  if (!self.ignore.length)
    return false;
  return self.ignore.some(function(item) {
    return !!(item.gmatcher && item.gmatcher.match(path2));
  });
}
var sync;
var hasRequiredSync;
function requireSync() {
  if (hasRequiredSync) return sync;
  hasRequiredSync = 1;
  sync = globSync;
  globSync.GlobSync = GlobSync;
  var rp = fs_realpath;
  var minimatch2 = minimatch_1;
  minimatch2.Minimatch;
  requireGlob().Glob;
  var path2 = path$2;
  var assert = require$$5;
  var isAbsolute2 = pathIsAbsoluteExports;
  var common$1 = common;
  var setopts2 = common$1.setopts;
  var ownProp2 = common$1.ownProp;
  var childrenIgnored2 = common$1.childrenIgnored;
  var isIgnored2 = common$1.isIgnored;
  function globSync(pattern, options) {
    if (typeof options === "function" || arguments.length === 3)
      throw new TypeError("callback provided to sync glob\nSee: https://github.com/isaacs/node-glob/issues/167");
    return new GlobSync(pattern, options).found;
  }
  function GlobSync(pattern, options) {
    if (!pattern)
      throw new Error("must provide pattern");
    if (typeof options === "function" || arguments.length === 3)
      throw new TypeError("callback provided to sync glob\nSee: https://github.com/isaacs/node-glob/issues/167");
    if (!(this instanceof GlobSync))
      return new GlobSync(pattern, options);
    setopts2(this, pattern, options);
    if (this.noprocess)
      return this;
    var n = this.minimatch.set.length;
    this.matches = new Array(n);
    for (var i = 0; i < n; i++) {
      this._process(this.minimatch.set[i], i, false);
    }
    this._finish();
  }
  GlobSync.prototype._finish = function() {
    assert.ok(this instanceof GlobSync);
    if (this.realpath) {
      var self = this;
      this.matches.forEach(function(matchset, index) {
        var set = self.matches[index] = /* @__PURE__ */ Object.create(null);
        for (var p in matchset) {
          try {
            p = self._makeAbs(p);
            var real = rp.realpathSync(p, self.realpathCache);
            set[real] = true;
          } catch (er) {
            if (er.syscall === "stat")
              set[self._makeAbs(p)] = true;
            else
              throw er;
          }
        }
      });
    }
    common$1.finish(this);
  };
  GlobSync.prototype._process = function(pattern, index, inGlobStar) {
    assert.ok(this instanceof GlobSync);
    var n = 0;
    while (typeof pattern[n] === "string") {
      n++;
    }
    var prefix;
    switch (n) {
      case pattern.length:
        this._processSimple(pattern.join("/"), index);
        return;
      case 0:
        prefix = null;
        break;
      default:
        prefix = pattern.slice(0, n).join("/");
        break;
    }
    var remain = pattern.slice(n);
    var read;
    if (prefix === null)
      read = ".";
    else if (isAbsolute2(prefix) || isAbsolute2(pattern.map(function(p) {
      return typeof p === "string" ? p : "[*]";
    }).join("/"))) {
      if (!prefix || !isAbsolute2(prefix))
        prefix = "/" + prefix;
      read = prefix;
    } else
      read = prefix;
    var abs = this._makeAbs(read);
    if (childrenIgnored2(this, read))
      return;
    var isGlobStar = remain[0] === minimatch2.GLOBSTAR;
    if (isGlobStar)
      this._processGlobStar(prefix, read, abs, remain, index, inGlobStar);
    else
      this._processReaddir(prefix, read, abs, remain, index, inGlobStar);
  };
  GlobSync.prototype._processReaddir = function(prefix, read, abs, remain, index, inGlobStar) {
    var entries = this._readdir(abs, inGlobStar);
    if (!entries)
      return;
    var pn = remain[0];
    var negate = !!this.minimatch.negate;
    var rawGlob = pn._glob;
    var dotOk = this.dot || rawGlob.charAt(0) === ".";
    var matchedEntries = [];
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i];
      if (e.charAt(0) !== "." || dotOk) {
        var m;
        if (negate && !prefix) {
          m = !e.match(pn);
        } else {
          m = e.match(pn);
        }
        if (m)
          matchedEntries.push(e);
      }
    }
    var len = matchedEntries.length;
    if (len === 0)
      return;
    if (remain.length === 1 && !this.mark && !this.stat) {
      if (!this.matches[index])
        this.matches[index] = /* @__PURE__ */ Object.create(null);
      for (var i = 0; i < len; i++) {
        var e = matchedEntries[i];
        if (prefix) {
          if (prefix.slice(-1) !== "/")
            e = prefix + "/" + e;
          else
            e = prefix + e;
        }
        if (e.charAt(0) === "/" && !this.nomount) {
          e = path2.join(this.root, e);
        }
        this._emitMatch(index, e);
      }
      return;
    }
    remain.shift();
    for (var i = 0; i < len; i++) {
      var e = matchedEntries[i];
      var newPattern;
      if (prefix)
        newPattern = [prefix, e];
      else
        newPattern = [e];
      this._process(newPattern.concat(remain), index, inGlobStar);
    }
  };
  GlobSync.prototype._emitMatch = function(index, e) {
    if (isIgnored2(this, e))
      return;
    var abs = this._makeAbs(e);
    if (this.mark)
      e = this._mark(e);
    if (this.absolute) {
      e = abs;
    }
    if (this.matches[index][e])
      return;
    if (this.nodir) {
      var c = this.cache[abs];
      if (c === "DIR" || Array.isArray(c))
        return;
    }
    this.matches[index][e] = true;
    if (this.stat)
      this._stat(e);
  };
  GlobSync.prototype._readdirInGlobStar = function(abs) {
    if (this.follow)
      return this._readdir(abs, false);
    var entries;
    var lstat;
    try {
      lstat = this.fs.lstatSync(abs);
    } catch (er) {
      if (er.code === "ENOENT") {
        return null;
      }
    }
    var isSym = lstat && lstat.isSymbolicLink();
    this.symlinks[abs] = isSym;
    if (!isSym && lstat && !lstat.isDirectory())
      this.cache[abs] = "FILE";
    else
      entries = this._readdir(abs, false);
    return entries;
  };
  GlobSync.prototype._readdir = function(abs, inGlobStar) {
    if (inGlobStar && !ownProp2(this.symlinks, abs))
      return this._readdirInGlobStar(abs);
    if (ownProp2(this.cache, abs)) {
      var c = this.cache[abs];
      if (!c || c === "FILE")
        return null;
      if (Array.isArray(c))
        return c;
    }
    try {
      return this._readdirEntries(abs, this.fs.readdirSync(abs));
    } catch (er) {
      this._readdirError(abs, er);
      return null;
    }
  };
  GlobSync.prototype._readdirEntries = function(abs, entries) {
    if (!this.mark && !this.stat) {
      for (var i = 0; i < entries.length; i++) {
        var e = entries[i];
        if (abs === "/")
          e = abs + e;
        else
          e = abs + "/" + e;
        this.cache[e] = true;
      }
    }
    this.cache[abs] = entries;
    return entries;
  };
  GlobSync.prototype._readdirError = function(f, er) {
    switch (er.code) {
      case "ENOTSUP":
      case "ENOTDIR":
        var abs = this._makeAbs(f);
        this.cache[abs] = "FILE";
        if (abs === this.cwdAbs) {
          var error = new Error(er.code + " invalid cwd " + this.cwd);
          error.path = this.cwd;
          error.code = er.code;
          throw error;
        }
        break;
      case "ENOENT":
      case "ELOOP":
      case "ENAMETOOLONG":
      case "UNKNOWN":
        this.cache[this._makeAbs(f)] = false;
        break;
      default:
        this.cache[this._makeAbs(f)] = false;
        if (this.strict)
          throw er;
        if (!this.silent)
          console.error("glob error", er);
        break;
    }
  };
  GlobSync.prototype._processGlobStar = function(prefix, read, abs, remain, index, inGlobStar) {
    var entries = this._readdir(abs, inGlobStar);
    if (!entries)
      return;
    var remainWithoutGlobStar = remain.slice(1);
    var gspref = prefix ? [prefix] : [];
    var noGlobStar = gspref.concat(remainWithoutGlobStar);
    this._process(noGlobStar, index, false);
    var len = entries.length;
    var isSym = this.symlinks[abs];
    if (isSym && inGlobStar)
      return;
    for (var i = 0; i < len; i++) {
      var e = entries[i];
      if (e.charAt(0) === "." && !this.dot)
        continue;
      var instead = gspref.concat(entries[i], remainWithoutGlobStar);
      this._process(instead, index, true);
      var below = gspref.concat(entries[i], remain);
      this._process(below, index, true);
    }
  };
  GlobSync.prototype._processSimple = function(prefix, index) {
    var exists = this._stat(prefix);
    if (!this.matches[index])
      this.matches[index] = /* @__PURE__ */ Object.create(null);
    if (!exists)
      return;
    if (prefix && isAbsolute2(prefix) && !this.nomount) {
      var trail = /[\/\\]$/.test(prefix);
      if (prefix.charAt(0) === "/") {
        prefix = path2.join(this.root, prefix);
      } else {
        prefix = path2.resolve(this.root, prefix);
        if (trail)
          prefix += "/";
      }
    }
    if (process.platform === "win32")
      prefix = prefix.replace(/\\/g, "/");
    this._emitMatch(index, prefix);
  };
  GlobSync.prototype._stat = function(f) {
    var abs = this._makeAbs(f);
    var needDir = f.slice(-1) === "/";
    if (f.length > this.maxLength)
      return false;
    if (!this.stat && ownProp2(this.cache, abs)) {
      var c = this.cache[abs];
      if (Array.isArray(c))
        c = "DIR";
      if (!needDir || c === "DIR")
        return c;
      if (needDir && c === "FILE")
        return false;
    }
    var stat = this.statCache[abs];
    if (!stat) {
      var lstat;
      try {
        lstat = this.fs.lstatSync(abs);
      } catch (er) {
        if (er && (er.code === "ENOENT" || er.code === "ENOTDIR")) {
          this.statCache[abs] = false;
          return false;
        }
      }
      if (lstat && lstat.isSymbolicLink()) {
        try {
          stat = this.fs.statSync(abs);
        } catch (er) {
          stat = lstat;
        }
      } else {
        stat = lstat;
      }
    }
    this.statCache[abs] = stat;
    var c = true;
    if (stat)
      c = stat.isDirectory() ? "DIR" : "FILE";
    this.cache[abs] = this.cache[abs] || c;
    if (needDir && c === "FILE")
      return false;
    return c;
  };
  GlobSync.prototype._mark = function(p) {
    return common$1.mark(this, p);
  };
  GlobSync.prototype._makeAbs = function(f) {
    return common$1.makeAbs(this, f);
  };
  return sync;
}
var wrappy_1 = wrappy$2;
function wrappy$2(fn, cb) {
  if (fn && cb) return wrappy$2(fn)(cb);
  if (typeof fn !== "function")
    throw new TypeError("need wrapper function");
  Object.keys(fn).forEach(function(k) {
    wrapper[k] = fn[k];
  });
  return wrapper;
  function wrapper() {
    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i];
    }
    var ret = fn.apply(this, args);
    var cb2 = args[args.length - 1];
    if (typeof ret === "function" && ret !== cb2) {
      Object.keys(cb2).forEach(function(k) {
        ret[k] = cb2[k];
      });
    }
    return ret;
  }
}
var once$2 = { exports: {} };
var wrappy$1 = wrappy_1;
once$2.exports = wrappy$1(once$1);
once$2.exports.strict = wrappy$1(onceStrict);
once$1.proto = once$1(function() {
  Object.defineProperty(Function.prototype, "once", {
    value: function() {
      return once$1(this);
    },
    configurable: true
  });
  Object.defineProperty(Function.prototype, "onceStrict", {
    value: function() {
      return onceStrict(this);
    },
    configurable: true
  });
});
function once$1(fn) {
  var f = function() {
    if (f.called) return f.value;
    f.called = true;
    return f.value = fn.apply(this, arguments);
  };
  f.called = false;
  return f;
}
function onceStrict(fn) {
  var f = function() {
    if (f.called)
      throw new Error(f.onceError);
    f.called = true;
    return f.value = fn.apply(this, arguments);
  };
  var name = fn.name || "Function wrapped with `once`";
  f.onceError = name + " shouldn't be called more than once";
  f.called = false;
  return f;
}
var onceExports = once$2.exports;
var wrappy = wrappy_1;
var reqs = /* @__PURE__ */ Object.create(null);
var once = onceExports;
var inflight_1 = wrappy(inflight);
function inflight(key, cb) {
  if (reqs[key]) {
    reqs[key].push(cb);
    return null;
  } else {
    reqs[key] = [cb];
    return makeres(key);
  }
}
function makeres(key) {
  return once(function RES() {
    var cbs = reqs[key];
    var len = cbs.length;
    var args = slice(arguments);
    try {
      for (var i = 0; i < len; i++) {
        cbs[i].apply(null, args);
      }
    } finally {
      if (cbs.length > len) {
        cbs.splice(0, len);
        process.nextTick(function() {
          RES.apply(null, args);
        });
      } else {
        delete reqs[key];
      }
    }
  });
}
function slice(args) {
  var length = args.length;
  var array = [];
  for (var i = 0; i < length; i++) array[i] = args[i];
  return array;
}
var glob_1;
var hasRequiredGlob;
function requireGlob() {
  if (hasRequiredGlob) return glob_1;
  hasRequiredGlob = 1;
  glob_1 = glob2;
  var rp = fs_realpath;
  var minimatch2 = minimatch_1;
  minimatch2.Minimatch;
  var inherits2 = inheritsExports;
  var EE = require$$3.EventEmitter;
  var path2 = path$2;
  var assert = require$$5;
  var isAbsolute2 = pathIsAbsoluteExports;
  var globSync = requireSync();
  var common$1 = common;
  var setopts2 = common$1.setopts;
  var ownProp2 = common$1.ownProp;
  var inflight2 = inflight_1;
  var childrenIgnored2 = common$1.childrenIgnored;
  var isIgnored2 = common$1.isIgnored;
  var once2 = onceExports;
  function glob2(pattern, options, cb) {
    if (typeof options === "function") cb = options, options = {};
    if (!options) options = {};
    if (options.sync) {
      if (cb)
        throw new TypeError("callback provided to sync glob");
      return globSync(pattern, options);
    }
    return new Glob(pattern, options, cb);
  }
  glob2.sync = globSync;
  var GlobSync = glob2.GlobSync = globSync.GlobSync;
  glob2.glob = glob2;
  function extend(origin, add) {
    if (add === null || typeof add !== "object") {
      return origin;
    }
    var keys = Object.keys(add);
    var i = keys.length;
    while (i--) {
      origin[keys[i]] = add[keys[i]];
    }
    return origin;
  }
  glob2.hasMagic = function(pattern, options_) {
    var options = extend({}, options_);
    options.noprocess = true;
    var g = new Glob(pattern, options);
    var set = g.minimatch.set;
    if (!pattern)
      return false;
    if (set.length > 1)
      return true;
    for (var j = 0; j < set[0].length; j++) {
      if (typeof set[0][j] !== "string")
        return true;
    }
    return false;
  };
  glob2.Glob = Glob;
  inherits2(Glob, EE);
  function Glob(pattern, options, cb) {
    if (typeof options === "function") {
      cb = options;
      options = null;
    }
    if (options && options.sync) {
      if (cb)
        throw new TypeError("callback provided to sync glob");
      return new GlobSync(pattern, options);
    }
    if (!(this instanceof Glob))
      return new Glob(pattern, options, cb);
    setopts2(this, pattern, options);
    this._didRealPath = false;
    var n = this.minimatch.set.length;
    this.matches = new Array(n);
    if (typeof cb === "function") {
      cb = once2(cb);
      this.on("error", cb);
      this.on("end", function(matches) {
        cb(null, matches);
      });
    }
    var self = this;
    this._processing = 0;
    this._emitQueue = [];
    this._processQueue = [];
    this.paused = false;
    if (this.noprocess)
      return this;
    if (n === 0)
      return done();
    var sync2 = true;
    for (var i = 0; i < n; i++) {
      this._process(this.minimatch.set[i], i, false, done);
    }
    sync2 = false;
    function done() {
      --self._processing;
      if (self._processing <= 0) {
        if (sync2) {
          process.nextTick(function() {
            self._finish();
          });
        } else {
          self._finish();
        }
      }
    }
  }
  Glob.prototype._finish = function() {
    assert(this instanceof Glob);
    if (this.aborted)
      return;
    if (this.realpath && !this._didRealpath)
      return this._realpath();
    common$1.finish(this);
    this.emit("end", this.found);
  };
  Glob.prototype._realpath = function() {
    if (this._didRealpath)
      return;
    this._didRealpath = true;
    var n = this.matches.length;
    if (n === 0)
      return this._finish();
    var self = this;
    for (var i = 0; i < this.matches.length; i++)
      this._realpathSet(i, next);
    function next() {
      if (--n === 0)
        self._finish();
    }
  };
  Glob.prototype._realpathSet = function(index, cb) {
    var matchset = this.matches[index];
    if (!matchset)
      return cb();
    var found = Object.keys(matchset);
    var self = this;
    var n = found.length;
    if (n === 0)
      return cb();
    var set = this.matches[index] = /* @__PURE__ */ Object.create(null);
    found.forEach(function(p, i) {
      p = self._makeAbs(p);
      rp.realpath(p, self.realpathCache, function(er, real) {
        if (!er)
          set[real] = true;
        else if (er.syscall === "stat")
          set[p] = true;
        else
          self.emit("error", er);
        if (--n === 0) {
          self.matches[index] = set;
          cb();
        }
      });
    });
  };
  Glob.prototype._mark = function(p) {
    return common$1.mark(this, p);
  };
  Glob.prototype._makeAbs = function(f) {
    return common$1.makeAbs(this, f);
  };
  Glob.prototype.abort = function() {
    this.aborted = true;
    this.emit("abort");
  };
  Glob.prototype.pause = function() {
    if (!this.paused) {
      this.paused = true;
      this.emit("pause");
    }
  };
  Glob.prototype.resume = function() {
    if (this.paused) {
      this.emit("resume");
      this.paused = false;
      if (this._emitQueue.length) {
        var eq = this._emitQueue.slice(0);
        this._emitQueue.length = 0;
        for (var i = 0; i < eq.length; i++) {
          var e = eq[i];
          this._emitMatch(e[0], e[1]);
        }
      }
      if (this._processQueue.length) {
        var pq = this._processQueue.slice(0);
        this._processQueue.length = 0;
        for (var i = 0; i < pq.length; i++) {
          var p = pq[i];
          this._processing--;
          this._process(p[0], p[1], p[2], p[3]);
        }
      }
    }
  };
  Glob.prototype._process = function(pattern, index, inGlobStar, cb) {
    assert(this instanceof Glob);
    assert(typeof cb === "function");
    if (this.aborted)
      return;
    this._processing++;
    if (this.paused) {
      this._processQueue.push([pattern, index, inGlobStar, cb]);
      return;
    }
    var n = 0;
    while (typeof pattern[n] === "string") {
      n++;
    }
    var prefix;
    switch (n) {
      case pattern.length:
        this._processSimple(pattern.join("/"), index, cb);
        return;
      case 0:
        prefix = null;
        break;
      default:
        prefix = pattern.slice(0, n).join("/");
        break;
    }
    var remain = pattern.slice(n);
    var read;
    if (prefix === null)
      read = ".";
    else if (isAbsolute2(prefix) || isAbsolute2(pattern.map(function(p) {
      return typeof p === "string" ? p : "[*]";
    }).join("/"))) {
      if (!prefix || !isAbsolute2(prefix))
        prefix = "/" + prefix;
      read = prefix;
    } else
      read = prefix;
    var abs = this._makeAbs(read);
    if (childrenIgnored2(this, read))
      return cb();
    var isGlobStar = remain[0] === minimatch2.GLOBSTAR;
    if (isGlobStar)
      this._processGlobStar(prefix, read, abs, remain, index, inGlobStar, cb);
    else
      this._processReaddir(prefix, read, abs, remain, index, inGlobStar, cb);
  };
  Glob.prototype._processReaddir = function(prefix, read, abs, remain, index, inGlobStar, cb) {
    var self = this;
    this._readdir(abs, inGlobStar, function(er, entries) {
      return self._processReaddir2(prefix, read, abs, remain, index, inGlobStar, entries, cb);
    });
  };
  Glob.prototype._processReaddir2 = function(prefix, read, abs, remain, index, inGlobStar, entries, cb) {
    if (!entries)
      return cb();
    var pn = remain[0];
    var negate = !!this.minimatch.negate;
    var rawGlob = pn._glob;
    var dotOk = this.dot || rawGlob.charAt(0) === ".";
    var matchedEntries = [];
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i];
      if (e.charAt(0) !== "." || dotOk) {
        var m;
        if (negate && !prefix) {
          m = !e.match(pn);
        } else {
          m = e.match(pn);
        }
        if (m)
          matchedEntries.push(e);
      }
    }
    var len = matchedEntries.length;
    if (len === 0)
      return cb();
    if (remain.length === 1 && !this.mark && !this.stat) {
      if (!this.matches[index])
        this.matches[index] = /* @__PURE__ */ Object.create(null);
      for (var i = 0; i < len; i++) {
        var e = matchedEntries[i];
        if (prefix) {
          if (prefix !== "/")
            e = prefix + "/" + e;
          else
            e = prefix + e;
        }
        if (e.charAt(0) === "/" && !this.nomount) {
          e = path2.join(this.root, e);
        }
        this._emitMatch(index, e);
      }
      return cb();
    }
    remain.shift();
    for (var i = 0; i < len; i++) {
      var e = matchedEntries[i];
      if (prefix) {
        if (prefix !== "/")
          e = prefix + "/" + e;
        else
          e = prefix + e;
      }
      this._process([e].concat(remain), index, inGlobStar, cb);
    }
    cb();
  };
  Glob.prototype._emitMatch = function(index, e) {
    if (this.aborted)
      return;
    if (isIgnored2(this, e))
      return;
    if (this.paused) {
      this._emitQueue.push([index, e]);
      return;
    }
    var abs = isAbsolute2(e) ? e : this._makeAbs(e);
    if (this.mark)
      e = this._mark(e);
    if (this.absolute)
      e = abs;
    if (this.matches[index][e])
      return;
    if (this.nodir) {
      var c = this.cache[abs];
      if (c === "DIR" || Array.isArray(c))
        return;
    }
    this.matches[index][e] = true;
    var st = this.statCache[abs];
    if (st)
      this.emit("stat", e, st);
    this.emit("match", e);
  };
  Glob.prototype._readdirInGlobStar = function(abs, cb) {
    if (this.aborted)
      return;
    if (this.follow)
      return this._readdir(abs, false, cb);
    var lstatkey = "lstat\0" + abs;
    var self = this;
    var lstatcb = inflight2(lstatkey, lstatcb_);
    if (lstatcb)
      self.fs.lstat(abs, lstatcb);
    function lstatcb_(er, lstat) {
      if (er && er.code === "ENOENT")
        return cb();
      var isSym = lstat && lstat.isSymbolicLink();
      self.symlinks[abs] = isSym;
      if (!isSym && lstat && !lstat.isDirectory()) {
        self.cache[abs] = "FILE";
        cb();
      } else
        self._readdir(abs, false, cb);
    }
  };
  Glob.prototype._readdir = function(abs, inGlobStar, cb) {
    if (this.aborted)
      return;
    cb = inflight2("readdir\0" + abs + "\0" + inGlobStar, cb);
    if (!cb)
      return;
    if (inGlobStar && !ownProp2(this.symlinks, abs))
      return this._readdirInGlobStar(abs, cb);
    if (ownProp2(this.cache, abs)) {
      var c = this.cache[abs];
      if (!c || c === "FILE")
        return cb();
      if (Array.isArray(c))
        return cb(null, c);
    }
    var self = this;
    self.fs.readdir(abs, readdirCb(this, abs, cb));
  };
  function readdirCb(self, abs, cb) {
    return function(er, entries) {
      if (er)
        self._readdirError(abs, er, cb);
      else
        self._readdirEntries(abs, entries, cb);
    };
  }
  Glob.prototype._readdirEntries = function(abs, entries, cb) {
    if (this.aborted)
      return;
    if (!this.mark && !this.stat) {
      for (var i = 0; i < entries.length; i++) {
        var e = entries[i];
        if (abs === "/")
          e = abs + e;
        else
          e = abs + "/" + e;
        this.cache[e] = true;
      }
    }
    this.cache[abs] = entries;
    return cb(null, entries);
  };
  Glob.prototype._readdirError = function(f, er, cb) {
    if (this.aborted)
      return;
    switch (er.code) {
      case "ENOTSUP":
      case "ENOTDIR":
        var abs = this._makeAbs(f);
        this.cache[abs] = "FILE";
        if (abs === this.cwdAbs) {
          var error = new Error(er.code + " invalid cwd " + this.cwd);
          error.path = this.cwd;
          error.code = er.code;
          this.emit("error", error);
          this.abort();
        }
        break;
      case "ENOENT":
      case "ELOOP":
      case "ENAMETOOLONG":
      case "UNKNOWN":
        this.cache[this._makeAbs(f)] = false;
        break;
      default:
        this.cache[this._makeAbs(f)] = false;
        if (this.strict) {
          this.emit("error", er);
          this.abort();
        }
        if (!this.silent)
          console.error("glob error", er);
        break;
    }
    return cb();
  };
  Glob.prototype._processGlobStar = function(prefix, read, abs, remain, index, inGlobStar, cb) {
    var self = this;
    this._readdir(abs, inGlobStar, function(er, entries) {
      self._processGlobStar2(prefix, read, abs, remain, index, inGlobStar, entries, cb);
    });
  };
  Glob.prototype._processGlobStar2 = function(prefix, read, abs, remain, index, inGlobStar, entries, cb) {
    if (!entries)
      return cb();
    var remainWithoutGlobStar = remain.slice(1);
    var gspref = prefix ? [prefix] : [];
    var noGlobStar = gspref.concat(remainWithoutGlobStar);
    this._process(noGlobStar, index, false, cb);
    var isSym = this.symlinks[abs];
    var len = entries.length;
    if (isSym && inGlobStar)
      return cb();
    for (var i = 0; i < len; i++) {
      var e = entries[i];
      if (e.charAt(0) === "." && !this.dot)
        continue;
      var instead = gspref.concat(entries[i], remainWithoutGlobStar);
      this._process(instead, index, true, cb);
      var below = gspref.concat(entries[i], remain);
      this._process(below, index, true, cb);
    }
    cb();
  };
  Glob.prototype._processSimple = function(prefix, index, cb) {
    var self = this;
    this._stat(prefix, function(er, exists) {
      self._processSimple2(prefix, index, er, exists, cb);
    });
  };
  Glob.prototype._processSimple2 = function(prefix, index, er, exists, cb) {
    if (!this.matches[index])
      this.matches[index] = /* @__PURE__ */ Object.create(null);
    if (!exists)
      return cb();
    if (prefix && isAbsolute2(prefix) && !this.nomount) {
      var trail = /[\/\\]$/.test(prefix);
      if (prefix.charAt(0) === "/") {
        prefix = path2.join(this.root, prefix);
      } else {
        prefix = path2.resolve(this.root, prefix);
        if (trail)
          prefix += "/";
      }
    }
    if (process.platform === "win32")
      prefix = prefix.replace(/\\/g, "/");
    this._emitMatch(index, prefix);
    cb();
  };
  Glob.prototype._stat = function(f, cb) {
    var abs = this._makeAbs(f);
    var needDir = f.slice(-1) === "/";
    if (f.length > this.maxLength)
      return cb();
    if (!this.stat && ownProp2(this.cache, abs)) {
      var c = this.cache[abs];
      if (Array.isArray(c))
        c = "DIR";
      if (!needDir || c === "DIR")
        return cb(null, c);
      if (needDir && c === "FILE")
        return cb();
    }
    var stat = this.statCache[abs];
    if (stat !== void 0) {
      if (stat === false)
        return cb(null, stat);
      else {
        var type = stat.isDirectory() ? "DIR" : "FILE";
        if (needDir && type === "FILE")
          return cb();
        else
          return cb(null, type, stat);
      }
    }
    var self = this;
    var statcb = inflight2("stat\0" + abs, lstatcb_);
    if (statcb)
      self.fs.lstat(abs, statcb);
    function lstatcb_(er, lstat) {
      if (lstat && lstat.isSymbolicLink()) {
        return self.fs.stat(abs, function(er2, stat2) {
          if (er2)
            self._stat2(f, abs, null, lstat, cb);
          else
            self._stat2(f, abs, er2, stat2, cb);
        });
      } else {
        self._stat2(f, abs, er, lstat, cb);
      }
    }
  };
  Glob.prototype._stat2 = function(f, abs, er, stat, cb) {
    if (er && (er.code === "ENOENT" || er.code === "ENOTDIR")) {
      this.statCache[abs] = false;
      return cb();
    }
    var needDir = f.slice(-1) === "/";
    this.statCache[abs] = stat;
    if (abs.slice(-1) === "/" && stat && !stat.isDirectory())
      return cb(null, false, stat);
    var c = true;
    if (stat)
      c = stat.isDirectory() ? "DIR" : "FILE";
    this.cache[abs] = this.cache[abs] || c;
    if (needDir && c === "FILE")
      return cb();
    return cb(null, c, stat);
  };
  return glob_1;
}
var globExports = requireGlob();
const glob = /* @__PURE__ */ getDefaultExportFromCjs(globExports);
class MenuBuilder {
  mainWindow;
  constructor(mainWindow2) {
    this.mainWindow = mainWindow2;
  }
  buildMenu() {
    if (process.env.NODE_ENV === "development" || process.env.DEBUG_PROD === "true") {
      this.setupDevelopmentEnvironment();
    }
    const template = process.platform === "darwin" ? this.buildDarwinTemplate() : this.buildDefaultTemplate();
    const menu = electron.Menu.buildFromTemplate(template);
    electron.Menu.setApplicationMenu(menu);
    return menu;
  }
  setupDevelopmentEnvironment() {
    this.mainWindow.webContents.on("context-menu", (_, props) => {
      const { x, y } = props;
      electron.Menu.buildFromTemplate([
        {
          label: "Inspect element",
          click: () => {
            this.mainWindow.webContents.inspectElement(x, y);
          }
        }
      ]).popup({ window: this.mainWindow });
    });
  }
  buildDarwinTemplate() {
    const subMenuAbout = {
      label: "Electron",
      submenu: [
        {
          label: "About ElectronReact",
          selector: "orderFrontStandardAboutPanel:"
        },
        { type: "separator" },
        { label: "Services", submenu: [] },
        { type: "separator" },
        {
          label: "Hide ElectronReact",
          accelerator: "Command+H",
          selector: "hide:"
        },
        {
          label: "Hide Others",
          accelerator: "Command+Shift+H",
          selector: "hideOtherApplications:"
        },
        { label: "Show All", selector: "unhideAllApplications:" },
        { type: "separator" },
        {
          label: "Quit",
          accelerator: "Command+Q",
          click: () => {
            electron.app.quit();
          }
        }
      ]
    };
    const subMenuEdit = {
      label: "Edit",
      submenu: [
        { label: "Undo", accelerator: "Command+Z", selector: "undo:" },
        { label: "Redo", accelerator: "Shift+Command+Z", selector: "redo:" },
        { type: "separator" },
        { label: "Cut", accelerator: "Command+X", selector: "cut:" },
        { label: "Copy", accelerator: "Command+C", selector: "copy:" },
        { label: "Paste", accelerator: "Command+V", selector: "paste:" },
        {
          label: "Select All",
          accelerator: "Command+A",
          selector: "selectAll:"
        }
      ]
    };
    const subMenuViewDev = {
      label: "View",
      submenu: [
        {
          label: "Reload",
          accelerator: "Command+R",
          click: () => {
            this.mainWindow.webContents.reload();
          }
        },
        {
          label: "Toggle Full Screen",
          accelerator: "Ctrl+Command+F",
          click: () => {
            this.mainWindow.setFullScreen(!this.mainWindow.isFullScreen());
          }
        },
        {
          label: "Toggle Developer Tools",
          accelerator: "Alt+Command+I",
          click: () => {
            this.mainWindow.webContents.toggleDevTools();
          }
        }
      ]
    };
    const subMenuViewProd = {
      label: "View",
      submenu: [
        {
          label: "Toggle Full Screen",
          accelerator: "Ctrl+Command+F",
          click: () => {
            this.mainWindow.setFullScreen(!this.mainWindow.isFullScreen());
          }
        }
      ]
    };
    const subMenuWindow = {
      label: "Window",
      submenu: [
        {
          label: "Minimize",
          accelerator: "Command+M",
          selector: "performMiniaturize:"
        },
        { label: "Close", accelerator: "Command+W", selector: "performClose:" },
        { type: "separator" },
        { label: "Bring All to Front", selector: "arrangeInFront:" }
      ]
    };
    const subMenuHelp = {
      label: "Help",
      submenu: [
        {
          label: "Learn More",
          click() {
            electron.shell.openExternal("https://electronjs.org");
          }
        },
        {
          label: "Documentation",
          click() {
            electron.shell.openExternal(
              "https://github.com/electron/electron/tree/main/docs#readme"
            );
          }
        },
        {
          label: "Community Discussions",
          click() {
            electron.shell.openExternal("https://www.electronjs.org/community");
          }
        },
        {
          label: "Search Issues",
          click() {
            electron.shell.openExternal("https://github.com/electron/electron/issues");
          }
        }
      ]
    };
    const subMenuView = process.env.NODE_ENV === "development" || process.env.DEBUG_PROD === "true" ? subMenuViewDev : subMenuViewProd;
    return [subMenuAbout, subMenuEdit, subMenuView, subMenuWindow, subMenuHelp];
  }
  buildDefaultTemplate() {
    const templateDefault = [
      {
        label: "&File",
        submenu: [
          {
            label: "&Open",
            accelerator: "Ctrl+O"
          },
          {
            label: "&Close",
            accelerator: "Ctrl+W",
            click: () => {
              this.mainWindow.close();
            }
          }
        ]
      },
      {
        label: "&View",
        submenu: process.env.NODE_ENV === "development" || process.env.DEBUG_PROD === "true" ? [
          {
            label: "&Reload",
            accelerator: "Ctrl+R",
            click: () => {
              this.mainWindow.webContents.reload();
            }
          },
          {
            label: "Toggle &Full Screen",
            accelerator: "F11",
            click: () => {
              this.mainWindow.setFullScreen(
                !this.mainWindow.isFullScreen()
              );
            }
          },
          {
            label: "Toggle &Developer Tools",
            accelerator: "Alt+Ctrl+I",
            click: () => {
              this.mainWindow.webContents.toggleDevTools();
            }
          }
        ] : [
          {
            label: "Toggle &Full Screen",
            accelerator: "F11",
            click: () => {
              this.mainWindow.setFullScreen(
                !this.mainWindow.isFullScreen()
              );
            }
          }
        ]
      },
      {
        label: "Help",
        submenu: [
          {
            label: "Learn More",
            click() {
              electron.shell.openExternal("https://electronjs.org");
            }
          },
          {
            label: "Documentation",
            click() {
              electron.shell.openExternal(
                "https://github.com/electron/electron/tree/main/docs#readme"
              );
            }
          },
          {
            label: "Community Discussions",
            click() {
              electron.shell.openExternal("https://www.electronjs.org/community");
            }
          },
          {
            label: "Search Issues",
            click() {
              electron.shell.openExternal("https://github.com/electron/electron/issues");
            }
          }
        ]
      }
    ];
    return templateDefault;
  }
}
function resolveHtmlPath(_htmlFileName) {
  if (process.env.NODE_ENV === "development") {
    return process.env["ELECTRON_RENDERER_URL"];
  }
  return `file://${path$2.resolve(__dirname, "../renderer/index.html")}`;
}
async function parseAndSaveSongs(store2, callback) {
  const result = await electron.dialog.showOpenDialog({
    properties: ["openDirectory"],
    title: "Choose your Clone Hero library",
    message: "Choose your Clone Hero library"
  });
  if (result.canceled) {
    return;
  }
  store2.delete("songs");
  globExports.glob(
    `${result.filePaths[0]}/**/{notes.mid,notes.chart}`,
    {},
    (err, files) => {
      const supportedImageExtensions = ["png", "jpg", "jpeg"];
      const dirToFile = /* @__PURE__ */ new Map();
      for (const file of files) {
        const dir = path$2.dirname(file);
        if (!dirToFile.has(dir) || path$2.extname(file) === ".mid") {
          dirToFile.set(dir, file);
        }
      }
      const songList = [...dirToFile.keys()].map((dir) => path$2.join(dir, "song.ini")).filter((file) => fs$3.existsSync(file)).map((file) => ({
        info: ini.parse(fs$3.readFileSync(file, "utf-8")),
        dir: path$2.dirname(file)
      })).map(({ info, dir }) => {
        const albumCoverPath = supportedImageExtensions.map((ext2) => path$2.join(dir, `album.${ext2}`)).find((p) => fs$3.existsSync(p));
        return {
          id: crypto.randomUUID(),
          dir,
          albumCover: albumCoverPath ? `gh:///${albumCoverPath}` : null,
          ...info.song ?? info.Song ?? info
        };
      });
      const songs = songList.reduce((acc, song) => {
        acc[song.id] = song;
        return acc;
      }, {});
      store2.set("songs", songs);
      callback?.(songs);
    }
  );
}
class AppUpdater {
  constructor() {
    log.transports.file.level = "info";
    electronUpdater.autoUpdater.logger = log;
    electronUpdater.autoUpdater.checkForUpdatesAndNotify();
  }
}
let mainWindow = null;
const store = new Store();
let powerSaveBlockerId = -1;
electron.ipcMain.on("load-song", async (event, id) => {
  const songData = store.get("songs")[id];
  glob(
    `${songData.dir}/*(*.mid|*.chart|*.ogg|*.opus)`,
    { ignore: [`${songData.dir}/crowd.ogg`, `${songData.dir}/preview.ogg`] },
    (err, files) => {
      const midiFilePath = files.find((file) => path$2.extname(file) === ".mid");
      const chartFilePath = files.find(
        (file) => path$2.extname(file) === ".chart"
      );
      if (!midiFilePath && !chartFilePath) {
        return;
      }
      const audio = files.filter((file) => [".ogg", ".opus"].includes(path$2.extname(file))).map((file) => ({
        src: `gh://${file}`,
        name: path$2.parse(file).name
      }));
      const format = midiFilePath ? "mid" : "chart";
      const fileData = fs$3.readFileSync(midiFilePath ?? chartFilePath);
      event.reply("load-song", { data: songData, fileData, format, audio });
    }
  );
});
electron.ipcMain.on("load-song-list", async (event) => {
  event.reply(
    "load-song-list",
    Object.values(store.get("songs"))
  );
});
electron.ipcMain.on("rescan-songs", async (event) => {
  await parseAndSaveSongs(store, (songs) => {
    event.reply("rescan-songs", Object.values(songs));
  });
});
const isDebug = process.env.NODE_ENV === "development" || process.env.DEBUG_PROD === "true";
electron.ipcMain.on("check-dev", async (event) => {
  event.reply("check-dev", isDebug);
});
electron.ipcMain.on("like-song", async (event, id, liked) => {
  store.set(`songs.${id}.liked`, liked);
});
electron.ipcMain.on("prevent-sleep", async () => {
  powerSaveBlockerId = electron.powerSaveBlocker.start("prevent-display-sleep");
});
electron.ipcMain.on("resume-sleep", async () => {
  electron.powerSaveBlocker.stop(powerSaveBlockerId);
});
if (process.env.NODE_ENV === "production") {
  const sourceMapSupport = require("source-map-support");
  sourceMapSupport.install();
}
const installExtensions = async () => {
  const installer = require("electron-devtools-installer");
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ["REACT_DEVELOPER_TOOLS"];
  return installer.default(
    extensions.map((name) => installer[name]),
    forceDownload
  ).catch(console.log);
};
const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }
  if (!store.get("songs")) {
    await parseAndSaveSongs(store);
  }
  const RESOURCES_PATH = electron.app.isPackaged ? path$2.join(process.resourcesPath, "assets") : path$2.join(__dirname, "../../assets");
  const getAssetPath = (...paths) => {
    return path$2.join(RESOURCES_PATH, ...paths);
  };
  mainWindow = new electron.BrowserWindow({
    show: false,
    x: 0,
    y: 0,
    width: 1024,
    height: 728,
    icon: getAssetPath("icon.png"),
    webPreferences: {
      preload: path$2.join(__dirname, "../preload/index.js")
    }
  });
  mainWindow.loadURL(resolveHtmlPath());
  mainWindow.on("ready-to-show", () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    electron.shell.openExternal(edata.url);
    return { action: "deny" };
  });
  new AppUpdater();
};
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
electron.protocol.registerSchemesAsPrivileged([
  {
    scheme: "gh",
    privileges: {
      supportFetchAPI: true
    }
  }
]);
electron.app.whenReady().then(() => {
  electron.protocol.registerFileProtocol("gh", (request, callback) => {
    const url = decodeURIComponent(request.url.substr(5));
    callback({ path: url });
  });
  createWindow();
  electron.app.on("activate", () => {
    if (mainWindow === null) {
      createWindow();
    }
  });
}).catch(console.log);
