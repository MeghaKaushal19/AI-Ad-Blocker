const express = require('express');
const path = require('path');

const app = express();
const port = 3000;

// Serve the model folder for any requests to '/model'
app.use('/model', express.static(path.join(__dirname, 'model')));

// A default route to check server is running
app.get('/', (req, res) => {
  res.send('Server is up and running!');
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
