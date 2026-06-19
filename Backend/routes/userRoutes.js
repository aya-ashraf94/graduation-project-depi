const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { followUser, unfollowUser } = require("../controllers/userController");

router.post("/follow", authMiddleware, followUser);
router.post("/unfollow", authMiddleware, unfollowUser);

module.exports = router;
