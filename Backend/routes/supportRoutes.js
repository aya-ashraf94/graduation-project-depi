const express = require("express");
const router = express.Router();
const { subscribeNewsletter, sendContactMessage } = require("../controllers/supportController");

router.post("/newsletter", subscribeNewsletter);
router.post("/contact", sendContactMessage);

module.exports = router;
