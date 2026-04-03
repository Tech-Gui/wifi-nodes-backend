const express = require("express");
const router = express.Router();
const waterLevelController = require("../controllers/waterLevelController");

router.post("/", waterLevelController.create);
router.get("/latest", waterLevelController.getLatest);
router.get("/history", waterLevelController.getHistory);

module.exports = router;
