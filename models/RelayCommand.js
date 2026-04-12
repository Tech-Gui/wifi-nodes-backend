const mongoose = require("mongoose");

const relayCommandSchema = new mongoose.Schema({
  relayId: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  channel: { type: String, enum: ["irrigation", "water_tank"], required: true },
  action: { type: String, enum: ["ON", "OFF"], required: true },
  status: {
    type: String,
    enum: ["pending", "delivered", "executed", "overridden", "failed"],
    default: "pending",
  },
  deliveredAt: { type: Date, default: null },
  executedAt: { type: Date, default: null },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("RelayCommand", relayCommandSchema);
