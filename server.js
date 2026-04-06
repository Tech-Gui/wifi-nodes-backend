const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

// Routes
const authRoutes = require("./routes/authRoutes");
const sensorRoutes = require("./routes/sensorRoutes");
const temperatureRoutes = require("./routes/temperatureRoutes");
const humidityRoutes = require("./routes/humidityRoutes");
const soilMoistureRoutes = require("./routes/soilMoistureRoutes");
const waterLevelRoutes = require("./routes/waterLevelRoutes");
const relayRoutes = require("./routes/relayRoutes");
const sensorConfigRoutes = require("./routes/sensorConfigRoutes");


const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
const allowedOrigins = [
  "http://localhost:5173", 
  "http://localhost:3000", 
  "http://wifi-nodes-backend-rfq.app.cern.ch",
  "https://wifi-nodes-backend-rfq.app.cern.ch",
  "https://univen-smart-farm.onrender.com"
];

const corsOptions = {
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "x-api-key", "Authorization"]
};

app.use(cors(corsOptions));

// Explicitly handle OPTIONS preflight for all routes
app.options('*', cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global error handler for uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error("🔥 UNCAUGHT EXCEPTION:", err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error("🔥 UNHANDLED REJECTION:", reason);
});


// MongoDB Connection
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/wifi-nodes")
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Public routes (no auth)
app.use("/api/auth", authRoutes);

// Protected routes (require x-api-key)
app.use("/api/sensors", sensorRoutes);
app.use("/api/sensors", sensorConfigRoutes);

app.use("/api/temperature", temperatureRoutes);
app.use("/api/humidity", humidityRoutes);
app.use("/api/soil-moisture", soilMoistureRoutes);
app.use("/api/water-level", waterLevelRoutes);
app.use("/api/relay", relayRoutes);

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
    version: "2.0.0",
    multiTenant: true,
    auth: "x-api-key header required on all /api/* routes (except /api/auth)",
    endpoints: [
      "POST   /api/auth/register        — Create user account (returns API key)",
      "POST   /api/auth/login            — Login (returns API key)",
      "POST   /api/auth/regenerate-key   — Regenerate API key",
      "",
      "POST   /api/sensors/register      — Register sensor (MAC-based ID)",
      "GET    /api/sensors               — List your sensors",
      "DELETE /api/sensors/:sensorId     — Remove a sensor",
      "",
      "POST   /api/temperature           — Submit temperature reading",
      "GET    /api/temperature/latest     — Get latest temperature",
      "GET    /api/temperature/history    — Get temperature history",
      "",
      "POST   /api/humidity              — Submit humidity reading",
      "GET    /api/humidity/latest        — Get latest humidity",
      "GET    /api/humidity/history       — Get humidity history",
      "",
      "POST   /api/soil-moisture         — Submit soil moisture reading",
      "GET    /api/soil-moisture/latest   — Get latest soil moisture",
      "GET    /api/soil-moisture/history  — Get soil moisture history",
      "",
      "POST   /api/water-level           — Submit water level reading",
      "GET    /api/water-level/latest     — Get latest water level",
      "GET    /api/water-level/history    — Get water level history",
      "",
      "POST   /api/relay/command         — Send relay command",
      "GET    /api/relay/pending          — ESP32 polls for commands",
      "POST   /api/relay/status          — ESP32 reports relay state",
      "GET    /api/relay/status           — Get relay status",
      "",
      "GET    /health                     — Liveness probe",
      "GET    /ready                      — Readiness probe",
    ],
  });
});

// Start Server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Wi-Fi Node Backend v2.0 running on port ${PORT}`);
  console.log(`🔐 Multi-tenant mode enabled`);
});
