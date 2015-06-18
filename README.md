JOBY
----

Joby is a simple `queue` backed by `mongodb` native nodejs client
based on, based on https://github.com/scttnlsn/monq.

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
  var Queue = new Joby.Queue(db, 'queue');
  var Worker = new Joby.Worker([Queue]);
  Worker.register({
    stuff: function(params, job) {
      // Doing stuff
      job.done();
      // job.fail();
    }
  });
  // Start polling
  Worker.start();

  // Add to queue
  Queue.enqueue('stuff', { foo: 'bar' }, function(err, job) {});
});
```

