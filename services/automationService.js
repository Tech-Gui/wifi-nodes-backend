const RelayCommand = require("../models/RelayCommand");
const Sensor = require("../models/Sensor");

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

        // TANK LOGIC: Higher distance = lower water.
        // pumpOnDistanceCm: Distance at which pump starts (e.g. 250cm, tank nearly empty)
        // pumpOffDistanceCm: Distance at which pump stops (e.g. 50cm, tank nearly full)
        
        if (value >= relay.pumpOnDistanceCm) {
          await issueCommand(relay.sensorId, userId, "water_tank", "ON");
        } else if (value <= relay.pumpOffDistanceCm) {
          await issueCommand(relay.sensorId, userId, "water_tank", "OFF");
        }
      } 
      
      else if (sensorType === "soil_moisture") {
        if (!relay.automationEnabled?.irrigation) continue;

        // SOIL LOGIC: Lower percentage = dryer soil.
        // soilDryThresholdPct: Moisture % at which irrigation starts (e.g. 30%)
        // soilWetThresholdPct: Moisture % at which irrigation stops (e.g. 70%)

        if (value <= relay.soilDryThresholdPct) {
          await issueCommand(relay.sensorId, userId, "irrigation", "ON");
        } else if (value >= relay.soilWetThresholdPct) {
          await issueCommand(relay.sensorId, userId, "irrigation", "OFF");
        }
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
  // Check if a pending command for this relay/channel/action already exists to avoid spamming
  const pending = await RelayCommand.findOne({
    relayId,
    userId,
    channel,
    status: "pending",
  });

  if (pending) {
    // If pending command is already the same action, do nothing
    if (pending.action === action) return;
    
    // If pending command is the opposite action, we can either cancel it or just let the new one queue.
    // For simplicity, we just queue the new one.
  }

  const command = new RelayCommand({
    relayId,
    userId,
    channel,
    action,
  });
  
  await command.save();
  console.log(`[Automation] Queued ${channel} ${action} for relay ${relayId}`);
}
