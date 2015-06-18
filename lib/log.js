
require('colors');

module.exports = {
  i: function() {
    console.log.bind(null, new Date().toISOString().blue).apply(null, arguments);
  }
};

