var _ = require('underscore');
_.sift = require('sift');

var chai = require('chai');
var expect = chai.expect;
var sinon = require('sinon');
var sinonChai = require('sinon-chai');
chai.use(sinonChai);

var jobs = [];

var db = {
  collection: function(name) {
    return {
      remove: function() {
        jobs = [];
      },
      s: {
        pkFactory: { ObjectID: function(id) { return id; } }
      },
      insert: function(datas, cb) {
        datas || (datas = []);
        var data = datas[0];
        data._id = _.uniqueId('joby');
        jobs.push(data);
        cb(null, { n: 1, ops: [data] });
      },
      findOne: function(query, cb) {
        cb(null, _.sift(query, jobs)[0]);
      },
      findAndModify: function(query, sort, update, opts, cb) {
        var _jobs = _.sortBy(jobs, 'updatedAt')
        var data = _.sift(query, _jobs)[0] || {};
        _.each(update.$set, function(v, k) {
          data[k] = v;
        });
        cb(null, { value: data });
      }
    };
  }
}

var collection = db.collection('jobs');

_.extend(global, { jobs: jobs, db: db, collection: collection,
  _: _, expect: expect, sinon: sinon });

