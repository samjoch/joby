
var log = require('./log');

module.exports = Queue;

function Queue(db, name, options) {
    if (typeof name === 'object' && options === undefined) {
        options = name;
        name = undefined;
    }

    options || (options = {});

    this.collection = db.collection(options.collectionName || 'jobs');
    this.name = name || 'default';
    this.options = options;
}

Queue.prototype.reset = function() {
  this.collection.remove({});
};

var updateStatus = function(status, worker, id, cb) {
  if (typeof id === 'string') {
    id = this.collection.s.pkFactory.ObjectID(id);
  }
  var newStatus = { status: status, endedAt: new Date(), worker: worker };
  this.collection.update({ _id: id }, {
    $set: newStatus,
    $addToSet: { statuses: newStatus }
  }, function(err, result) {
      if (err) {
        log.i('!'.red, 'Error on update job', id);
      }
      cb();
  });
};

Queue.prototype.complete = function(worker, id) {
  updateStatus.bind(this, 'completed').apply(this, arguments);
}

Queue.prototype.fail = function() {
  updateStatus.bind(this, 'failed').apply(this, arguments);
}

Queue.prototype.timeout = function() {
  updateStatus.bind(this, 'timeout').apply(this, arguments);
}

Queue.prototype.get = function (id, cb) {
  if (typeof id === 'string') {
    id = this.collection.s.pkFactory.ObjectID(id);
  }
  this.collection.findOne({ _id: id, queue: this.name }, function(err, job) {
    if (err) return cb(err);
    cb(null, job);
  });
};

Queue.prototype.enqueue = function (name, params, options, cb) {
  if (!cb && typeof options === 'function') {
    cb = options;
    options = {};
  }
  var job = {
    status: 'queued',
    name: name,
    queue: this.name,
    params: params,
    enqueuedAt: new Date()
  }
  this.collection.insert([job], function(err, results) {
    cb(null, results.ops[0]);
  });
};

Queue.prototype.dequeue = function (options, cb) {
  if (cb === undefined) {
    cb = options;
    options = {};
  }

  var query = {
    status: 'queued',
    queue: this.name
  };

  if (options.callbacks !== undefined) {
    var callback_names = Object.keys(options.callbacks);
    query.name = { $in: callback_names };
  }

  var sort = [['_id', 'asc']];
  var update = { $set: { status: 'dequeued', dequeuedAt: new Date() }};
  var options = { new: true };
  this.collection.findAndModify(query, sort, update, options, function(err, result) {
    var job = result.value;
    if (err) return cb(err);
    if (!job) return cb();
    cb(null, job);
  });
};

