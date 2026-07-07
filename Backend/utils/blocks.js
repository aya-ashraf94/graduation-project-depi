const db = require("../db");
const { userBlocks } = require("../db/schema");
const { eq, or } = require("drizzle-orm");

const getBlockedUserIds = async (userId) => {
  const blocks = await db.select()
    .from(userBlocks)
    .where(or(
      eq(userBlocks.blockerId, userId),
      eq(userBlocks.blockedId, userId)
    ));
  return blocks.map(b => b.blockerId === userId ? b.blockedId : b.blockerId);
};

module.exports = { getBlockedUserIds };
