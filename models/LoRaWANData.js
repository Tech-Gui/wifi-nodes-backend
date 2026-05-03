const mongoose = require("mongoose");

const loraWANDataSchema = new mongoose.Schema({
  devEUI: { type: String, required: true },
  deviceName: { type: String },
  applicationName: { type: String },
  fPort: { type: Number },
  fCnt: { type: Number },
  data: { type: String }, // Base64 raw data
  object: { type: mongoose.Schema.Types.Mixed }, // Decoded object if codec used
  timestamp: { type: Date, default: Date.now },
  rawPayload: { type: mongoose.Schema.Types.Mixed }, // Store the whole JSON for debugging
});

// Index for faster queries on device
loraWANDataSchema.index({ devEUI: 1, timestamp: -1 });

module.exports = mongoose.model("LoRaWANData", loraWANDataSchema);
