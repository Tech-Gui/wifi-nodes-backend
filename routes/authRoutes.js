const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const authenticate = require("../middleware/auth");

router.options("/register", (req, res) => res.sendStatus(204));
router.options("/login", (req, res) => res.sendStatus(204));
router.options("/regenerate-key", (req, res) => res.sendStatus(204));

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/regenerate-key", authenticate, authController.regenerateKey);

module.exports = router;
