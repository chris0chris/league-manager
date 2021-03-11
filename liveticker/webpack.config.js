const path = require('path');

module.exports = {
  // --mode development --watch --entry ./src/index.js --output-path ./static/liveticker/js"
  mode: 'development',
  entry: path.resolve(__dirname, 'src/index.js'),
  watch: true,
  output: {
    path: path.resolve(__dirname, 'static/liveticker/js'),
    filename: 'liveticker.js',
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /\node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
    ],
  },
};
