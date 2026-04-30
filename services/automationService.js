const RelayCommand = require("../models/RelayCommand");
const Sensor = require("../models/Sensor");
const RelayStatus = require("../models/RelayStatus");
const AutomationLog = require("../models/AutomationLog");

/**
 * automationService.js
 * Central logic for triggering relay actions based on sensor readings.
 */

exports.checkAndTriggerAutomation = async (sensorType, sensorId, userId, value) => {
  try {
    // Find all sensors of type dual_relay that are linked to this sensor_id
    const query = { 
      userId, 
      type: "dual_relay" 
    };
    
    if (sensorType === "water_level") {
      query.linkedWaterLevelId = sensorId;
    } else if (sensorType === "soil_moisture") {
      query.linkedSoilMoistureId = sensorId;
    } else {
      return; // No automation for other sensor types
    }

    const linkedRelays = await Sensor.find(query);
    if (linkedRelays.length === 0) return;

    for (const relay of linkedRelays) {
      if (sensorType === "water_level") {
        if (!relay.automationEnabled?.waterPump) continue;

        // Fetch the water level sensor to get calibration values for raw -> true cm conversion
        const waterSensor = await Sensor.findOne({ sensorId: sensorId, userId });
        if (!waterSensor) continue;

        const sf = waterSensor.calibScaleFactor || 1.0;
        const fullRef = waterSensor.calibFullReading || 0;
        const tankHeight = waterSensor.tankHeightCm || 100;

        // Apply calibration: sensorDistance = (raw - fullRef) * sf
        let sensorDistance = (value - fullRef) * sf;
        if (sensorDistance < 0) sensorDistance = 0;
        if (sensorDistance > tankHeight) sensorDistance = tankHeight;

        // TANK LOGIC: Higher distance = lower water.
        let decision = "NONE";
        let reason = `Volume: ${Math.round(20 - (sensorDistance/32 * 20))}L (Dist: ${sensorDistance.toFixed(1)}cm)`;

        if (sensorDistance >= relay.pumpOnDistanceCm) {
          decision = "ON";
          reason += ` >= Start (${relay.pumpOnDistanceCm}cm)`;
          await issueCommand(relay.sensorId, userId, "water_tank", "ON");
        } else if (sensorDistance <= relay.pumpOffDistanceCm) {
          decision = "OFF";
          reason += ` <= Stop (${relay.pumpOffDistanceCm}cm)`;
          await issueCommand(relay.sensorId, userId, "water_tank", "OFF");
        } else {
          reason += ` within range (${relay.pumpOffDistanceCm} - ${relay.pumpOnDistanceCm}cm)`;
        }

        await AutomationLog.create({
          userId,
          sensorId,
          type: "water_level",
          value: sensorDistance,
          decision,
          reason
        });
      } 
      
      else if (sensorType === "soil_moisture") {
        if (!relay.automationEnabled?.irrigation) continue;

        // Fetch the soil moisture sensor to get calibration values for raw -> pct conversion
        const soilSensor = await Sensor.findOne({ sensorId: sensorId, userId });
        if (!soilSensor) continue;

        const soilDry = soilSensor.soilDryRawValue ?? 4095;
        const soilWet = soilSensor.soilWetRawValue ?? 2000;
        
        let moisturePct = 0;
        if (soilDry !== soilWet) {
          moisturePct = Math.round(((value - soilDry) / (soilWet - soilDry)) * 100);
          moisturePct = Math.max(0, Math.min(100, moisturePct));
        }

        // SOIL LOGIC: Lower percentage = dryer soil.
        let decision = "NONE";
        let reason = `Moisture: ${moisturePct}%`;

        if (moisturePct <= relay.soilDryThresholdPct) {
          decision = "ON";
          reason += ` <= Dry (${relay.soilDryThresholdPct}%)`;
          await issueCommand(relay.sensorId, userId, "irrigation", "ON");
        } else if (moisturePct >= relay.soilWetThresholdPct) {
          decision = "OFF";
          reason += ` >= Wet (${relay.soilWetThresholdPct}%)`;
          await issueCommand(relay.sensorId, userId, "irrigation", "OFF");
        } else {
          reason += ` within range (${relay.soilDryThresholdPct} - ${relay.soilWetThresholdPct}%)`;
        }

        await AutomationLog.create({
          userId,
          sensorId,
          type: "soil_moisture",
          value: moisturePct,
          decision,
          reason
        });
      }
    }
  } catch (err) {
    console.error("[Automation Service Error]:", err.message);
  }
};

/**
 * Helper to issue a relay command if it's not already pending a target state
 */
async function issueCommand(relayId, userId, channel, action) {
  // 1. Check if hardware already matches target state to avoid flooding
  const status = await RelayStatus.findOne({ relayId, userId });
  if (status) {
    const isCurrentlyOn = channel === 'water_tank' ? status.waterTankState : status.irrigationState;
    if (action === 'ON' && isCurrentlyOn) return;
    if (action === 'OFF' && !isCurrentlyOn) return;
  }

  // 2. Clear any existing pending commands for this relay/channel to ensure the new one takes precedence
  await RelayCommand.updateMany(
    { relayId, userId, channel, status: "pending" },
    { $set: { status: "overridden" } }
  );

  const command = new RelayCommand({
    relayId,
    userId,
    channel,
    action,
  });
  
  await command.save();
  console.log(`[Automation] Queued ${channel} ${action} for relay ${relayId}`);
}
