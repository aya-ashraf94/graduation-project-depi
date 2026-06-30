const db = require("../db");
const { userBlocks, users } = require("../db/schema");
const { eq, and } = require("drizzle-orm");

const blockUser = async (req, res) => {
  try {
    const blockerId = req.user.id;
    const { blockedId } = req.body;

    if (!blockedId) {
      return res.status(400).json({ message: "Blocked user ID is required" });
    }

    if (blockerId === blockedId) {
      return res.status(400).json({ message: "You cannot block yourself" });
    }

    // Check if block already exists
    const [existing] = await db.select()
      .from(userBlocks)
      .where(and(eq(userBlocks.blockerId, blockerId), eq(userBlocks.blockedId, blockedId)))
      .limit(1);

    if (existing) {
      return res.status(400).json({ message: "User is already blocked" });
    }

    await db.insert(userBlocks).values({
      blockerId,
      blockedId,
    });

    res.status(201).json({ message: "User blocked successfully" });
  } catch (error) {
    console.error("Error blocking user:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const unblockUser = async (req, res) => {
  try {
    const blockerId = req.user.id;
    const { blockedId } = req.params;

    if (!blockedId) {
      return res.status(400).json({ message: "Blocked user ID is required" });
    }

    await db.delete(userBlocks)
      .where(and(eq(userBlocks.blockerId, blockerId), eq(userBlocks.blockedId, blockedId)));

    res.json({ message: "User unblocked successfully" });
  } catch (error) {
    console.error("Error unblocking user:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const getBlockedUsers = async (req, res) => {
  try {
    const blockerId = req.user.id;

    // Join with users table to get the blocked user details
    const result = await db.select({
      id: users.id,
      name: users.name,
      avatar: users.avatar
    })
      .from(userBlocks)
      .innerJoin(users, eq(userBlocks.blockedId, users.id))
      .where(eq(userBlocks.blockerId, blockerId));

    const formatted = result.map(u => {
      const parts = u.name.split(" ");
      return {
        id: u.id,
        firstName: parts[0] || "",
        lastName: parts.slice(1).join(" ") || "",
        avatar: u.avatar
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error("Error fetching blocked users:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const checkBlockStatus = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { targetUserId } = req.params;

    if (!targetUserId) {
      return res.status(400).json({ message: "Target user ID is required" });
    }

    // Check if current user blocks target user
    const [blocksTarget] = await db.select()
      .from(userBlocks)
      .where(and(eq(userBlocks.blockerId, currentUserId), eq(userBlocks.blockedId, targetUserId)))
      .limit(1);

    // Check if target user blocks current user
    const [blockedByTarget] = await db.select()
      .from(userBlocks)
      .where(and(eq(userBlocks.blockerId, targetUserId), eq(userBlocks.blockedId, currentUserId)))
      .limit(1);

    res.json({
      isBlocked: !!blocksTarget,
      isBlockedByPartner: !!blockedByTarget
    });
  } catch (error) {
    console.error("Error checking block status:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports = {
  blockUser,
  unblockUser,
  getBlockedUsers,
  checkBlockStatus
};
