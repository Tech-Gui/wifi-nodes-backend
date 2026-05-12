const LoRaWANData = require("../models/LoRaWANData");
const LoRaDevice = require("../models/LoRaDevice");

/**
 * Handle Wi-Fi Sensor Uplink (ESP32-C3 + SEN66)
 * Receives HTTP POST with JSON body containing sensor readings
 */
exports.handleUplink = async (req, res) => {
  try {
    const payload = req.body;

    console.log("📥 [Wi-Fi Sensor] Received Uplink:", JSON.stringify(payload, null, 2));

    const { macAddress, sensorModel } = payload;

    if (!macAddress) {
      console.warn("⚠️ [Wi-Fi Sensor] Received uplink without macAddress");
      return res.status(400).json({
        error: "Bad Request",
        message: "Missing macAddress in payload"
      });
    }

    // Look up the device — use macAddress as devEUI for unified queries
    let device = await LoRaDevice.findOne({ devEUI: macAddress });

    // Auto-register unknown Wi-Fi sensors
    if (!device) {
      console.log(`🆕 [Wi-Fi Sensor] Auto-registering new device: ${macAddress}`);
      device = new LoRaDevice({
        devEUI: macAddress,
        name: `SEN66-${macAddress.slice(-5).replace(/:/g, "")}`,
        sensorType: "wifi",
        macAddress,
        sensorModel: sensorModel || "SEN66",
        status: "active"
      });
      await device.save();
    }

    // Build the readings object (normalised field names)
    const readings = {
      temperature: payload.temperature,
      humidity: payload.humidity,
      co2: payload.co2,
      pm1_0: payload.pm1_0,
      pm2_5: payload.pm2_5,
      pm4: payload.pm4,
      pm10: payload.pm10,
      voc_index: payload.voc_index,
      nox_index: payload.nox_index,
      battery: payload.battery
    };

    // Store in the same collection as LoRaWAN data for unified log queries
    const newData = new LoRaWANData({
      devEUI: macAddress,
      deviceName: device.name,
      applicationName: "WiFi-SEN66",
      fPort: 0,
      fCnt: 0,
      data: "",
      object: readings,
      rawPayload: readings
    });

    await newData.save();

    console.log(`✅ [Wi-Fi Sensor] Saved data for ${device.name} (${macAddress})`);

    res.status(200).json({
      status: "success",
      message: "Sensor data received and stored",
      deviceName: device.name
    });
  } catch (error) {
    console.error("❌ [Wi-Fi Sensor] Error processing uplink:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: error.message
    });
  }
};
