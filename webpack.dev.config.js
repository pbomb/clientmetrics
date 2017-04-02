const path = require('path');

module.exports = {
  context: __dirname,
  entry: "./src/main.js",
  output: {
    path: path.join(__dirname, "/builds"),
    filename: "rallymetrics.js",
    library: "RallyMetrics",
    libraryTarget: 'umd'
  },

  devtool: '#inline-cheap-source-map',

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
  }
};
