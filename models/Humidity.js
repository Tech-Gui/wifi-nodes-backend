const mongoose = require("mongoose");

const humiditySchema = new mongoose.Schema({
  sensorId: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  value: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Humidity", humiditySchema);
