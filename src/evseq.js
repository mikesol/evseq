// @flow

var NanoTimer = require('nanotimer');
var EventEmitter = require('events').EventEmitter;

var timeToNano = function(interval) {
  var intervalType = interval[interval.length - 1];

  if (intervalType == 's') {
    return parseFloat(interval.slice(0, interval.length - 1)) * 1000000000;
  } else if (intervalType == 'm') {
    return parseFloat(interval.slice(0, interval.length - 1)) * 1000000;
  } else if (intervalType == 'u') {
    return parseFloat(interval.slice(0, interval.length - 1)) * 1000;
  } else if (intervalType == 'n') {
    return parseFloat(interval.slice(0, interval.length - 1));
  } else {
    console.log('Error with argument: ' + interval + ': Incorrect interval format. Format is an integer followed by "s" for seconds, "m" for milli, "u" for micro, and "n" for nanoseconds. Ex. 2u');
    return 0;
  }
}

var nowns = function() {
  var now = process.hrtime();
  return now[0] * 1000000000 + now[1];
}

var startsThisLate = function(requested, actual) {
  return -1 * Math.min(0, timeToNano(requested) - timeToNano(actual)) / 1000000000;
}

var actualStart = function(requested, actual) {
  return Math.max(0, timeToNano(requested) - timeToNano(actual)) + 'n';
}

var EvSeq = class {

  at: (t: string,
    key: string | (x: number, y: any) => string,
    val: mixed | (x: number, y: any) => mixed,
    group ? : string) => EvSeq;

  play: () => void;

  stop: () => void;

  pause: () => void;

  softpause: () => void;

  seek: (t: string) => void;

  print: () => void;

  constructor(e: EventEmitter, xtra ? : any) {
    var _playing = false;
    var _startedAt = nowns();
    var _timers = [];
    var _sequence = [];
    var _start = '0s';
    var _activeGroups = new Set([]);
    var _that = this;

    var fnify = function(key: string | (x: number, y: any) => string,
      val: mixed | (x: number, y: any) => mixed,
      group ? : string) {
      var fnkey = typeof(key) === 'function' ?
        key : (t, xtra) => typeof(key) === 'string' ? key : null;
      var fnval = typeof(val) === 'function' ? val : (t, xtra) => val;
      return function(t, xtra) {
        if (group) {
          _activeGroups.add(group);
        }
        var keyres = fnkey(t, xtra);
        if (keyres) {
          e.emit(keyres, fnval(t, xtra));
        }
      }
    }

    var reset = function() {
      _timers = [];
      _activeGroups = new Set([]);
    }

    var clearTimeout = function() {
      _timers.forEach((x) => x.clearTimeout());
      reset();
    }

    var softClearTimeout = function() {
      for (var i = 0; i < _timers.length; i++) {
        if (_activeGroups.has(_sequence[i].group) || _timers[i].timeoutTriggered) {
          continue;
        }
        _timers[i].clearTimeout();
      }
      reset();
    }

    this.at = (t, key, val, group) => {
      _sequence.push({
        t: t,
        key: key,
        val: val,
        group: group
      });
      return _that;
    }

    this.play = () => {
      if (_playing) {
        console.log("EvSeq playing already");
        return;
      }
      console.log("playing " + _sequence.length + " elements");
      _playing = true;
      _startedAt = nowns();
      _timers = _sequence.map((v) => {
        var nt = new NanoTimer();
        nt.setTimeout(fnify(v.key, v.val, v.group), [startsThisLate(v.t, _start), xtra],
          actualStart(v.t, _start));
        return nt;
      });
    };

    this.stop = () => {
      _start = '0s'
      if (_playing == false) {
        return;
      }
      _playing = false;
      clearTimeout(this);
    };

    var pause = (soft: boolean) => {
      if (_playing == false) {
        return;
      }
      _playing = false;
      soft ? softClearTimeout(this) : clearTimeout(this);
      _start = (timeToNano(_start) + (nowns() - _startedAt)) + 'n';
    }

    this.pause = () => pause(false);

    this.softpause = () => pause(true);

    this.seek = (t) => {
      var localPlaying = _playing;
      if (localPlaying) {
        this.stop();
      }
      _start = t;
      if (localPlaying) {
        this.play();
      }
    };

    this.print = () => {
      _sequence.forEach((x) => console.log(x.t + " " + String(x.key) + " " + String(x.val)))
    }
  }
  static rerouteIfLate(ifOnTime: any, ifLate: any): (i: number) => any {
    return (i) => i > 0 ? ifLate : ifOnTime;
  }
};

module.exports = EvSeq;
