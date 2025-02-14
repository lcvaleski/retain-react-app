require('dotenv').config({ path: '.env.local' });
const app = require('./index');

function startServer(port) {
  app.listen(port, () => {
    console.log(`Development server running on port ${port}`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} is busy, trying ${port + 1}`);
      startServer(port + 1);
    } else {
      console.error('Server error:', err);
    }
  });
}

startServer(process.env.PORT || 3001); 