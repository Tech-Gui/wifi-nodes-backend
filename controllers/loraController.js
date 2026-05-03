const LoRaWANData = require("../models/LoRaWANData");

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
    let {
      devEUI,
      deviceName,
      applicationName,
      applicationID,
      fPort,
      fCnt,
      data,
      object
    } = payload;

    // If 'object' is missing (flattened payload), collect all extra fields into it
    if (!object) {
      const metadataFields = [
        "devEUI", "deviceName", "applicationName", "applicationID", 
        "fPort", "fCnt", "data", "timestamp", "time", "battery"
      ];
      const extraFields = {};
      Object.keys(payload).forEach(key => {
        if (!metadataFields.includes(key)) {
          extraFields[key] = payload[key];
        }
      });
      
      // If we found sensor data (like co2, temp, etc.), put it in object
      if (Object.keys(extraFields).length > 0) {
        object = extraFields;
      }
    }

    // Capture battery specifically if it's at the top level
    const battery = payload.battery || (object ? object.battery : undefined);

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
      battery,
      data, // This is usually the base64 encoded raw payload
      object, // This now contains the extracted sensor data (co2, temp, etc.)
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
