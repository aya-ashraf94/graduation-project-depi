const db = require("../db");
const { newsletters, contacts } = require("../db/schema");
const { eq } = require("drizzle-orm");

const subscribeNewsletter = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const [existing] = await db.select().from(newsletters).where(eq(newsletters.email, email)).limit(1);
    if (existing) {
      return res.status(400).json({ message: "You are already subscribed!" });
    }

    await db.insert(newsletters).values({ email });
    res.status(201).json({ message: "Subscribed successfully!" });
  } catch (error) {
    console.error("Newsletter error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const sendContactMessage = async (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ message: "All fields are required" });
    }

    await db.insert(contacts).values({ name, email, message });
    res.status(201).json({ message: "Your message has been sent successfully!" });
  } catch (error) {
    console.error("Contact error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports = {
  subscribeNewsletter,
  sendContactMessage,
};
