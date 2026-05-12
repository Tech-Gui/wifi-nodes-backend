const express = require("express");
const router = express.Router();
const wifiSensorController = require("../controllers/wifiSensorController");

// ESP32-C3 SEN66 sends readings here via HTTP POST
router.post("/uplink", wifiSensorController.handleUplink);

module.exports = router;
