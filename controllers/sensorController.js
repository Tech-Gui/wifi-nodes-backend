const Sensor = require("../models/Sensor");

// POST /api/sensors/register — register a new sensor under the authenticated user
exports.register = async (req, res) => {
  try {
    const { sensor_id, type, name, location } = req.body;
    if (!sensor_id || !type) {
      return res.status(400).json({ error: "Missing sensor_id or type" });
    }

    const existing = await Sensor.findOne({ sensorId: sensor_id });
    if (existing) {
      if (existing.userId.toString() === req.user._id.toString()) {
        return res.status(200).json({ success: true, data: existing, message: "Sensor already registered to you" });
      }
      return res.status(409).json({ error: "Sensor already registered to another user" });
    }

    const sensor = new Sensor({
      sensorId: sensor_id,
      userId: req.user._id,
      type,
      name: name || "",
      location: location || "",
    });
    await sensor.save();

    console.log(`[Sensor] Registered ${sensor_id} (${type}) for user ${req.user.username}`);
    res.status(201).json({ success: true, data: sensor });
  } catch (error) {
    res.status(500).json({ error: "Failed to register sensor", message: error.message });
  }
};

// GET /api/sensors — list all sensors for authenticated user
exports.list = async (req, res) => {
  try {
    const sensors = await Sensor.find({ userId: req.user._id }).sort({ registeredAt: -1 });
    res.json({ success: true, count: sensors.length, data: sensors });
  } catch (error) {
    res.status(500).json({ error: "Failed to list sensors", message: error.message });
  }
};

// DELETE /api/sensors/:sensorId
exports.remove = async (req, res) => {
  try {
    const result = await Sensor.findOneAndDelete({
      sensorId: req.params.sensorId,
      userId: req.user._id,
    });
    if (!result) {
      return res.status(404).json({ error: "Sensor not found or not owned by you" });
    }
    res.json({ success: true, message: `Sensor ${req.params.sensorId} removed` });
  } catch (error) {
    res.status(500).json({ error: "Failed to remove sensor", message: error.message });
  }
};
