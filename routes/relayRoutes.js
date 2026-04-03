const express = require("express");
const router = express.Router();
const relayController = require("../controllers/relayController");
const authenticate = require("../middleware/auth");

router.post("/command", authenticate, relayController.sendCommand);
router.get("/pending", authenticate, relayController.getPending);
router.post("/status", authenticate, relayController.reportStatus);
router.get("/status", authenticate, relayController.getStatus);

module.exports = router;
