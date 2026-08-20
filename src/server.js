// src/server.js

const app = require('./app');

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Wisdom API listening on port ${PORT}`);
});
