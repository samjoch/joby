
var MongoClient = require('mongodb').MongoClient;
var Joby = require('../');

var url = 'mongodb://localhost:3001/meteor';
MongoClient.connect(url, function(err, db) {
  var Queue = new Joby.Queue(db, 'queue');
  Queue.enqueue('stuff', { foo: 'bar' }, function(err, job) {
    console.log(job)
    process.exit() 
  });
});

