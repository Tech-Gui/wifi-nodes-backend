const mongoose = require("mongoose");

const waterLevelSchema = new mongoose.Schema({
  sensorId: { type: String, required: true },
  value: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("WaterLevel", waterLevelSchema);
