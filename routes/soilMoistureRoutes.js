const express = require("express");
const router = express.Router();
const soilMoistureController = require("../controllers/soilMoistureController");

router.post("/", soilMoistureController.create);
router.get("/latest", soilMoistureController.getLatest);
router.get("/history", soilMoistureController.getHistory);

module.exports = router;
