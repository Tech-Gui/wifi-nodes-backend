const Sensor = require("../models/Sensor");
const RelayStatus = require("../models/RelayStatus");
const WaterLevel = require("../models/WaterLevel");
const SoilMoisture = require("../models/SoilMoisture");

/**
 * Calculates a dynamic reporting interval based on system state.
 * @param {Object} sensor - The sensor requesting its config
 * @returns {Number} - The new interval in seconds
 */
exports.calculateAdaptiveInterval = async (sensor) => {
  const DEFAULT_INTERVAL = sensor.reportInterval || 600;
  const MIN_INTERVAL = 15;
  const CRITICAL_ZONE_PERCENT = 0.15; // 15% distance to threshold = fast reporting

  try {
    // 1. Find if any pump/relay linked to this sensor is currently ON
    const linkedRelays = await Sensor.find({
      userId: sensor.userId,
      type: "dual_relay",
      $or: [
        { linkedWaterLevelId: sensor.sensorId },
        { linkedSoilMoistureId: sensor.sensorId }
      ]
    });

    if (linkedRelays.length === 0) return DEFAULT_INTERVAL;

    let isAnyPumpOn = false;
    let targetRelay = null;

    for (const relay of linkedRelays) {
      const status = await RelayStatus.findOne({ relayId: relay.sensorId, userId: sensor.userId });
      if (status) {
        const isWaterOn = relay.linkedWaterLevelId === sensor.sensorId && status.waterTankState;
        const isSoilOn = relay.linkedSoilMoistureId === sensor.sensorId && status.irrigationState;
        
        if (isWaterOn || isSoilOn) {
          isAnyPumpOn = true;
          targetRelay = relay;
          break;
        }
      }
    }

    // 2. If Pump is OFF, return baseline
    if (!isAnyPumpOn) return DEFAULT_INTERVAL;

    // 3. If Pump is ON, apply algorithmic logic
    const Model = sensor.type === "water_level" ? WaterLevel : SoilMoisture;
    const latestReadings = await Model.find({ sensorId: sensor.sensorId })
      .sort({ timestamp: -1 })
      .limit(2);

    if (latestReadings.length < 2) return 30; // Default fast if pumping but no history

    const current = latestReadings[0];
    const previous = latestReadings[1];
    
    const timeDiffSec = (current.timestamp - previous.timestamp) / 1000;
    const valueDiff = current.value - previous.value;
    
    // Rate of change per second
    const rateOfChange = timeDiffSec > 0 ? Math.abs(valueDiff / timeDiffSec) : 0;

    let distanceToThreshold = 0;
    if (sensor.type === "water_level") {
      // In Water Level, we want to stop at pumpOffDistanceCm (Top of tank)
      // Usually current.value (raw) needs calibration, but for delta logic we can use raw 
      // OR better, we use calibrated values if available.
      const stopThreshold = targetRelay.pumpOffDistanceCm;
      
      // Calibrate current value for accurate distance to threshold
      const sf = sensor.calibScaleFactor || 1.0;
      const fullRef = sensor.calibFullReading || 0;
      const currentCalib = (current.value - fullRef) * sf;
      
      distanceToThreshold = Math.abs(currentCalib - stopThreshold);
    } else {
      // In Soil Moisture, we want to stop at soilWetThresholdPct
      const stopThreshold = targetRelay.soilWetThresholdPct;
      
      // Calibrate to pct
      const soilDry = sensor.soilDryRawValue || 4095;
      const soilWet = sensor.soilWetRawValue || 2000;
      let currentPct = 0;
      if (soilDry !== soilWet) {
        currentPct = Math.round(((current.value - soilDry) / (soilWet - soilDry)) * 100);
      }
      
      distanceToThreshold = Math.abs(currentPct - stopThreshold);
    }

    // Proximity factor: If we are within the "Critical Zone" (close to full/wet), go fast
    // Total range could be 100cm or 100%
    const totalRange = sensor.type === "water_level" ? (sensor.tankHeightCm || 100) : 100;
    const isCritical = distanceToThreshold < (totalRange * CRITICAL_ZONE_PERCENT);

    if (isCritical) return MIN_INTERVAL;

    // Time-based factor: Interval = (Time to threshold) / 2
    if (rateOfChange > 0) {
      const estimatedTimeToThreshold = distanceToThreshold / (rateOfChange * (sensor.type === "water_level" ? (1/sf) : 1)); 
      // Note: rateOfChange is in raw units per second. 
      // For water, rawRoC * sf = calibRoC.
      
      const calibRoC = sensor.type === "water_level" ? (rateOfChange * Math.abs(sf)) : (rateOfChange * 100 / Math.abs(soilWet - soilDry));
      const ttt = calibRoC > 0 ? (distanceToThreshold / calibRoC) : 3600;

      const suggestedInterval = Math.max(MIN_INTERVAL, Math.min(DEFAULT_INTERVAL, Math.round(ttt / 2.5)));
      return suggestedInterval;
    }

    return 30; // Default fast if rate is unknown
  } catch (err) {
    console.error("[Adaptive Interval Service Error]:", err);
    return DEFAULT_INTERVAL;
  }
};
