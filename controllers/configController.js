const Sensor = require("../models/Sensor");

/**
 * GET /api/sensors/:sensorId/config
 * Fetch the current configuration for a specific sensor.
 */
exports.getConfig = async (req, res) => {
  try {
    const { sensorId } = req.params;
    const sensor = await Sensor.findOne({ sensorId, userId: req.user._id });

    if (!sensor) {
      return res.status(404).json({ error: "Sensor not found or access denied" });
    }

    res.json({
      success: true,
      data: {
        sensorId: sensor.sensorId,
        name: sensor.name,
        type: sensor.type,
        location: sensor.location,
        reportInterval: sensor.reportInterval,
        soilDryThresholdPct: sensor.soilDryThresholdPct,
        soilWetThresholdPct: sensor.soilWetThresholdPct,
        tankHeightCm: sensor.tankHeightCm,
        tankRadiusCm: sensor.tankRadiusCm,
        minThresholdCm: sensor.minThresholdCm,
        distOffsetCm: sensor.distOffsetCm,
        maxCapacityLiters: sensor.maxCapacityLiters,

        pumpOnDistanceCm: sensor.pumpOnDistanceCm,
        pumpOffDistanceCm: sensor.pumpOffDistanceCm,
        automationEnabled: sensor.automationEnabled,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch config", message: error.message });
  }
};

/**
 * PATCH /api/sensors/:sensorId/config
 * Update configuration fields for a specific sensor.
 */
exports.updateConfig = async (req, res) => {
  try {
    const { sensorId } = req.params;
    const updates = req.body;

    // Filter out restricted fields (sensorId, userId, etc.)
    const allowedFields = [
      "name",
      "location",
      "reportInterval",
      "soilDryThresholdPct",
      "tankHeightCm",
      "tankRadiusCm",
      "minThresholdCm",
      "tankRadiusCm",
      "tankShape",
      "tankLengthCm", "tankWidthCm", "tankBottomRadiusCm", "tankTopRadiusCm",
      "soilDryThresholdPct", "soilWetThresholdPct", "soilDryRawValue", "soilWetRawValue",
      "distOffsetCm", "calibEmptyReading", "calibFullReading", "calibScaleFactor", "minThresholdCm", "maxCapacityLiters",
      "pumpOnDistanceCm",
      "pumpOffDistanceCm",
      "automationEnabled",
      "linkedWaterLevelId",
      "linkedSoilMoistureId"
    ];

    const filteredUpdates = {};
    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        if (key === "automationEnabled" && typeof updates[key] === "object") {
          // Handle nested automation fields (e.g., automationEnabled.waterPump)
          if (updates[key].waterPump !== undefined) {
            filteredUpdates["automationEnabled.waterPump"] = updates[key].waterPump;
          }
          if (updates[key].irrigation !== undefined) {
            filteredUpdates["automationEnabled.irrigation"] = updates[key].irrigation;
          }
        } else {
          filteredUpdates[key] = updates[key];
        }
      }
    }

    const sensor = await Sensor.findOneAndUpdate(
      { sensorId, userId: req.user._id },
      { $set: filteredUpdates },
      { new: true }
    );

    if (!sensor) {
      return res.status(404).json({ error: "Sensor not found or access denied" });
    }

    console.log(`[Config] User: ${req.user.username}, Updated ${sensorId} config`);
    res.json({ success: true, data: sensor });

  } catch (error) {
    res.status(500).json({ error: "Failed to update config", message: error.message });
  }
};
