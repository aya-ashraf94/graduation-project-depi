const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authMiddleware = require('../middleware/authMiddleware');
const {
  registerUser,
  loginUser,
  getUserById,
  updateProfile,
  forgotPassword,
  resetPassword,
  validateResetToken
} = require('../controllers/authController');

const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 password reset requests per 15 minutes
  message: {
    message: "Too many password reset requests from this IP, please try again after 15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/user/:id', authMiddleware, getUserById);
router.put('/user/:id', authMiddleware, updateProfile);
router.post('/forgot-password', passwordResetLimiter, forgotPassword);
router.post('/reset-password', passwordResetLimiter, resetPassword);
router.post('/validate-reset-token', passwordResetLimiter, validateResetToken);

module.exports = router;