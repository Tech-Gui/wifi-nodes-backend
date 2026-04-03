const mongoose = require("mongoose");

const relayStatusSchema = new mongoose.Schema({
  relayId: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  irrigationState: { type: Boolean, default: false },
  waterTankState: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("RelayStatus", relayStatusSchema);
