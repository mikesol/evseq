// @flow

var _ = require('lodash');
var NanoTimer = require('nanotimer');
var SortedArray = require('sorted-array')
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

var fnify = function(instance, event, key, val, group) {
  return function(t, xtra) {
    if (group) {
      instance.activeGroups.add(group);
    }
    event.emit(key(t, xtra), val(t, xtra));
  }
}

var reset = function(instance) {
  instance.timers = [];
  instance.activeGroups = new Set([]);
}

var clearTimeout = function(instance) {
  instance.timers.forEach((x) => x.clearTimeout());
  reset(instance);
}

var softClearTimeout = function(instance) {
  for (var i = 0; i < instance.timers.length; i++) {
    if (instance.activeGroups.has(instance.sequence.array[i].group) || instance.timers[i].timeoutTriggered) {
      continue;
    }
    instance.timers[i].clearTimeout();
  }
  reset(instance);
}

var Sequitur = class {

  e: EventEmitter;
  xtra: any;
  playing: boolean;
  startedAt: number;
  timers: Array < NanoTimer > ;
  sequence: SortedArray;
  start: string;
  activeGroups: Set < string > ;

  constructor(e: EventEmitter, xtra ? : any) {
    this.e = e;
    this.xtra = xtra;
    this.playing = false;
    this.startedAt = nowns();
    this.timers = [];
    this.sequence = SortedArray.comparing((a) => timeToNano(a.t), []);
    this.start = '0s';
    this.activeGroups = new Set([]);
  }

  at(t: string,
    key: string | (x: number, y: any) => void,
    val: mixed | (x: number, y: any) => void,
    group ? : string): Sequitur {
    this.sequence.insert({
      t: t,
      key: key,
      val: val,
      group: group
    });
    return this;
  };

  play(): void {
    if (this.playing) {
      console.log("sequitur playing already");
      return;
    }
    console.log("playing " + this.sequence.array.length + " elements");
    this.playing = true;
    this.startedAt = nowns();
    this.timers = this.sequence.array
      .map((v) => ({
        t: v.t,
        key: _.isFunction(v.key) ? v.key : (x, y) => v.key,
        val: _.isFunction(v.val) ? v.val : (x, y) => v.val,
        group: v.group
      }))
      .map((v) => {
        var nt = new NanoTimer();
        nt.setTimeout(fnify(this, this.e, v.key, v.val, v.group), [startsThisLate(v.t, this.start), this.xtra],
          actualStart(v.t, this.start));
        return nt;
      });
  };

  stop(): void {
    this.start = '0s'
    if (this.playing == false) {
      return;
    }
    this.playing = false;
    clearTimeout(this);
  };

  pause(): void {
    if (this.playing == false) {
      return;
    }
    this.playing = false;
    clearTimeout(this);
    this.start = (timeToNano(this.start) + (nowns() - this.startedAt)) + 'n';
  };

  softpause(): void {
    if (this.playing == false) {
      return;
    }
    this.playing = false;
    softClearTimeout(this);
    this.start = (timeToNano(this.start) + (nowns() - this.startedAt)) + 'n';
  };

  seek(t: string): void {
    var localPlaying = this.playing;
    if (localPlaying) {
      this.stop();
    }
    this.start = t;
    if (localPlaying) {
      this.play();
    }
  };
  print(): void {
    this.sequence.array.forEach((x) => console.log(x.t + " " + x.key + " " + x.val))
  }
  static rerouteIfLate(ifOnTime: any, ifLate: any): (i: number) => any {
    return (i) => i > 0 ? ifLate : ifOnTime;
  }
};

module.exports = Sequitur;
