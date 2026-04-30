const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const authenticate = require("../middleware/auth");

// All routes here require authentication
router.use(authenticate);

router.get("/profile", userController.getProfile);
router.patch("/profile", userController.updateProfile);
router.patch("/password", userController.updatePassword);

module.exports = router;
