const express = require("express");
const router = express.Router();
const humidityController = require("../controllers/humidityController");

router.post("/", humidityController.create);
router.get("/latest", humidityController.getLatest);
router.get("/history", humidityController.getHistory);

module.exports = router;
