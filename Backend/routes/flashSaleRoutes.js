const express = require("express");
const router = express.Router();
const {
    getActiveFlashSales,
} = require("../controllers/flashSaleController");

// Public: Get currently active flash sales
router.get("/active", getActiveFlashSales);

module.exports = router;
