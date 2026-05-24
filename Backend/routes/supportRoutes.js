const express = require("express");
const router = express.Router();
const Newsletter = require("../models/Newsletter");

router.post("/newsletter", async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }
        
        const existing = await Newsletter.findOne({ email });
        if (existing) {
            return res.status(400).json({ message: "You are already subscribed!" });
        }
        
        await Newsletter.create({ email });
        res.status(201).json({ message: "Subscribed successfully!" });
    } catch (error) {
        console.error("Newsletter error:", error);
        res.status(500).json({ message: "Server Error" });
    }
});

module.exports = router;
