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
});

module.exports = mongoose.model("Sensor", sensorSchema);
