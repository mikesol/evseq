var expect = require("chai").expect;
var EvSeq = require("./../dist/evseq");
var ril = EvSeq.rerouteIfLate;
var Rx = require('rx'),
  Observable = Rx.Observable,
  EventEmitter = require('events').EventEmitter;

asyncTest("Play works correctly", function() {
  var e = new EventEmitter();
  var sum = 0;
  var seq = new EvSeq(e).at('0s', 'foo', 1)
    .at('2.1s', 'foo', 1)
    .at('3.1s', 'foo', 1);
  var subscription = Observable.fromEvent(e, 'foo')
    .subscribe((x) => sum += x);
  seq.play();
  setTimeout(function() {
    seq.stop();
    equal(3, sum);
    start();
  }, 4000);
});

asyncTest("Erroneous values are emitted at 0", function() {
  var e = new EventEmitter();
  var sum = 0;
  var seq = new EvSeq(e).at('5q', 'foo', 1)
    .at('6q', 'foo', 1)
    .at('7q', 'foo', 1);
  var subscription = Observable.fromEvent(e, 'foo')
    .subscribe((x) => sum += x);
  seq.play();
  setTimeout(function() {
    seq.stop();
    equal(3, sum);
    start();
  }, 100);
});

asyncTest("Extras are passed in", function() {
  var e = new EventEmitter();
  var sum = 0;
  var fooify = (i, x) => {
    sum += x;
    return 'foo';
  };
  var seq = new EvSeq(e, 3).at('0m', fooify, null)
    .at('2100m', fooify, null)
    .at('3100m', fooify, null);
  var subscription = Observable.fromEvent(e, 'foo')
    .subscribe((x) => {});
  seq.play();
  setTimeout(function() {
    seq.stop();
    equal(9, sum);
    start();
  }, 4000);
});

asyncTest("Pause works correctly", function() {
  var e = new EventEmitter();
  var sum = 0;
  var seq = new EvSeq(e).at('0u', 'foo', 1)
    .at('2100000u', 'foo', 1)
    .at('3100000u', 'foo', 1);
  var subscription = Observable.fromEvent(e, 'foo')
    .subscribe((x) => sum += x);
  seq.play();
  setTimeout(function() {
    seq.pause();
    setTimeout(function() {
      equal(2, sum);
      start();
    }, 2000);
  }, 2500);
});

asyncTest("Events with a group are emitted after a softpause", function() {
  var e = new EventEmitter();
  var sum = 0;
  var seq = new EvSeq(e).at('0n', 'foo', 1)
    .at('2100000000n', 'foo', 1)
    .at('3100000000n', 'foo', 1, 'mygroup')
    .at('4100000000n', 'foo', 1, 'mygroup')
    .at('4400000000n', 'foo', 1)
    .at('4500000000n', 'foo', 1, 'notmygroup')
    .at('5100000000n', 'foo', 1, 'mygroup')
    .at('8100000000n', 'foo', 1);
  var subscription = Observable.fromEvent(e, 'foo')
    .subscribe((x) => sum += x);
  seq.play();
  setTimeout(function() {
    seq.softpause();
    setTimeout(function() {
      equal(5, sum);
      start();
    }, 7000);
  }, 3500);
});

asyncTest("Late events are rerouted correctly, even with multiple pauses", function() {
  var e = new EventEmitter();
  var sum = 0;
  var seq = new EvSeq(e).at('0s', ril('foo', 'bar'), 1)
    .at('2.1s', ril('foo', 'bar'), 1)
    .at('3.1s', ril('foo', 'bar'), 1)
    .at('3.3s', ril('foo', 'bar'), 1);
  var subscription = Observable.fromEvent(e, 'foo')
    .subscribe((x) => sum += x);
  seq.play();
  setTimeout(function() {
    seq.pause();
    setTimeout(function() {
      seq.pause();
      setTimeout(function() {
        seq.play();
        setTimeout(function() {
          equal(4, sum);
          start();
        }, 2000);
      }, 2000);
    }, 500);
  }, 2500);
});

asyncTest("Stop resets the counter, and multiple stops have no incidence on this.", function() {
  var e = new EventEmitter();
  var sum = 0;
  var seq = new EvSeq(e).at('1s', ril('foo', 'bar'), 1)
    .at('2.1s', ril('foo', 'bar'), 1)
    .at('3.1s', ril('foo', 'bar'), 1)
    .at('3.3s', ril('foo', 'bar'), 1);
  var subscription = Observable.fromEvent(e, 'foo')
    .subscribe((x) => sum += x);
  seq.play();
  setTimeout(function() {
    seq.stop();
    setTimeout(function() {
      seq.stop();
      setTimeout(function() {
        seq.play();
        setTimeout(function() {
          equal(4, sum);
          start();
        }, 200);
      }, 200);
    }, 200);
  }, 5000);
});

asyncTest("Seek works correctly", function() {
  var e = new EventEmitter();
  var sum = 0;
  var seq = new EvSeq(e).at('0s', ril('foo', 'bar'), 1)
    .at('2.1s', ril('foo', 'bar'), 1)
    .at('3.1s', ril('foo', 'bar'), 1)
    .at('3.3s', ril('foo', 'bar'), 1);
  var subscription = Observable.fromEvent(e, 'foo')
    .subscribe((x) => sum += x);
  seq.seek('3s');
  seq.play();
  setTimeout(function() {
    seq.stop();
    equal(2, sum);
    start();
  }, 4000);
});

asyncTest("Multiple plays are ignored", function() {
  var e = new EventEmitter();
  var sum = 0;
  var seq = new EvSeq(e).at('0s', ril('foo', 'bar'), 1)
    .at('2.1s', ril('foo', 'bar'), 1)
    .at('3.1s', ril('foo', 'bar'), 1)
    .at('3.3s', ril('foo', 'bar'), 1);
  var subscription = Observable.fromEvent(e, 'foo')
    .subscribe((x) => sum += x);
  seq.seek('3s');
  seq.play();
  seq.play();
  seq.play();
  seq.play();
  seq.play();
  setTimeout(function() {
    seq.stop();
    equal(2, sum);
    start();
  }, 4000);
});

asyncTest("Plays nicely with rx", function() {
  var e = new EventEmitter();
  var sum = 0;
  var seq = new EvSeq(e).at('0s', 'foo', 1)
    .at('2.1s', 'foo', 1)
    .at('3.1s', 'foo', 1);
  var subscription = Observable.fromEvent(e, 'foo')
    .subscribe((x) => sum += x);
  seq.play();
  setTimeout(function() {
    subscription.dispose();
    setTimeout(function() {
      equal(2, sum);
      start();
    }, 2500);
  }, 2500);
});

asyncTest("Seek skips over events when playing", function() {
  var e = new EventEmitter();
  var sum = 0;
  var seq = new EvSeq(e).at('0s', ril('foo', 'bar'), 1)
    .at('2.1s', ril('foo', 'bar'), 1)
    .at('3.1s', ril('foo', 'bar'), 1)
    .at('3.3s', ril('foo', 'bar'), 1);
  var subscription = Observable.fromEvent(e, 'foo')
    .subscribe((x) => sum += x);
  seq.play();
  setTimeout(function() {
    seq.seek('3s');
    setTimeout(function() {
      equal(3, sum);
      start();
    }, 1000);
  }, 1000);
});
