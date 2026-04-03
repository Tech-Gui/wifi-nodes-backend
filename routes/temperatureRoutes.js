const express = require("express");
const router = express.Router();
const temperatureController = require("../controllers/temperatureController");

router.post("/", temperatureController.create);
router.get("/latest", temperatureController.getLatest);
router.get("/history", temperatureController.getHistory);

module.exports = router;
