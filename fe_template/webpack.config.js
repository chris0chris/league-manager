const path = require('path');
const webpack = require('webpack');
const GitRevisionPlugin = require('git-revision-webpack-plugin');
const gitRevisionPlugin = new GitRevisionPlugin();

module.exports = {
  entry: path.resolve(__dirname, 'src/index.js'),
  output: {
    path: path.resolve(__dirname, 'static/XXX/js'),
    filename: 'XXX.js',
  },
  plugins: [
    gitRevisionPlugin,
    new webpack.DefinePlugin({
      'VERSION': JSON.stringify(gitRevisionPlugin.version()),
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
