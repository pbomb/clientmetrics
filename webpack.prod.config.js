var path = require('path');
var webpack = require('webpack');

module.exports = {
  context: __dirname,
  entry: "./src/main.js",
  output: {
    path: path.join(__dirname, "builds"),
    filename: "rallymetrics.min.js",
    library: "RallyMetrics",
    libraryTarget: 'umd'
  },

  debug: true,
  devtool: 'source-map',

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
  },

  plugins: [
    new webpack.optimize.DedupePlugin(),
    new webpack.optimize.UglifyJsPlugin({
      compress: {
        warnings: false
      }
    })
  ]
};
