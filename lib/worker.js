
var os = require('os');
var events = require('events');
var util = require('util');

var log = require('./log');

var Queue = require('./queue');

var Worker = module.exports = function Worker(queues, opts) {
  opts || (opts = {});

  this.defaults = {
    name: [os.hostname(), os.arch()].join('-').toLowerCase(),
    interval: 250,
    timeout: 10 * 1e3
  };

  this.queues = queues;
  this.name = opts.name || this.defaults.name;
  this.interval = opts.interval || this.defaults.interval;
  this.timeout = opts.timeout || this.defaults.timeout;

  this._tasks = opts.tasks || {};

  if (this.queues.length === 0) {
    throw new Error('Worker must have at least one queue.');
  }
}

util.inherits(Worker, events.EventEmitter);

Worker.prototype.tasks = function(tasks) {
  for (var task in tasks) {
    this._tasks[task] = tasks[task];
  }
};

Worker.prototype.log = function() {
  if (process.env['_'].match(/mocha$/)) {
    return;
  }
  log.i.bind(null, this.name.green).apply(null, arguments);
};

Worker.prototype.start = function() {
  this.emit('start');
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
  this.emit('stop');
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
    if (job && job.task) {
      job.queue = queue;
      this.emit('dequeued', job);
      try {
        this.work(job);
      } catch(err) {
        clearTimeout(job.timer);
        this.log('> task failed!');
        job.queue.failed(err, this.name, job, function() {
          this.emit('failed', job);
          this.poll();
        }.bind(this));
      }
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
  this.log('>', job.task);
  var task = this._tasks[job.task];
  var timeout = false;
  var timer = setTimeout(function() {
    timeout = true;
    this.log('!'.red, '> task timeout!')
    job.queue.timeout(new Error('timeout'), this.name, job, function() {
      this.emit('timeout', job);
      this.poll();
    }.bind(this));
  }.bind(this), job.timeout || this.timeout);

  job.timer = timer;

  if (!task) {
    clearTimeout(timer);
    this.log('!'.red, 'task for', job.task, 'does not exist!')
    this.poll();
    return;
  }

  task(job.params, {
    raw: job,
    done: function() {
      clearTimeout(timer);
      this.log('> task done!', job._id)
      job.queue.complete(this.name, job, function() {
        this.emit('complete', job);
        if (!timeout) {
          this.poll();
        }
      }.bind(this));
    }.bind(this),
    failed: function(err) {
      clearTimeout(timer);
      this.log('> task failed!');
      job.queue.failed(err || new Error(), this.name, job, function() {
        this.emit('failed', job);
        this.poll();
      }.bind(this));
    }
  });
};

