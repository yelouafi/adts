(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Stream = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
function eachKey(obj, f) {
  for (var key in obj) {
    if (obj.hasOwnProperty(key)) f(key, obj[key]);
  }
}

function adtcase(base, proto, key) {
  return function () {
    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    var inst = new base();
    eachKey(proto.apply(undefined, args), function (key, val) {
      inst[key] = val;
    });
    inst['is' + key] = true;
    return inst;
  };
}

function adt(base, variants) {
  eachKey(variants, function (key, v) {
    if (typeof v === 'function') base[key] = adtcase(base, v, key);else {
      base[key] = v;
      v['is' + key] = true;
    }
  });
}

exports['default'] = adt;
module.exports = exports['default'];

},{}],3:[function(require,module,exports){
"use strict";

var _interopRequireDefault = function (obj) { return obj && obj.__esModule ? obj : { "default": obj }; };

var _Stream = require("../stream");

var _Stream2 = _interopRequireDefault(_Stream);

window.aStream = _Stream2["default"];

},{"../stream":5}],4:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

// getLater : ( () -> a, Number ) -> Promise a
exports.getLater = getLater;

// [Promise () -> a, ...] -> Promise a
exports.raceLP = raceLP;
var es6Promise = require('es6-promise');
es6Promise.polyfill && es6Promise.polyfill();
function getLater(getter, delay) {
  return new Promise(function (resolve) {
    return setTimeout(function () {
      return resolve(getter());
    }, delay);
  });
}

