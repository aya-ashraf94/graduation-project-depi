const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { makeOffer, getOffers, acceptOffer, rejectOffer, counterOffer, getOffer } = require("../controllers/offerController");

// All offer routes require authentication
router.use(authMiddleware);

router.post("/", makeOffer);
router.get("/", getOffers);
router.get("/:id", getOffer);
router.patch("/:id/accept", acceptOffer);
router.patch("/:id/reject", rejectOffer);
router.patch("/:id/counter", counterOffer);

module.exports = router;
