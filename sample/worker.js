
var MongoClient = require('mongodb').MongoClient;
var Joby = require('../');

var url = 'mongodb://localhost:3001/meteor';
MongoClient.connect(url, function(err, db) {
  var Queue = new Joby.Queue(db, 'queue');
  var Worker = new Joby.Worker([Queue], {
    name: 'w1',
    interval: 3 * 1e3
  });
  Worker.register({
    stuff: function(params, job) {
      console.log('DOING STUFF!!', params, job.raw._id)
      job.done();
    }
  });
  Worker.start();
});

