const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());

// Routes
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const qaRouter = require('./routes/qa');
const subscriptionsRouter = require('./routes/subscriptions');

// Auth routes (proxy to auth service)
app.use('/auth', authRouter);

// API routes
app.use('/users', usersRouter);
app.use('/qa', qaRouter);
app.use('/stripe', subscriptionsRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'associations-api' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(port, () => {
  console.log(`Associations API listening on port ${port}`);
});