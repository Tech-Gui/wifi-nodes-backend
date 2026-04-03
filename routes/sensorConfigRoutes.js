const express = require("express");
const router = express.Router();
const configController = require("../controllers/configController");
const authenticate = require("../middleware/auth");

/**
 * Routes for sensor-specific configurations
 */
router.get("/:sensorId/config", authenticate, configController.getConfig);
router.patch("/:sensorId/config", authenticate, configController.updateConfig);

module.exports = router;
