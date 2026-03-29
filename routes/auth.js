const express = require('express');
const router = express.Router();
const db = require('../database');

// Login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username dan password wajib diisi' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?').get(username, password);
  if (!user) {
    return res.status(401).json({ error: 'Username atau password salah' });
  }

  req.session.user = { id: user.id, username: user.username, full_name: user.full_name, role: user.role };
  res.json({ success: true, user: req.session.user });
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// Cek status login
router.get('/me', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Belum login' });
  }
  res.json(req.session.user);
});

module.exports = router;
