const RelayCommand = require("../models/RelayCommand");
const RelayStatus = require("../models/RelayStatus");

function commandMatchesReportedState(command, irrigationState, waterTankState) {
  if (command.channel === "irrigation") {
    if (irrigationState === undefined) return null;
    return command.action === "ON" ? irrigationState : !irrigationState;
  }

  if (waterTankState === undefined) return null;
  return command.action === "ON" ? waterTankState : !waterTankState;
}

// POST /api/relay/command — Dashboard sends a command to a relay
exports.sendCommand = async (req, res) => {
  try {
    const { relay_id, channel, action } = req.body;
    if (!relay_id || !channel || !action) {
      return res.status(400).json({ error: "Missing relay_id, channel, or action" });
    }
    if (!["irrigation", "water_tank"].includes(channel)) {
      return res.status(400).json({ error: "channel must be 'irrigation' or 'water_tank'" });
    }
    if (!["ON", "OFF"].includes(action.toUpperCase())) {
      return res.status(400).json({ error: "action must be 'ON' or 'OFF'" });
    }

    // Clear any existing pending commands for this specific channel to ensure the new one takes precedence
    await RelayCommand.updateMany(
      { relayId: relay_id, userId: req.user._id, channel, status: "pending" },
      { $set: { status: "overridden" } }
    );

    const command = new RelayCommand({
      relayId: relay_id,
      userId: req.user._id,
      channel,
      action: action.toUpperCase(),
    });
    await command.save();
    console.log(`[Relay] User: ${req.user.username}, Queued ${channel} ${action} for ${relay_id}`);
    res.status(201).json({ success: true, data: command });
  } catch (error) {
    res.status(500).json({ error: "Failed to queue relay command", message: error.message });
  }
};

// GET /api/relay/pending?relay_id=xxx — ESP32 polls for pending commands
exports.getPending = async (req, res) => {
  try {
    const { relay_id } = req.query;
    if (!relay_id) {
      return res.status(400).json({ error: "relay_id is required" });
    }

    const commands = await RelayCommand.find({
      relayId: relay_id,
      userId: req.user._id,
      status: "pending",
    }).sort({ timestamp: 1 });

    const ids = commands.map((c) => c._id);
    if (ids.length > 0) {
      await RelayCommand.updateMany(
        { _id: { $in: ids } },
        { $set: { status: "delivered", deliveredAt: new Date() } }
      );
    }

    res.json({ success: true, count: commands.length, data: commands });
  } catch (error) {
    res.status(500).json({ error: "Failed to get pending commands", message: error.message });
  }
};

// POST /api/relay/status — ESP32 reports its current relay states
exports.reportStatus = async (req, res) => {
  try {
    const { relay_id, irrigation_state, water_tank_state } = req.body;
    if (!relay_id) {
      return res.status(400).json({ error: "Missing relay_id" });
    }

    const irrigationState =
      irrigation_state === undefined ? undefined : Boolean(irrigation_state);
    const waterTankState =
      water_tank_state === undefined ? undefined : Boolean(water_tank_state);

    const existingStatus = await RelayStatus.findOne({
      relayId: relay_id,
      userId: req.user._id,
    });

    const status = await RelayStatus.findOneAndUpdate(
      { relayId: relay_id, userId: req.user._id },
      {
        relayId: relay_id,
        userId: req.user._id,
        irrigationState: irrigationState ?? existingStatus?.irrigationState ?? false,
        waterTankState: waterTankState ?? existingStatus?.waterTankState ?? false,
        timestamp: new Date(),
      },
      { upsert: true, new: true }
    );

    const openCommands = await RelayCommand.find({
      relayId: relay_id,
      userId: req.user._id,
      status: { $in: ["pending", "delivered"] },
    }).sort({ timestamp: 1 });

    const executedIds = [];
    const failedIds = [];

    for (const command of openCommands) {
      const matched = commandMatchesReportedState(
        command,
        irrigationState,
        waterTankState
      );

      if (matched === true) {
        executedIds.push(command._id);
      } else if (matched === false && command.status === "delivered") {
        failedIds.push(command._id);
      }
    }

    if (executedIds.length > 0) {
      await RelayCommand.updateMany(
        { _id: { $in: executedIds } },
        { $set: { status: "executed", executedAt: new Date() } }
      );
    }

    if (failedIds.length > 0) {
      await RelayCommand.updateMany(
        { _id: { $in: failedIds } },
        { $set: { status: "failed" } }
      );
    }

    console.log(`[Relay Status] User: ${req.user.username}, ${relay_id}: IR=${irrigation_state}, WT=${water_tank_state}`);
    res.json({ success: true, data: status });
  } catch (error) {
    res.status(500).json({ error: "Failed to save relay status", message: error.message });
  }
};

// GET /api/relay/status?relay_id=xxx — Dashboard gets current relay state
exports.getStatus = async (req, res) => {
  try {
    const { relay_id } = req.query;
    const matchQuery = { userId: req.user._id };
    if (relay_id) matchQuery.relayId = relay_id;

    const statuses = await RelayStatus.aggregate([
      { $match: matchQuery },
      { $sort: { timestamp: -1 } },
      { $group: {
        _id: "$relayId",
        latest: { $first: "$$ROOT" }
      }},
      { $replaceRoot: { newRoot: "$latest" } }
    ]);

    res.json({ success: true, data: statuses });
  } catch (error) {
    res.status(500).json({ error: "Failed to get relay status", message: error.message });
  }
};