function raceLP(promises) {
  return Promise.race(promises).then(function (lazy) {
    return lazy();
  });
}

},{"es6-promise":1}],5:[function(require,module,exports){
"use strict";

var _interopRequireDefault = function (obj) { return obj && obj.__esModule ? obj : { "default": obj }; };

Object.defineProperty(exports, "__esModule", {
  value: true
});

// ADT definition
exports.Stream = Stream;

var _adt = require("./adt");

var _adt2 = _interopRequireDefault(_adt);

var _getLater$raceLP = require("./promise-utils");

var noop = function noop() {},
    undef = noop;
function Stream() {}

_adt2["default"](Stream, {
  Empty: new Stream(),
  Abort: function Abort(error) {
    return { error: error };
  },
  Future: function Future(promise) {
    return { promise: promise };
  },
  Cons: function Cons(head, tail) {
    return { head: head, tail: tail };
  }
});

// map : (Stream a, a -> b) => Stream b
Stream.prototype.map = function (f) {
  return this.isEmpty || this.isAbort ? this : this.isCons ? Stream.Cons(f(this.head), this.tail.map(f)) :

  // isFuture
  Stream.Future(this.promise.then(function (s) {
    return s.map(f);
  }, Stream.Abort));
};

// anError : Object
// mapError : (Stream a, anError -> Stream a) => Stream a
Stream.prototype.mapError = function (f) {
  return this.isEmpty ? this : this.isAbort ? f(this.error) : this.isCons ? Stream.Cons(this.head, this.tail.mapError(f)) :

  // isFuture
  Stream.Future(this.promise.then(function (s) {
    return s.mapError(f);
  }, Stream.Abort));
};

// async map
// mapP : Stream (Promise a) => Stream a
Stream.prototype.mapP = function () {
  var _this3 = this;

  return this.isEmpty || this.isAbort ? this : this.isCons ? Stream.Future(this.head.then(function (h) {
    return Stream.Cons(h, _this3.tail.mapP());
  }, Stream.Abort)) :

  // isFuture
  Stream.Future(this.promise.then(function (s) {
    return s.mapP();
  }, Stream.Abort));
};

// length : Stream a => Promise Number
Stream.prototype.length = function () {
  return this.isEmpty || this.isAbort ? Promise.resolve(0) : this.isCons ? this.tail.length().then(function (len) {
    return len + 1;
  }) :

  /* isFuture */this.promise.then(function (s) {
    return s.length();
  }, Promise.resolve(0));
};

// first : Stream a => Promise a
Stream.prototype.first = function () {
  return this.isEmpty ? Promise.reject("Stream.first: Empty Stream!") : this.isAbort ? Promise.reject(this.error) : this.isCons ? Promise.resolve(this.head) :

  /* isFuture */this.promise.then(function (s) {
    return s.first();
  }, Promise.reject);
};

// last : Stream a => Promise a
Stream.prototype.last = function () {

  return go(undef, this);

  function go(_x3, _x4) {
    var _again = true;

    _function: while (_again) {
      _again = false;
      var prec = _x3,
          me = _x4;
      if (me.isEmpty) {
        return prec !== undef ? Promise.resolve(prec) : Promise.reject("Stream.last: Empty Stream!");
      } else {

        if (me.isAbort) {
          return Promise.reject(me.error);
        } else {

          if (me.isCons) {
            _x3 = me.head;
            _x4 = me.tail;
            _again = true;
            continue _function;
          } else {
            return (

              /* isFuture */me.promise.then(function (s) {
                return go(prec, s);
              }, Promise.reject)
            );
          }
        }
      }
    }
  }
};

// take : (Stream a, n) => Stream a
Stream.prototype.take = function (n) {
  return this.isEmpty || n < 1 ? Stream.Empty : this.isAbort ? this : this.isCons ? Stream.Cons(this.head, this.tail.take(n - 1)) :

  // isFuture
  Stream.Future(this.promise.then(function (s) {
    return s.take(n);
  }, Stream.Abort));
};

// aBoolean : Object (javascript truth)
// takeWile : (Stream a, a -> aBoolean) => Stream a
Stream.prototype.takeWhile = function (p) {
  return this.isEmpty || this.isAbort ? this : this.isCons ? p(this.head) ? Stream.Cons(this.head, this.tail.takeWhile(p)) : Stream.Empty :

  // isFuture
  Stream.Future(this.promise.then(function (s) {
    return s.takeWhile(p);
  }, Stream.Abort));
};

// takeUntil  : (Stream a, Promise) => Stream a
Stream.prototype.takeUntil = function (promise) {
  return this.isEmpty || this.isAbort ? this : this.isCons ? Stream.Cons(this.head, this.tail.takeUntil(promise)) :

  // isFuture
  Stream.Future(_getLater$raceLP.raceLP([promise.then(function (_) {
    return function () {
      return Stream.Empty;
    };
  }, Stream.Abort), this.promise.then(function (s) {
    return function () {
      return s.takeUntil(promise);
    };
  }, Stream.Abort)]));
};

// skip : (Stream a, n) => Stream a
Stream.prototype.skip = function (n) {
  return this.isEmpty || this.isAbort || n < 1 ? this : this.isCons ? this.tail.skip(n - 1) :

  // isFuture
  Stream.Future(this.promise.then(function (s) {
    return s.skip(n);
  }, Stream.Abort));
};

// aBoolean : Object (javascript truth)
// skipWhile : (Stream a, a -> aBoolean) => Stream a
Stream.prototype.skipWhile = function (p) {
  return this.isEmpty || this.isAbort ? this : this.isCons ? p(this.head) ? this.tail.skipWhile(p) : this :

  // isFuture
  Stream.Future(this.promise.then(function (s) {
    return s.skipWhile(p);
  }, Stream.Abort));
};

// skipUntil  : (Stream a, Promise) => Stream a
Stream.prototype.skipUntil = function (promise) {
  var _this4 = this;

  return this.isEmpty || this.isAbort ? this : this.isCons ? this.tail.skipUntil(promise) :

  // isFuture
  Stream.Future(_getLater$raceLP.raceLP([this.promise.then(function (s) {
    return function () {
      return s.skipUntil(promise);
    };
  }, Stream.Abort), promise.then(function (_) {
    return function () {
      return _this4;
    };
  }, Stream.Abort)]));
};

// aBoolean : Object (javascript truth)
// filter : (Stream a, a -> aBoolean) => Stream a
Stream.prototype.filter = function (p) {
  return this.isEmpty || this.isAbort ? this : this.isCons ? p(this.head) ? Stream.Cons(this.head, this.tail.filter(p)) : this.tail.filter(p) :

  // isFuture
  Stream.Future(this.promise.then(function (s) {
    return s.filter(p);
  }, Stream.Abort));
};

// reduce : ( b, Stream a, (b, a) -> a ) => Promise b
Stream.prototype.reduce = function (seed, f) {
  return this.isEmpty ? Promise.resolve(seed) : this.isAbort ? Promise.reject(this.error) : this.isCons ? this.tail.reduce(f(seed, this.head), f) :

  // isFuture
  this.promise.then(function (s) {
    return s.reduce(seed, f);
  }, Promise.reject);
};

// all : ( Stream a, a -> aBoolean ) => Promise Boolean
Stream.prototype.all = function (pred) {
  return this.reduce(true, function (prev, cur) {
    return prev && !!pred(cur);
  });
};

// any : ( Stream a, a -> aBoolean ) => Promise Boolean
Stream.prototype.any = function (pred) {
  return this.reduce(false, function (prev, cur) {
    return prev || !!pred(cur);
  });
};

// concat : (Stream a, Stream a) => Stream a
Stream.prototype.concat = function (s2) {
  return this.isEmpty ? s2 : this.isAbort ? this : this.isCons ? Stream.Cons(this.head, this.tail.concat(s2)) :

  // isFuture
  Stream.Future(this.promise.then(function (s) {
    return s.concat(s2);
  }, Stream.Abort));
};

// merge : (Stream a, Stream a) => Stream a
Stream.prototype.merge = function (s2) {
  var _this5 = this;

  return this.isEmpty ? s2 : this.isAbort ? this : this.isCons ? Stream.Cons(this.head, this.tail.merge(s2)) : !s2.isFuture ? s2.merge(s1) : Stream.Future(_getLater$raceLP.raceLP([this.promise.then(function (s) {
    return function () {
      return s.merge(s2);
    };
  }, Stream.Abort), s2.promise.then(function (s) {
    return function () {
      return s.merge(_this5);
    };
  }, Stream.Abort)]));
};

// flatten : Stream (Stream a) => Stream a
Stream.prototype.flatten = function () {

  return go(Stream.Empty, this);

  function go(_x5, _x6) {
    var _again2 = true;

    _function2: while (_again2) {
      _again2 = false;
      var acc = _x5,
          me = _x6;
      if (me.isEmpty || me.isAbort) {
        return acc;
      } else {

        if (me.isCons) {
          _x5 = acc.merge(me.head);
          _x6 = me.tail;
          _again2 = true;
          continue _function2;
        } else {
          return (

            // isFuture
            acc.merge(Stream.Future(me.promise.then(function (s) {
              return s.flatten();
            }, Stream.Abort)))
          );
        }
      }
    }
  }
};

// flatMap : (Stream a, a -> Stream b) => Stream b
Stream.prototype.flatMap = function (f) {
  return this.map(f).flatten();
};

// zip : (Stream a, Stream b) => Stream [a,b]
Stream.prototype.zip = function (s2) {
  var _this6 = this;

  return this.isEmpty || this.isAbort ? this : this.isCons ? s2.isCons ? Stream.Cons([this.head, s2.head], this.tail.zip(s2.tail)) : s2.isFuture ? s2.promise.then(function (s) {
    return _this6.zip(s);
  }, Stream.Abort) :
  // s2.isEmpty || s2.isAbort
  s2 :

  // isFuture
  Stream.Future(this.promise.then(function (s) {
    return s.zip(s2);
  }, Stream.Abort));
};

// zipWith : (Stream a, Stream b, (a, b) -> c) => Stream c
Stream.prototype.zipWith = function (s2, f) {
  return this.zip(s2).map(function (pair) {
    return f.apply(null, pair);
  });
};

Stream.prototype.forEach = function (onNext) {
  var onError = arguments[1] === undefined ? noop : arguments[1];
  var onComplete = arguments[2] === undefined ? noop : arguments[2];

  if (this.isEmpty) onComplete();

  if (this.isAbort) onError(this.error);

  if (this.isCons) {
    onNext(this.head);
    this.tail.forEach(onNext, onError, onComplete);
  }

  if (this.isFuture) this.promise.then(function (stream) {
    return stream.forEach(onNext, onError, onComplete);
  }, onError);
};

Stream.prototype.log = function (prefix) {
  this.forEach(function (v) {
    return console.log(prefix, " data :", v);
  }, function (err) {
    return console.log(prefix, " error :", err);
  }, function () {
    return console.log(prefix, " end.");
  });
};

// factory methods

Stream.seq = function (arr, delay, interval) {
  return from(0, delay);

  function from(index, millis) {

    var getter = function getter() {
      return index < arr.length ? Stream.Cons(arr[index], from(index + 1, interval)) : Stream.Empty;
    };

    return Stream.Future(_getLater$raceLP.getLater(getter, millis));
  }
};

Stream.range = function (min, max, delay, interval) {
  return from(min, delay);

  function from(index, millis) {

    var getter = function getter() {
      return index <= max ? Stream.Cons(index, from(index + 1, interval)) : Stream.Empty;
    };

    return Stream.Future(_getLater$raceLP.getLater(getter, millis));
  }
};

exports["default"] = Stream;

// this.isFuture

},{"./adt":2,"./promise-utils":4}]},{},[3])(3)
});