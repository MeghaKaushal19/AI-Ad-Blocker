const path = require('path');

module.exports = {
  entry: './src/content.js', // Your main content.js file
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  mode: 'production',
};
