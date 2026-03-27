require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { authenticate } = require('./middleware');
const {
  getMyProfile,
  createProfile,
  updateProfile,
  addWishlistLink,
  deleteWishlistLink,
  addDate,
  deleteDate,
  getProfile,
  deleteProfile
} = require('./profiles');
const {
  getKin,
  addKinLinked,
  addKinLocal,
  updateKin,
  deleteKin,
  addKinDate,
  deleteKinDate
} = require('./kin');
const { getUploadUrl } = require('./upload');

const app = express();
const PORT = process.env.PORT || 3001;

// Parse allowed origins from environment variable
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:3000'];

// CORS middleware
const corsMiddleware = cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (e.g., mobile apps, Postman)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true // Allow cookies to be sent cross-origin
});

// Global middleware
app.use(corsMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'kindred' });
});

// Upload route
app.post('/api/upload-url', authenticate, getUploadUrl);

// Profile routes
app.get('/profiles/me', authenticate, getMyProfile);
app.post('/profiles', authenticate, createProfile);
app.put('/profiles/me', authenticate, updateProfile);
app.post('/profiles/me/wishlist-links', authenticate, addWishlistLink);
app.delete('/profiles/me/wishlist-links/:id', authenticate, deleteWishlistLink);
app.post('/profiles/me/dates', authenticate, addDate);
app.delete('/profiles/me/dates/:id', authenticate, deleteDate);
app.delete('/profiles/me', authenticate, deleteProfile);
app.get('/profiles/:userId', getProfile); // Public - no auth required

// Kin routes
app.get('/kin', authenticate, getKin);
app.post('/kin', authenticate, (req, res) => {
  if (req.body.type === 'linked') {
    return addKinLinked(req, res);
  } else if (req.body.type === 'local') {
    return addKinLocal(req, res);
  } else {
    return res.status(400).json({ error: 'Invalid type. Must be "linked" or "local"' });
  }
});
app.put('/kin/:id', authenticate, updateKin);
app.delete('/kin/:id', authenticate, deleteKin);
app.post('/kin/:id/dates', authenticate, addKinDate);
app.delete('/kin/:id/dates/:dateId', authenticate, deleteKinDate);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Kindred service running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Allowed origins: ${allowedOrigins.join(', ')}`);
});