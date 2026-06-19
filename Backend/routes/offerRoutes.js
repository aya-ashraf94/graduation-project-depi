const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { makeOffer, getOffers } = require("../controllers/offerController");

// All offer routes require authentication
router.use(authMiddleware);

router.post("/", makeOffer);
router.get("/", getOffers);

module.exports = router;
