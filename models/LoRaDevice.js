const mongoose = require("mongoose");

const loraDeviceSchema = new mongoose.Schema({
  devEUI: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  building: { type: String, default: "" },
  room: { type: String, default: "" },
  latitude: { type: Number, default: -26.2041 }, // Default to Johannesburg, SA
  longitude: { type: Number, default: 28.0473 },
  status: { type: String, enum: ["active", "inactive", "maintenance"], default: "active" },
  registeredAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("LoRaDevice", loraDeviceSchema);
