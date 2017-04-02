const path = require('path');
const webpack = require('webpack');

module.exports = {
  context: __dirname,
  entry: "./src/main.js",
  output: {
    path: path.join(__dirname, "builds"),
    filename: "rallymetrics.min.js",
    library: "RallyMetrics",
    libraryTarget: 'umd'
  },

  devtool: 'source-map',

  stats: {
    colors: true,
    reasons: true
  },

  resolve: {
    modules: ["node_modules"],
    extensions: [".js"]
  },

  module: {
    rules: [
      {
        test: /\.js$/, exclude: /node_modules/, loader: 'babel-loader'
      }
    ]
  },

  plugins: [
    new webpack.optimize.UglifyJsPlugin({
      compress: {
        warnings: false
      }
    })
  ]
};
