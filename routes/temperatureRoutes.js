const express = require("express");
const router = express.Router();
const temperatureController = require("../controllers/temperatureController");
const authenticate = require("../middleware/auth");

router.post("/", authenticate, temperatureController.create);
router.get("/latest", authenticate, temperatureController.getLatest);
router.get("/history", authenticate, temperatureController.getHistory);

module.exports = router;
