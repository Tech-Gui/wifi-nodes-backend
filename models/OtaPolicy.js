const mongoose = require("mongoose");

/**
 * OTA Policy — Type-level default settings for firmware updates.
 *
 * One document per node type per user.
 * All nodes of a given type inherit these settings unless
 * they have a per-node otaOverride on their Sensor document.
 */
const otaPolicySchema = new mongoose.Schema({
  nodeType: {
    type: String,
    enum: ["soil_moisture", "env_waterlevel", "dual_relay"],
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  // OTA behavior defaults
  otaEnabled: { type: Boolean, default: true },
  otaCheckInterval: { type: Number, default: 3600 }, // Seconds (1 hour)

  updatedAt: { type: Date, default: Date.now },
});

// Compound unique: one policy per type per user
otaPolicySchema.index({ nodeType: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("OtaPolicy", otaPolicySchema);
