require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { authenticate, authenticateAdmin } = require('./middleware');
const {
  requestMagicLink,
  verifyMagicLink,
  refreshAccessToken,
  logout,
  getCurrentUser
} = require('./auth');
const {
  showLoginForm,
  handleLogin,
  handleLogout,
  listUsers,
  showUser,
  deleteUser,
  revokeAllSessions
} = require('./admin');
const { isAdminConfigured } = require('./adminAuth');
const {
  getMyProfile,
  upsertProfile,
  getPublicProfile,
  deleteProfile,
  addWishlistLink,
  deleteWishlistLink,
  addSharedDate,
  deleteSharedDate
} = require('./profiles');
const { getUploadUrl } = require('./upload');

const app = express();
const PORT = process.env.PORT || 3000;

// Parse allowed origins from environment variable
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:3000', 'https://fromkindred.com'];

// Create CORS middleware for auth routes only
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

// Global middleware (no CORS here - admin routes don't need it)
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // For form submissions
app.use(cookieParser());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - Auth: ${req.headers.authorization ? 'present' : 'missing'}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'auth' });
});

// Auth routes (with CORS for cross-origin access)
app.post('/auth/request', corsMiddleware, requestMagicLink);
app.get('/auth/verify', corsMiddleware, verifyMagicLink);
app.post('/auth/refresh', corsMiddleware, refreshAccessToken);
app.post('/auth/logout', corsMiddleware, logout);
app.get('/auth/me', corsMiddleware, authenticate, getCurrentUser);

// Profile routes
app.get('/profile', corsMiddleware, authenticate, getMyProfile);
app.post('/profile', corsMiddleware, authenticate, upsertProfile);
app.delete('/profile', corsMiddleware, authenticate, deleteProfile);
app.get('/profile/:userId', corsMiddleware, getPublicProfile); // no auth — public

// Wishlist link routes
app.post('/profile/links', corsMiddleware, authenticate, addWishlistLink);
app.delete('/profile/links/:linkId', corsMiddleware, authenticate, deleteWishlistLink);

// Shared date routes
app.post('/profile/dates', corsMiddleware, authenticate, addSharedDate);
app.delete('/profile/dates/:dateId', corsMiddleware, authenticate, deleteSharedDate);

// Upload
app.post('/upload-url', corsMiddleware, authenticate, getUploadUrl);

// Admin routes (no CORS - same-origin requests only)
app.get('/admin/login', showLoginForm);
app.post('/admin/login', handleLogin);
app.get('/admin/logout', handleLogout);
app.get('/admin', authenticateAdmin, listUsers);
app.get('/admin/users/:id', authenticateAdmin, showUser);
app.post('/admin/users/:id/delete', authenticateAdmin, deleteUser);
app.post('/admin/users/:id/revoke-all', authenticateAdmin, revokeAllSessions);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Auth service running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Allowed origins: ${allowedOrigins.join(', ')}`);

  // Check admin configuration
  if (!isAdminConfigured()) {
    console.warn('⚠️  Admin panel is NOT configured. Set ADMIN_PASSWORD and ADMIN_SECRET to enable.');
  } else {
    console.log('✓ Admin panel is configured and available at /admin');
  }
});