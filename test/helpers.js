var _ = require('underscore');

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
        cb(null, _.findWhere(jobs, query));
      },
      findAndModify: function(query, sort, update, options, cb) {
        var _jobs = _.sortBy(jobs, '_id')
        var data = _.findWhere(_jobs, query) || {};
        _.each(update.$set, function(v, k) {
          data[k] = v;
        });
        cb(null, { value: data });
      }
    };
  }
}

_.extend(GLOBAL, { jobs: jobs, db: db, _: _, expect: expect, sinon: sinon });

