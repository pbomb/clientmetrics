const path = require('path');

module.exports = {
  context: __dirname,
  entry: "./src/main.js",
  output: {
    path: path.join(__dirname, "/builds"),
    filename: "rallymetrics.sdk.js",
    library: "RallyMetrics",
    libraryTarget: 'umd'
  },

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
