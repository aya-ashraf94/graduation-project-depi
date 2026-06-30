const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  blockUser,
  unblockUser,
  getBlockedUsers,
  checkBlockStatus
} = require("../controllers/blockController");

router.use(authMiddleware);

router.post("/", blockUser);
router.delete("/:blockedId", unblockUser);
router.get("/list", getBlockedUsers);
router.get("/check/:targetUserId", checkBlockStatus);

module.exports = router;
