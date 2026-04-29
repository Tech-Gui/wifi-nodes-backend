const express = require("express");
const router = express.Router();
const waterLevelController = require("../controllers/waterLevelController");
const authenticate = require("../middleware/auth");

router.post("/", authenticate, waterLevelController.create);
router.get("/latest", authenticate, waterLevelController.getLatest);
router.get("/history", authenticate, waterLevelController.getHistory);
router.get("/usage", authenticate, waterLevelController.getUsage);

module.exports = router;
