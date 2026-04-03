const Temperature = require("../models/Temperature");

exports.create = async (req, res) => {
  try {
    const { sensor_id, value } = req.body;
    if (!sensor_id || value === undefined) {
      return res.status(400).json({ error: "Missing sensor_id or value" });
    }
    const reading = new Temperature({ sensorId: sensor_id, userId: req.user._id, value });
    await reading.save();
    console.log(`[Temperature] User: ${req.user.username}, Sensor: ${sensor_id}, Value: ${value}°C`);
    res.status(201).json({ success: true, data: reading });
  } catch (error) {
    res.status(500).json({ error: "Failed to save temperature reading", message: error.message });
  }
};

exports.getLatest = async (req, res) => {
  try {
    const { sensor_id } = req.query;
    const query = { userId: req.user._id };
    if (sensor_id) query.sensorId = sensor_id;
    const reading = await Temperature.findOne(query).sort({ timestamp: -1 });
    if (!reading) return res.status(404).json({ error: "No readings found" });
    res.json({ success: true, data: reading });
  } catch (error) {
    res.status(500).json({ error: "Failed to get latest temperature", message: error.message });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const { sensor_id, limit = 100 } = req.query;
    const query = { userId: req.user._id };
    if (sensor_id) query.sensorId = sensor_id;
    const readings = await Temperature.find(query).sort({ timestamp: -1 }).limit(parseInt(limit));
    res.json({ success: true, count: readings.length, data: readings });
  } catch (error) {
    res.status(500).json({ error: "Failed to get temperature history", message: error.message });
  }
};
