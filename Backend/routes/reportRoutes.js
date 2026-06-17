const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const db = require("../db");
const { reports } = require("../db/schema");

router.post("/", authMiddleware, async (req, res) => {
  try {
    const reporterId = req.user.id;
    const { productId, reason, details } = req.body;

    if (!productId || !reason) {
      return res.status(400).json({ message: "Product ID and reason are required" });
    }

    const [report] = await db.insert(reports).values({
      productId,
      reporterId,
      reason,
      details: details || null,
    }).returning();

    res.status(201).json({ message: "Report submitted successfully", report });
  } catch (error) {
    console.error("Error creating report:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

module.exports = router;
