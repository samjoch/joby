
var later = require('later');

var log = require('./log');

var STATUS = {
  REQUEUED: 'requeued',
  QUEUED: 'queued',
  DEQUEUED: 'dequeued',
  COMPLETE: 'complete',
  TIMEOUT: 'timeout',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
}

var Queue = module.exports = function Queue(col, name, opts) {
    if (typeof name === 'object' && opts === undefined) {
        opts = name;
        name = undefined;
    }
    opts || (opts = {});

    this.name = name || 'default';
    this.collection = col;
};

Queue.prototype.reset = function() {
  this.collection.remove({});
};

Queue.prototype.updateStatus = function(newStatus, id, cb) {
  newStatus.at = new Date();
  this.collection.update({ _id: id }, {
    $set: { status: newStatus.label, updatedAt: newStatus.at },
    $addToSet: { statuses: newStatus }
  }, function(err) {
    if (err) {
      log.i('!'.red, 'Error on update job', id);
      return cb(err);
    }
    cb(null);
  });
}

Queue.prototype.complete = function(worker, job, cb) {
  var newStatus = { worker: worker, label: STATUS.COMPLETE };
  this.updateStatus(newStatus, job._id, function() {
    if (!job.rule) {
      return cb();
    }
    newStatus.label = STATUS.REQUEUED;
    newStatus.at = new Date();
    var rule = later.schedule(later.parse.text(job.rule));
    this.collection.update({ _id: job._id }, {
      $set: {
        status: newStatus.label,
        updatedAt: newStatus.at,
        scheduledAt: rule.next(2)[1]
      },
      $addToSet: { statuses: newStatus }
    }, function(err) {
      if (err) {
        log.i('!'.red, 'Error on update job', id);
        return cb(err);
      }
      cb(null);
    });
  }.bind(this));
};

Queue.prototype.failed = function(err, worker, job, cb) {
  this.updateStatus({
    worker: worker,
    label: STATUS.FAILED,
    message: err.message,
    stack: err.stack
  }, job._id, cb);
};

Queue.prototype.timeout = function(err, worker, job, cb) {
  this.updateStatus({
    worker: worker,
    label: STATUS.TIMEOUT,
    message: err.message,
    stack: err.stack
  }, job._id, cb);
};

Queue.prototype.get = function(id, cb) {
  this.collection.findOne({ _id: id }, function(err, job) {
    if (err) return cb(err);
    cb(null, job);
  });
};

Queue.prototype.enqueue = function(task, params, opts, cb) {
  if (typeof opts  === 'function') {
    cb = opts;
    opts = {};
  }
  opts.interval = opts.interval || 500;
  var initialStatus = {
    at: new Date(),
    by: opts.by || 'unknow',
    label: STATUS.QUEUED
  };
  if (opts.rule) {
    var rule = later.schedule(later.parse.text(opts.rule));
    if (!rule.isValid()) {
      return cb(new Error('Rule is invalid'));
    }
    opts.scheduledAt = rule.next();
  }
  var job = {
    createdAt: new Date(),
    updatedAt: initialStatus.at,
    scheduledAt: opts.scheduledAt || new Date(+new Date() + opts.interval),
    rule: opts.rule,
    task: task,
    queue: this.name,
    params: params,
    status: initialStatus.label,
    statuses: [initialStatus]
  };
  this.collection.insert([job], function(err, results) {
    if (err) return cb(err);
    var insertedJob = results.ops[0];
    cb(null, insertedJob);
  });
};

Queue.prototype.dequeue = function(opts, cb) {
  if (typeof opts === 'function') {
    cb = opts;
    opts = {};
  }
  opts.interval = opts.interval || 500;

  var query = {
    queue: this.name,
    status: { $in: [STATUS.QUEUED, STATUS.REQUEUED] },
    scheduledAt: { $lte: new Date(+new Date() + opts.interval) }
  };
  if ('tasks' in opts) {
    query.task = { $in: opts.tasks };
  }

  var newStatus = {
    at: new Date(),
    by: opts.by || 'unknow',
    label: STATUS.DEQUEUED
  };
  var update = {
    $set: { status: newStatus.label, updatedAt: newStatus.at },
    $addToSet: { statuses: newStatus }
  };
  var sort = [['updatedAt', 'asc']];
  var opts = { new: true };
  this.collection.findAndModify(query, sort, update, opts,
    function(err, result, r2) {
      if (err) return cb(err);
      if (!result && !r2) return cb();
      var job = (result && result.value) || (r2 && r2.value) || result;
      if (!job) return cb();
      cb(null, job);
    });
};

