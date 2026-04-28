const OtaPolicy = require("../models/OtaPolicy");
const Sensor = require("../models/Sensor");

/**
 * GET /api/ota/policy
 * List all OTA policies for the authenticated user.
 * Returns one entry per node type (creates defaults if missing).
 */
exports.getPolicies = async (req, res) => {
  try {
    const nodeTypes = ["soil_moisture", "env_waterlevel", "dual_relay"];
    const policies = [];

    for (const nodeType of nodeTypes) {
      let policy = await OtaPolicy.findOne({ nodeType, userId: req.user._id });
      if (!policy) {
        // Auto-create default policy on first access
        policy = await OtaPolicy.create({
          nodeType,
          userId: req.user._id,
          otaEnabled: true,
          otaCheckInterval: 3600,
        });
      }
      policies.push(policy);
    }

    res.json({ success: true, data: policies });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch OTA policies", message: error.message });
  }
};

/**
 * PUT /api/ota/policy/:nodeType
 * Create or update the OTA policy for a specific node type.
 * Applies to ALL nodes of this type owned by the user.
 */
exports.updatePolicy = async (req, res) => {
  try {
    const { nodeType } = req.params;
    const validTypes = ["soil_moisture", "env_waterlevel", "dual_relay"];

    if (!validTypes.includes(nodeType)) {
      return res.status(400).json({ error: `Invalid node type. Must be one of: ${validTypes.join(", ")}` });
    }

    const { otaEnabled, otaCheckInterval } = req.body;
    const updates = { updatedAt: Date.now() };

    if (otaEnabled !== undefined) updates.otaEnabled = otaEnabled;
    if (otaCheckInterval !== undefined) {
      // Floor: minimum 5 minutes (300s)
      updates.otaCheckInterval = Math.max(300, Number(otaCheckInterval));
    }

    const policy = await OtaPolicy.findOneAndUpdate(
      { nodeType, userId: req.user._id },
      { $set: updates },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    console.log(`[OTA] User: ${req.user.username}, Updated policy for ${nodeType}: enabled=${policy.otaEnabled}, interval=${policy.otaCheckInterval}s`);
    res.json({ success: true, data: policy });
  } catch (error) {
    res.status(500).json({ error: "Failed to update OTA policy", message: error.message });
  }
};

/**
 * POST /api/ota/ack
 * ESP32 reports OTA update result.
 * Body: { sensor_id, version, success, error? }
 */
exports.ack = async (req, res) => {
  try {
    const { sensor_id, version, success, error: otaError } = req.body;

    if (!sensor_id || !version) {
      return res.status(400).json({ error: "sensor_id and version are required" });
    }

    const sensor = await Sensor.findOne({ sensorId: sensor_id, userId: req.user._id });
    if (!sensor) {
      return res.status(404).json({ error: "Sensor not found or not owned by this user" });
    }

    sensor.firmwareVersion = version;
    sensor.lastOtaCheck = new Date();
    sensor.lastOtaResult = success ? "success" : "failed";
    await sensor.save();

    console.log(`[OTA ACK] ${sensor_id}: v${version} → ${success ? "SUCCESS" : "FAILED"}${otaError ? ` (${otaError})` : ""}`);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to process OTA ack", message: error.message });
  }
};

/**
 * GET /api/ota/status
 * Dashboard: all sensors with firmware info, grouped by type.
 */
exports.getStatus = async (req, res) => {
  try {
    const sensors = await Sensor.find({ userId: req.user._id })
      .select("sensorId name type firmwareVersion lastOtaCheck lastOtaResult otaOverride lastSeen")
      .sort({ type: 1, sensorId: 1 });

    const policies = await OtaPolicy.find({ userId: req.user._id });
    const policyMap = {};
    for (const p of policies) {
      policyMap[p.nodeType] = p;
    }

    const data = sensors.map((s) => {
      const policy = policyMap[s.type];
      return {
        sensorId: s.sensorId,
        name: s.name,
        type: s.type,
        firmwareVersion: s.firmwareVersion || "unknown",
        lastOtaCheck: s.lastOtaCheck,
        lastOtaResult: s.lastOtaResult,
        lastSeen: s.lastSeen,
        otaEnabled: s.otaOverride?.enabled ?? policy?.otaEnabled ?? true,
        otaCheckInterval: s.otaOverride?.checkInterval ?? policy?.otaCheckInterval ?? 3600,
        hasOverride: s.otaOverride?.enabled !== null && s.otaOverride?.enabled !== undefined,
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch OTA status", message: error.message });
  }
};
