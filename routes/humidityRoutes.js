const express = require("express");
const router = express.Router();
const humidityController = require("../controllers/humidityController");
const authenticate = require("../middleware/auth");

router.post("/", authenticate, humidityController.create);
router.get("/latest", authenticate, humidityController.getLatest);
router.get("/history", authenticate, humidityController.getHistory);

module.exports = router;
