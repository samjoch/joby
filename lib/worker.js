
var os = require('os');
var events = require('events');
var util = require('util');

var log = require('./log');

var Queue = require('./queue');

module.exports = Worker;

function Worker(queues, options) {
  options || (options = {});

  this.defaults = {
    name: [os.hostname(), os.arch()].join('-').toLowerCase(),
    interval: 250,
    timeout: 10 * 1e3
  };

  this.queues = queues;
  this.name = options.name || this.defaults.name;
  this.interval = options.interval || this.defaults.interval;
  this.timeout = options.timeout || this.defaults.timeout;

  this.callbacks = options.callbacks || {};

  if (this.queues.length === 0) {
    throw new Error('Worker must have at least one queue.');
  }
}

util.inherits(Worker, events.EventEmitter);

Worker.prototype.register = function(callbacks) {
  for (var name in callbacks) {
    this.callbacks[name] = callbacks[name];
  }
};

Worker.prototype.strategies = function(strategies) {
  for (var name in strategies) {
    this.strategies[name] = strategies[name];
  }
};

Worker.prototype.log = function() {
  log.i.bind(null, this.name.green).apply(null, arguments);
};

Worker.prototype.start = function() {
  this.log('start');
  this.working = true;
  this.poll();
};

Worker.prototype.clearTimeout = function() {
  if (!this.pollTimeout) {
    return;
  }
  clearTimeout(this.pollTimeout);
  this.pollTimeout = null;
}

Worker.prototype.stop = function(cb) {
  this.log('stop');
  this.working = false;
  this.clearTimeout();
  if (cb) {
    cb();
  }
};

Worker.prototype.poll = function() {
  if (!this.working) {
    this.stop();
    return;
  }
  var queue = this.queue();
  this.log('poll', queue.name);
  queue.dequeue(function(err, job) {
    if (err) {
      return this.emit('error', err);
    }
    if (job && job.name) {
      job.queue = queue;
      this.emit('dequeued', job);
      this.work(job);
    } else {
      this.pollTimeout = setTimeout(function() {
        this.pollTimeout = null;
        this.poll();
      }.bind(this), this.interval);
    }
  }.bind(this));
};

Worker.prototype.queue = function() {
  var queue = this.queues.shift();
  this.queues.push(queue);
  return queue;
}

Worker.prototype.work = function (job) {
  this.log('>', job.name);
  var task = this.callbacks[job.name];
  var timeout = false;
  var timer = setTimeout(function() {
    timeout = true;
    this.log('!'.red, '> task timeout!')
    job.queue.timeout(this.name, job._id, function() {
      this.emit('timeout', job);
      this.poll();
    }.bind(this));
  }.bind(this), job.timeout || this.timeout);

  if (!task) {
    clearTimeout(timer);
    this.log('!'.red, 'task for', job.name, 'does not exist!')
    this.poll();
    return;
  }

  task(job.params, {
    raw: job,
    done: function() {
      clearTimeout(timer);
      this.log('> task done!', job._id)
      job.queue.complete(this.name, job._id, function() {
        this.emit('complete', job);
        if (!timeout) {
          this.poll();
        }
      }.bind(this));
    }.bind(this),
    fail: function() {
      clearTimeout(timer);
      this.log('> task fail!');
      job.queue.fail(this.name, job._id, function() {
        this.emit('fail', job);
        this.poll();
      });
    }
  });
};

