const WaterLevel = require("../models/WaterLevel");

exports.create = async (req, res) => {
  try {
    const { sensor_id, value } = req.body;
    if (!sensor_id || value === undefined) {
      return res.status(400).json({ error: "Missing sensor_id or value" });
    }
    const reading = new WaterLevel({ sensorId: sensor_id, value });
    await reading.save();
    console.log(`[Water Level] Sensor: ${sensor_id}, Value: ${value}cm`);
    res.status(201).json({ success: true, data: reading });
  } catch (error) {
    res.status(500).json({ error: "Failed to save water level reading", message: error.message });
  }
};

exports.getLatest = async (req, res) => {
  try {
    const { sensor_id } = req.query;
    const query = sensor_id ? { sensorId: sensor_id } : {};
    const reading = await WaterLevel.findOne(query).sort({ timestamp: -1 });
    if (!reading) return res.status(404).json({ error: "No readings found" });
    res.json({ success: true, data: reading });
  } catch (error) {
    res.status(500).json({ error: "Failed to get latest water level", message: error.message });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const { sensor_id, limit = 100 } = req.query;
    const query = sensor_id ? { sensorId: sensor_id } : {};
    const readings = await WaterLevel.find(query).sort({ timestamp: -1 }).limit(parseInt(limit));
    res.json({ success: true, count: readings.length, data: readings });
  } catch (error) {
    res.status(500).json({ error: "Failed to get water level history", message: error.message });
  }
};
