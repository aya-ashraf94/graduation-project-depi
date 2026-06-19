const db = require("../db");
const { follows, users, notifications } = require("../db/schema");
const { eq, and } = require("drizzle-orm");

const followUser = async (req, res) => {
  try {
    const followerId = req.user.id;
    const { followingId } = req.body;

    if (!followingId) {
      return res.status(400).json({ message: "Following user ID is required" });
    }

    if (followerId === followingId) {
      return res.status(400).json({ message: "You cannot follow yourself" });
    }

    // Verify user exists
    const [targetUser] = await db.select().from(users).where(eq(users.id, followingId)).limit(1);
    if (!targetUser) {
      return res.status(404).json({ message: "Seller not found" });
    }

    // Check if already following
    const [existing] = await db.select()
      .from(follows)
      .where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)))
      .limit(1);

    if (existing) {
      return res.status(400).json({ message: "You are already following this user" });
    }

    await db.insert(follows).values({
      followerId,
      followingId,
    });

    // Notify target user
    try {
      await db.insert(notifications).values({
        userId: followingId,
        type: "system",
        title: "New Follower! 👤",
        body: `${req.user.name || "A user"} started following you`,
        linkedRoute: `/profile/${followerId}`,
        isRead: false,
      });
    } catch (notifErr) {
      console.error("Failed to notify user follow:", notifErr);
    }

    res.json({ message: "Successfully followed user" });
  } catch (error) {
    console.error("Error in followUser:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const unfollowUser = async (req, res) => {
  try {
    const followerId = req.user.id;
    const { followingId } = req.body;

    if (!followingId) {
      return res.status(400).json({ message: "Following user ID is required" });
    }

    await db.delete(follows).where(and(
      eq(follows.followerId, followerId),
      eq(follows.followingId, followingId)
    ));

    res.json({ message: "Successfully unfollowed user" });
  } catch (error) {
    console.error("Error in unfollowUser:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports = {
  followUser,
  unfollowUser,
};
