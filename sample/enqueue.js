
var MongoClient = require('mongodb').MongoClient;
var Joby = require('../');

var url = 'mongodb://localhost:3001/meteor';
MongoClient.connect(url, function(err, db) {
  var collection = db.collection('jobs');
  var Queue = new Joby.Queue(collection, 'queue');
  Queue.enqueue('stuff', { foo: 'bar' }, { rule: 'every 2 mins', interval: 3 * 1e3 },
    function(err, job) {
      console.log('Enqueued', job)
      process.exit()
    });
});

