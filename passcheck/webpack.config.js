const path = require('path');

module.exports = {
  // other webpack configuration...

  optimization: {
    splitChunks: {
      cacheGroups: {
        default: false,
      },
    },
  },

  output: {
    filename: 'passcheck.js',
    path: path.resolve(__dirname, 'static/passcheck/js'),
    },
};