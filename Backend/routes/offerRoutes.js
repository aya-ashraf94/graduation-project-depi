const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { makeOffer, getOffers } = require("../controllers/offerController");

router.post("/", authMiddleware, makeOffer);
router.get("/", authMiddleware, getOffers);

module.exports = router;
