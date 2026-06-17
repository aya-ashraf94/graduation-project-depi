const express = require("express");
const router = express.Router();
const Newsletter = require("../models/Newsletter");
const Contact = require("../models/Contact");

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

// ── Contact / Complaint Form ────────────────────────────────────────────────
router.post("/contact", async (req, res) => {
    try {
        const { name, email, message } = req.body;
        if (!name || !email || !message) {
            return res.status(400).json({ message: "All fields are required" });
        }

        await Contact.create({ name, email, message });
        res.status(201).json({ message: "Your message has been sent successfully!" });
    } catch (error) {
        console.error("Contact error:", error);
        res.status(500).json({ message: "Server Error" });
    }
});

module.exports = router;
