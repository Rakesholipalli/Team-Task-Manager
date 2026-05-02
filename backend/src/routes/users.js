const express = require('express');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/users/search?email=...
router.get('/search', async (req, res, next) => {
  try {
    const { email } = req.query;
    if (!email || email.length < 3) {
      return res.status(400).json({ error: 'Provide at least 3 characters' });
    }

    const users = await User.find({
      email: { $regex: email, $options: 'i' },
      _id: { $ne: req.user._id },
    })
      .select('name email')
      .limit(10);

    res.json(users);
  } catch (err) { next(err); }
});

module.exports = router;
