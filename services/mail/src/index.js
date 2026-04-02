require('dotenv').config();
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Auth middleware — shared secret
function requireSecret(req, res, next) {
  const secret = req.headers['x-mail-secret'];
  if (!secret || secret !== process.env.MAIL_SERVICE_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// Routes
app.use('/send', requireSecret, require('./routes/send'));
app.use('/schedule', requireSecret, require('./routes/schedule'));
app.use('/sequences', requireSecret, require('./routes/sequences'));
app.use('/unsubscribe', require('./routes/unsubscribe')); // public — no secret
app.use('/admin', requireSecret, require('./routes/admin'));

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'mail' }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(port, () => {
  console.log(`Mail service listening on port ${port}`);
});

// Start job worker
require('./worker');
