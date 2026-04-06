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

  // Tank dimensions and shape
  tankShape: { type: String, enum: ["cylindrical", "rectangular", "conical_frustum"], default: "cylindrical" },
  tankHeightCm: { type: Number, default: 100 },
  tankRadiusCm: { type: Number, default: 50 }, // For Cylinder or Top Radius of Frustum
  tankLengthCm: { type: Number, default: 100 }, // For Rectangular
  tankWidthCm: { type: Number, default: 100 },  // For Rectangular
  tankBottomRadiusCm: { type: Number, default: 40 }, // For Conical Frustum
  tankTopRadiusCm: { type: Number, default: 50 },    // For Conical Frustum
  
  distOffsetCm: { type: Number, default: 0 },
  minThresholdCm: { type: Number, default: 10 },

  maxCapacityLiters: { type: Number, default: 500 },
  pumpOnDistanceCm: { type: Number, default: 90 }, // Starts when dist >= 90cm (lower water)
  pumpOffDistanceCm: { type: Number, default: 10 }, // Stops when dist <= 10cm (near full)

  // Automation Toggles
  automationEnabled: {
    waterPump: { type: Boolean, default: true },
    irrigation: { type: Boolean, default: true },
  },

  // Linked Sensors for Automation (for dual_relay nodes)
  linkedWaterLevelId: { type: String, default: null }, // sensorId e.g. ESP32_WATER_1
  linkedSoilMoistureId: { type: String, default: null }, // sensorId e.g. ESP32_SOIL_1
});


module.exports = mongoose.model("Sensor", sensorSchema);
