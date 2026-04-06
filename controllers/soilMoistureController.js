const SoilMoisture = require("../models/SoilMoisture");
const automationService = require("../services/automationService");

exports.create = async (req, res) => {
  try {
    const { sensor_id, value } = req.body;
    if (!sensor_id || value === undefined) {
      return res.status(400).json({ error: "Missing sensor_id or value" });
    }
    const reading = new SoilMoisture({ sensorId: sensor_id, userId: req.user._id, value });
    await reading.save();
    console.log(`[Soil Moisture] User: ${req.user.username}, Sensor: ${sensor_id}, Value: ${value}%`);
    
    // Trigger automation check
    await automationService.checkAndTriggerAutomation("soil_moisture", sensor_id, req.user._id, value);
    
    res.status(201).json({ success: true, data: reading });
  } catch (error) {
    res.status(500).json({ error: "Failed to save soil moisture reading", message: error.message });
  }
};

exports.getLatest = async (req, res) => {
  try {
    const { sensor_id } = req.query;
    const query = { userId: req.user._id };
    if (sensor_id) query.sensorId = sensor_id;
    const reading = await SoilMoisture.findOne(query).sort({ timestamp: -1 });
    if (!reading) return res.status(404).json({ error: "No readings found" });
    res.json({ success: true, data: reading });
  } catch (error) {
    res.status(500).json({ error: "Failed to get latest soil moisture", message: error.message });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const { sensor_id, limit = 100 } = req.query;
    const query = { userId: req.user._id };
    if (sensor_id) query.sensorId = sensor_id;
    const readings = await SoilMoisture.find(query).sort({ timestamp: -1 }).limit(parseInt(limit));
    res.json({ success: true, count: readings.length, data: readings });
  } catch (error) {
    res.status(500).json({ error: "Failed to get soil moisture history", message: error.message });
  }
};
