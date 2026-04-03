const User = require("../models/User");
const Sensor = require("../models/Sensor");

/**
 * API Key Authentication Middleware
 *
 * Expects header:  x-api-key: mash_xxxxxxxx
 * Attaches req.user and optionally req.sensor
 */
const authenticate = async (req, res, next) => {
  try {
    const apiKey = req.headers["x-api-key"];
    if (!apiKey) {
      return res.status(401).json({ error: "Missing x-api-key header" });
    }

    const user = await User.findOne({ apiKey });
    if (!user) {
      return res.status(401).json({ error: "Invalid API key" });
    }

    req.user = user;

    // If a sensor_id is in body or query, verify it belongs to this user
    const sensorId = req.body?.sensor_id || req.query?.sensor_id || req.query?.relay_id || req.body?.relay_id;
    if (sensorId) {
      const sensor = await Sensor.findOne({ sensorId, userId: user._id });
      if (!sensor) {
        return res.status(403).json({
          error: "Sensor not registered or not owned by this user",
          sensor_id: sensorId,
        });
      }
      // Update last seen
      sensor.lastSeen = new Date();
      await sensor.save();
      req.sensor = sensor;
    }

    next();
  } catch (error) {
    res.status(500).json({ error: "Authentication failed", message: error.message });
  }
};

module.exports = authenticate;
