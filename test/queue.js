
var Queue = require('../lib/queue');

var queue;

describe('Queue', function() {
  it('has a name', function() {
    queue = new Queue(db, 'foobar');
    expect(queue.name).to.eql('foobar');
  });
  it('has a default name', function() {
    queue = new Queue(db);
    expect(queue.name).to.eql('default');
  });
  it('has a collection', function() {
    queue = new Queue(db);
    expect(queue.collection).to.include.keys('insert');
  });
  describe('enqueue', function() {
    before(function(done) {
      queue = new Queue(db, 'queue-name')
      queue.enqueue('foobar', { foo: 'bar' }, function(err, _job) {
        job = _job;
        done();
      });
    });
    it('has an _id', function() {
      expect(job._id).to.exist;
    });
    it('has a name', function() {
      expect(job.name).to.eql('foobar');
    });
    it('has a queue', function() {
      expect(job.queue).to.eql('queue-name');
    });
    it('has params', function() {
      expect(job.params).to.eql({ foo: 'bar' });
    });
    it('has an enqueued date', function() {
      expect(job.enqueuedAt).to.be.lte(+new Date());
    });
    it('has `queued` status', function() {
      expect(job.status).to.eql('queued');
    });
    it('can be retreived', function(done) {
      queue.get(job._id, function(err, _job) {
        expect(job._id).to.eql(_job._id);
        done();
      })
    })
  });
  describe('dequeue', function() {
    var job;
    before(function (done) {
      queue = new Queue(db, 'queue-name')
      queue.reset();
      queue.enqueue('task1', { foo: 'bar' }, function(err) {
        queue.enqueue('task2', { foo: 'bar' }, function(err) {
          queue.dequeue(function(err, _job) {
            job = _job;
            done(err);
          });
        });
      });
    });
    it('first enqueue job', function() {
      expect(job.name).to.eql('task1');
    });
    it('has `dequeued` status', function() {
      expect(job.status).to.eql('dequeued');
    });
    it('has a dequeued date', function() {
      expect(job.dequeuedAt).to.be.lte(+new Date());
    });
  });
});

