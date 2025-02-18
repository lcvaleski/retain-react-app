const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes/api');

const app = express();

app.set('trust proxy', 1);
app.use(cors());

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, req.body);
  next();
});

app.use('/api', apiRoutes);

module.exports = app; 