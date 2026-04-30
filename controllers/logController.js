const AutomationLog = require("../models/AutomationLog");

exports.getAutomationLogs = async (req, res) => {
  try {
    const logs = await AutomationLog.find({ userId: req.user._id })
      .sort({ timestamp: -1 })
      .limit(50);
    res.json({ success: true, data: logs });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch automation logs", message: err.message });
  }
};
