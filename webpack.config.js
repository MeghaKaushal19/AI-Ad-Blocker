const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
  entry: {
    content: "./src/content.js", // example
    background: "./background.js",
    popup: "./popup.js",
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: "src/model", to: "model" },
      ],
    }),
  ],
  // other config...
};
