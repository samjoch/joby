
var Queue = require('../lib/queue')
var Worker = require('../lib/worker')

var worker, queues;

describe('Worker', function() {

  before(function() {
    queues = [new Queue(collection, 'foobar'), new Queue(collection, 'foobar2')]
    worker = new Worker(queues);
  });

  it('has default name', function() {
    expect(worker.name).to.eql(worker.defaults.name);
  });

  it('has default timeout', function() {
    expect(worker.timeout).to.eql(worker.defaults.timeout);
  });

  it('has default interval polling', function() {
    expect(worker.interval).to.eql(worker.defaults.interval);
  });

  it('is not working at first', function() {
    expect(worker.working).to.not.exists;
  });

  it('retreives next queue', function() {
    expect(worker.queue().name).to.eql('foobar');
    expect(worker.queue().name).to.eql('foobar2');
    expect(worker.queue().name).to.eql('foobar');
  });

  it('flags up working on start', function(done) {
    expect(worker.working).to.not.exists;
    jobs = [];
    worker.interval = 60 * 1e3;
    worker.start();
    expect(worker.working).to.be.true;
    worker.stop(function() {
      expect(worker.working).to.be.false;
      done();
    });
  });

});

