var Queue = require('../lib/queue')
var Worker = require('../lib/worker')

var worker, queues;

var sandbox = sinon.sandbox.create();

describe('Worker', function() {

  beforeEach(function() {
    queues = [new Queue(collection, 'foobar'), new Queue(collection, 'foobar2')]
    worker = new Worker(queues);
  });

  afterEach(function () {
    sandbox.restore();
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

  it('computes default interval', function() {
    expect(worker.computeInterval()).to.eql(worker.defaults.interval)

    worker.range = ['10'];
    expect(worker.computeInterval()).to.eql(worker.defaults.interval)
  });

  it('computes range interval', function() {
    worker.range = [10, 15];

    var random = sandbox.stub(Math, 'random');

    random.returns(0.9);
    expect(worker.computeInterval()).to.eql(14);

    random.returns(0.1);
    expect(worker.computeInterval()).to.eql(10);
  });
});

