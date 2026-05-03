const express = require("express");
const router = express.Router();
const loraController = require("../controllers/loraController");

// Endpoint for the gateway webhook (POST https://.../lorawan)
// This is typically a public endpoint as gateways don't always support complex auth
router.post("/", loraController.handleUplink);

// Optional: Endpoint to query data (for debugging or frontend use)
router.get("/:devEUI/latest", loraController.getLatest);

module.exports = router;
