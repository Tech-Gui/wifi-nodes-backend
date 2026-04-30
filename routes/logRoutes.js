const express = require("express");
const router = express.Router();
const logController = require("../controllers/logController");
const authenticate = require("../middleware/auth");

router.get("/automation", authenticate, logController.getAutomationLogs);

module.exports = router;
