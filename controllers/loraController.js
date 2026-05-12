const LoRaWANData = require("../models/LoRaWANData");
const LoRaDevice = require("../models/LoRaDevice");

/**
 * Handle LoRaWAN Uplink from Milesight Gateway
 * Expects a JSON payload as configured in the Gateway HTTPS Application
 */
exports.handleUplink = async (req, res) => {
  try {
    const payload = req.body;
    
    // Log the incoming payload for debugging
    console.log("📥 [LoRaWAN] Received Uplink:", JSON.stringify(payload, null, 2));

    // Extract fields from Milesight/ChirpStack payload format
    const {
      devEUI,
      deviceName,
      applicationName,
      fPort,
      fCnt,
      data,
      object
    } = payload;

    // Basic validation - DevEUI is the minimum required to identify a device
    if (!devEUI) {
      console.warn("⚠️ [LoRaWAN] Received uplink without DevEUI");
      return res.status(400).json({ 
        error: "Bad Request", 
        message: "Missing devEUI in payload" 
      });
    }

    // Create a new record in the database
    const newData = new LoRaWANData({
      devEUI,
      deviceName,
      applicationName,
      fPort,
      fCnt,
      data, // This is usually the base64 encoded raw payload
      object, // This is the decoded JSON if a codec is used in the gateway
      rawPayload: payload
    });

    await newData.save();

    console.log(`✅ [LoRaWAN] Saved data for device: ${deviceName || "Unknown"} (${devEUI})`);

    res.status(200).json({ 
      status: "success", 
      message: "Uplink data received and stored" 
    });
  } catch (error) {
    console.error("❌ [LoRaWAN] Error processing uplink:", error);
    res.status(500).json({ 
      error: "Internal Server Error", 
      message: error.message 
    });
  }
};

/**
 * Get latest readings for a specific DevEUI
 */
exports.getLatest = async (req, res) => {
  try {
    const { devEUI } = req.params;
    const data = await LoRaWANData.findOne({ devEUI }).sort({ timestamp: -1 });
    
    if (!data) {
      return res.status(404).json({ error: "No data found for this device" });
    }

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch LoRaWAN data", message: error.message });
  }
};

/**
 * Get all logs (with optional filtering and pagination)
 */
exports.getLogs = async (req, res) => {
  try {
    const { devEUI, limit = 100, page = 1 } = req.query;
    const query = {};
    if (devEUI) query.devEUI = devEUI;

    const logs = await LoRaWANData.find(query)
      .sort({ timestamp: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    const total = await LoRaWANData.countDocuments(query);

    res.json({
      success: true,
      count: logs.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      data: logs
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch logs", message: error.message });
  }
};

/**
 * Get all registered LoRaWAN devices
 */
exports.getDevices = async (req, res) => {
  try {
    const devices = await LoRaDevice.find().sort({ registeredAt: -1 });
    res.json({ success: true, count: devices.length, data: devices });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch devices", message: error.message });
  }
};

/**
 * Register a new LoRaWAN device
 */
exports.addDevice = async (req, res) => {
  try {
    const { devEUI, name, building, room, latitude, longitude, province, city, sensorType, macAddress, sensorModel } = req.body;
    
    if (!devEUI && !name) {
      return res.status(400).json({ error: "devEUI and name are required" });
    }

    const device = new LoRaDevice({
      devEUI: devEUI || macAddress,
      name,
      sensorType: sensorType || "lorawan",
      macAddress: macAddress || "",
      sensorModel: sensorModel || "",
      province,
      city,
      building,
      room,
      latitude,
      longitude
    });

    await device.save();
    res.status(201).json({ success: true, data: device });
  } catch (error) {
    // Check for duplicate devEUI
    if (error.code === 11000) {
      return res.status(400).json({ error: "Device with this devEUI already exists" });
    }
    res.status(500).json({ error: "Failed to add device", message: error.message });
  }
};

/**
 * Update an existing LoRaWAN device
 */
exports.updateDevice = async (req, res) => {
  try {
    const { devEUI } = req.params;
    const updateData = req.body;
    
    const device = await LoRaDevice.findOneAndUpdate(
      { devEUI },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }

    res.json({ success: true, data: device });
  } catch (error) {
    res.status(500).json({ error: "Failed to update device", message: error.message });
  }
};

/**
 * Delete a LoRaWAN device
 */
exports.deleteDevice = async (req, res) => {
  try {
    const { devEUI } = req.params;
    const device = await LoRaDevice.findOneAndDelete({ devEUI });
    
    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }

    res.json({ success: true, message: "Device deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete device", message: error.message });
  }
};
