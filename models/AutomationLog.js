const mongoose = require("mongoose");

const automationLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  sensorId: { type: String, required: true },
  type: { type: String, enum: ["water_level", "soil_moisture"], required: true },
  value: { type: Number },
  decision: { type: String, enum: ["ON", "OFF", "NONE"], default: "NONE" },
  reason: { type: String },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("AutomationLog", automationLogSchema);
