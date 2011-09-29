(function() {
  var Cycle, F, Util, f, _get;
  Util = {};
  window.Util = Util;
  F = (function() {
    function F(factory) {
      this.factory = factory;
    }
    return F;
  })();
  f = function(factory) {
    return new F(factory);
  };
  Util.f = f;
  _get = function(obj, name, defaultv) {
    var v;
    v = obj[name];
    if (v === void 0) {
      if (defaultv instanceof F) {
        return defaultv.factory();
      }
      return defaultv;
    }
    return v;
  };
  Util.bindnames = function(obj, options, defaults) {
    var name, v, _results;
    _results = [];
    for (name in defaults) {
      v = defaults[name];
      _results.push(obj[name] = _get(options, name, v));
    }
    return _results;
  };
  Util.removeFromArray = function(a, item) {
    var match, _results;
    match = -1;
    _results = [];
    while ((match = a.indexOf(item)) > -1) {
      _results.push(a.splice(match, 1));
    }
    return _results;
  };
  Util.randomChoice = function(array) {
    return array[Math.floor(Math.random() * array.length)];
  };
  Util.minmax = function(val, min, max) {
    /*
        returns val if val is between min and max else, max/min
        */    if ((min < val && val < max)) {
      return val;
    }
    if (min > val) {
      return min;
    }
    if (max < val) {
      return max;
    }
  };
  Cycle = (function() {
    function Cycle(_array) {
      this._array = _array;
    }
    Cycle.prototype.next = function() {
      var item;
      item = this._array.shift();
      this._array.push(item);
      return item;
    };
    return Cycle;
  })();
  Util.Cycle = Cycle;
}).call(this);
