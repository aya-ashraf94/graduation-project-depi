const express = require('express');
const router = express.Router();
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

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/user/:id', getUserById);
router.put('/user/:id', authMiddleware, updateProfile);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/validate-reset-token', validateResetToken);

module.exports = router;