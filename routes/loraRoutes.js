const express = require("express");
const router = express.Router();
const loraController = require("../controllers/loraController");

// Endpoint for the gateway webhook (POST https://.../lorawan)
// This is typically a public endpoint as gateways don't always support complex auth
router.post("/", loraController.handleUplink);

// Optional: Endpoint to query data (for debugging or frontend use)
router.get("/logs", loraController.getLogs);
router.get("/:devEUI/latest", loraController.getLatest);

// Device Management Endpoints
router.get("/devices", loraController.getDevices);
router.post("/devices", loraController.addDevice);
router.put("/devices/:devEUI", loraController.updateDevice);
router.delete("/devices/:devEUI", loraController.deleteDevice);

module.exports = router;
