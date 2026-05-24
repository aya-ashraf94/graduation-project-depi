const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const Report = require("../models/Report");

router.post("/", authMiddleware, async (req, res) => {
    try {
        const reporterId = req.user.id;
        const { productId, reason, details } = req.body;
        
        if (!productId || !reason) {
            return res.status(400).json({ message: "Product ID and reason are required" });
        }
        
        const report = await Report.create({
            productId,
            reporterId,
            reason,
            details
        });
        
        res.status(201).json({ message: "Report submitted successfully", report });
    } catch (error) {
        console.error("Error creating report:", error);
        res.status(500).json({ message: "Server Error" });
    }
});

module.exports = router;
