var path = require('path');
var webpack = require('webpack');

module.exports = {
  context: __dirname,
  entry: [
    "./test-utils/specHelper.js",
    "./src/__unit__/aggregator.spec.js",
    "./src/__unit__/corsBatchSender.spec.js",
    "./src/__unit__/windowErrorListener.spec.js"
  ],
  output: {
    path: path.join(__dirname, "/test"),
    filename: "rallymetrics-test.js"
  },

  debug: true,
  devtool: '#inline-cheap-source-map',

  stats: {
    colors: true,
    reasons: true
  },

  resolve: {
    modulesDirectories: ["node_modules"],
    extensions: ["", ".webpack.js", ".web.js", ".js"]
  },

  module: {
    loaders: [
      {
        test: /\.js$/, exclude: /node_modules/, loader: 'babel'
      }
    ]
  }
};
