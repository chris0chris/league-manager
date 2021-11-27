const path = require('path');
const webpack = require('webpack');

module.exports = {
  entry: path.resolve(__dirname, 'src/index.js'),
  output: {
    path: path.resolve(__dirname, 'static/liveticker/js'),
    filename: 'liveticker.js',
  },
  plugins: [
    new webpack.DefinePlugin({
      'VERSION': '',
    }),
  ],
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
