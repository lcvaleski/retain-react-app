const express = require('express');
const cors = require('cors');
const apiRouter = require('./routes/api');

const app = express();

// Handle Stripe webhook raw bodies BEFORE any other middleware
app.post('/api/stripe-webhook', express.raw({ type: 'application/json' }));

// Regular middleware for other routes
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// API routes
app.use('/api', apiRouter);

module.exports = app; 