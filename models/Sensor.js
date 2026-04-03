const mongoose = require("mongoose");

const sensorSchema = new mongoose.Schema({
  sensorId: { type: String, required: true, unique: true }, // MAC-based e.g. "ESP32_A4CF1234ABCD"
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, default: "" },           // Friendly name e.g. "Greenhouse Soil Sensor"
  type: {
    type: String,
    enum: ["env_waterlevel", "soil_moisture", "dual_relay"],
    required: true,
  },
  location: { type: String, default: "" },
  registeredAt: { type: Date, default: Date.now },
  lastSeen: { type: Date, default: null },

  // Configuration Settings (Settings Page)
  reportInterval: { type: Number, default: 600 }, // Seconds (for Deep Sleep)
  
  // Soil moisture thresholds
  soilDryThresholdPct: { type: Number, default: 30 },
  soilWetThresholdPct: { type: Number, default: 70 },

  // Tank dimensions and thresholds
  tankHeightCm: { type: Number, default: 100 },
  tankRadiusCm: { type: Number, default: 50 },
  distOffsetCm: { type: Number, default: 0 },
  minThresholdCm: { type: Number, default: 10 },

  maxCapacityLiters: { type: Number, default: 1000 },
  pumpOnDistanceCm: { type: Number, default: 250 },
  pumpOffDistanceCm: { type: Number, default: 50 },

  // Automation Toggles
  automationEnabled: {
    waterPump: { type: Boolean, default: true },
    irrigation: { type: Boolean, default: true },
  },
});


module.exports = mongoose.model("Sensor", sensorSchema);
