const express = require("express");
const router = express.Router();
const soilMoistureController = require("../controllers/soilMoistureController");
const authenticate = require("../middleware/auth");

router.post("/", authenticate, soilMoistureController.create);
router.get("/latest", authenticate, soilMoistureController.getLatest);
router.get("/history", authenticate, soilMoistureController.getHistory);

module.exports = router;
