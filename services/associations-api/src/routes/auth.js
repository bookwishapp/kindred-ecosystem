const express = require('express');
const router = express.Router();

// POST /auth/request - proxy to auth service
router.post('/request', async (req, res) => {
  try {
    const response = await fetch(`${process.env.AUTH_BASE_URL}/auth/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...req.body,
        redirect_uri: req.body.redirect_uri || 'associations://auth/verify',
        app_name: 'Associations'
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.json(data);
  } catch (error) {
    console.error('Auth request error:', error);
    return res.status(500).json({ error: 'Authentication service unavailable' });
  }
});

// GET /auth/verify - proxy to auth service
router.get('/verify', async (req, res) => {
  try {
    const { token, redirect_uri } = req.query;

    if (!token) {
      return res.status(400).json({ error: 'Token required' });
    }

    const response = await fetch(
      `${process.env.AUTH_BASE_URL}/auth/verify?token=${token}&redirect_uri=${redirect_uri || 'associations://auth/verify'}`,
      {
        method: 'GET',
      }
    );

    if (!response.ok) {
      const data = await response.json();
      return res.status(response.status).json(data);
    }

    // The auth service will redirect, so we shouldn't get here
    // But if we do, return the response
    const data = await response.text();
    return res.send(data);
  } catch (error) {
    console.error('Auth verify error:', error);
    return res.status(500).json({ error: 'Authentication service unavailable' });
  }
});

module.exports = router;