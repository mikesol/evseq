# sequitur
A simple event sequencer for Node.js.

Sequitur is useful for controlling audio, lighting, and anything else that needs to be played, paused, stopped and/or resumed. It is especially well suited for use with RxJS.

Sequitur is build using flow and transpiled to ES5 from ES6 using babel.

## Hello world

```javascript
var Sequitur = require("sequitur");
var ril = Sequitur.rerouteIfLate;
var Rx = require('rx'),
  Observable = Rx.Observable,
  EventEmitter = require('events').EventEmitter;
var e = new EventEmitter();
var sum = 0;
var seq = new Sequitur(e).at('0s', 'foo', 1)
  .at('2.1s', 'foo', 1)
  .at('3.1s', 'foo', 1);
var subscription = Observable.fromEvent(e, 'foo')
  .subscribe((x) => sum += x);
seq.play();
// wait more than 3.1 seconds
// sum will equal 3
```

## API
```javascript
new Sequitur(e: EventEmitter, xtra ?: any)
```
Create a `Sequitur` object that emits events from `e`, passing `xtra` to a calling function at the time of emission.

```javascript
Sequitur.at(t: string,
    key: string | (x: number, y: any) => void,
    val: mixed | (x: number, y: any) => void,
    group ? : string): Sequitur
```
Schedules an event at time `t`. Time `t` can be expressed in seconds, milliseconds, microseconds or nanoseconds. It uses the same format of timing as [nanotimer][1].

Key `key` and value `value` can be either literals or functions.
- If they are literals, the are emitted in the traditional sense from the event passed into the `Sequitur` constructor, ie: `e.emit(key, value)`.
- If they are functions, then the return value of the functions are used for the key and value to the emitter. The function takes two parameters: the first is the error (meaning how late the emission happens compared to the request) and the second are the extra arguments passed to the `Sequitur` constructor.
[1]: https://github.com/Krb686/nanotimer
