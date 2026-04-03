const express = require("express");
const router = express.Router();
const sensorController = require("../controllers/sensorController");
const authenticate = require("../middleware/auth");

router.post("/register", authenticate, sensorController.register);
router.get("/", authenticate, sensorController.list);
router.delete("/:sensorId", authenticate, sensorController.remove);

module.exports = router;
