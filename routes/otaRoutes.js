const router = require("express").Router();
const authenticate = require("../middleware/auth");
const otaController = require("../controllers/otaController");

// Type-level OTA policies
router.get("/policy", authenticate, otaController.getPolicies);
router.put("/policy/:nodeType", authenticate, otaController.updatePolicy);

// ESP32 OTA acknowledgment
router.post("/ack", authenticate, otaController.ack);

// Dashboard status overview
router.get("/status", authenticate, otaController.getStatus);

module.exports = router;
