JOBY
----

Joby is a simple `job queue` backed by mongodb` native nodejs client that can be
used with Meteor.

Joby work use `later` to manage recurring rule.

Joby is based on, based on https://github.com/scttnlsn/monq.

**Install**

```bash
npm install joby
```

**Usage**

```javascript
var MongoClient = require('mongodb').MongoClient;
var Joby = require('joby');

var url = 'mongodb://localhost:27017/sample';

MongoClient.connect(url, function(err, db) {
  var collection = db.collection('jobs');
  var Queue = new Joby.Queue(collection, 'queue');
  var Worker = new Joby.Worker([Queue]);
  Worker.tasks({
    stuff: function(params, job) {
      // Doing stuff
      job.done();
      // job.failed();
    }
  });
  // Start polling
  Worker.start();

  // Add to queue
  Queue.enqueue('stuff', { foo: 'bar' }, function(err, job) {});
  Queue.enqueue('stuff', { foo: 'bar' }, { rule: 'every 30 minutes' }, function(err, job) {});
});
```

