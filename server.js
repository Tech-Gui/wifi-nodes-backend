const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

// Per-parameter routes
const temperatureRoutes = require("./routes/temperatureRoutes");
const humidityRoutes = require("./routes/humidityRoutes");
const soilMoistureRoutes = require("./routes/soilMoistureRoutes");
const waterLevelRoutes = require("./routes/waterLevelRoutes");

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/wifi-nodes")
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Routes — one mount per parameter
app.use("/api/temperature", temperatureRoutes);
app.use("/api/humidity", humidityRoutes);
app.use("/api/soil-moisture", soilMoistureRoutes);
app.use("/api/water-level", waterLevelRoutes);

// Health / readiness probes (OKD / Kubernetes)
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date() });
});

app.get("/ready", async (req, res) => {
  const dbReady = mongoose.connection.readyState === 1;
  if (!dbReady) return res.status(503).json({ status: "NOT_READY" });
  res.json({ status: "READY" });
});

// Default route
app.get("/", (req, res) => {
  res.json({
    service: "wifi-nodes-backend",
    version: "1.0.0",
    endpoints: [
      "POST   /api/temperature",
      "GET    /api/temperature/latest",
      "GET    /api/temperature/history",
      "POST   /api/humidity",
      "GET    /api/humidity/latest",
      "GET    /api/humidity/history",
      "POST   /api/soil-moisture",
      "GET    /api/soil-moisture/latest",
      "GET    /api/soil-moisture/history",
      "POST   /api/water-level",
      "GET    /api/water-level/latest",
      "GET    /api/water-level/history",
      "GET    /health",
      "GET    /ready",
    ],
  });
});

// Start Server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Wi-Fi Node Backend running on port ${PORT}`);
});
