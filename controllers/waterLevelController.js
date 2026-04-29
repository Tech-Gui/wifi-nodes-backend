const WaterLevel = require("../models/WaterLevel");
const automationService = require("../services/automationService");
const Sensor = require("../models/Sensor");
const { calculateVolumeAtHeight } = require("../utils/tankMath");

exports.create = async (req, res) => {
  try {
    const { sensor_id, value } = req.body;
    if (!sensor_id || value === undefined) {
      return res.status(400).json({ error: "Missing sensor_id or value" });
    }
    const reading = new WaterLevel({ sensorId: sensor_id, userId: req.user._id, value });
    await reading.save();
    console.log(`[Water Level] User: ${req.user.username}, Sensor: ${sensor_id}, Value: ${value}cm`);
    
    // Trigger automation check
    await automationService.checkAndTriggerAutomation("water_level", sensor_id, req.user._id, value);
    
    res.status(201).json({ success: true, data: reading });
  } catch (error) {
    res.status(500).json({ error: "Failed to save water level reading", message: error.message });
  }
};

exports.getLatest = async (req, res) => {
  try {
    const { sensor_id } = req.query;
    const query = { userId: req.user._id };
    if (sensor_id) query.sensorId = sensor_id;
    const reading = await WaterLevel.findOne(query).sort({ timestamp: -1 });
    if (!reading) return res.json({ success: true, data: null });
    res.json({ success: true, data: reading });
  } catch (error) {
    res.status(500).json({ error: "Failed to get latest water level", message: error.message });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const { sensor_id, limit = 100 } = req.query;
    const query = { userId: req.user._id };
    if (sensor_id) query.sensorId = sensor_id;
    const readings = await WaterLevel.find(query).sort({ timestamp: -1 }).limit(parseInt(limit));
    res.json({ success: true, count: readings.length, data: readings });
  } catch (error) {
    res.status(500).json({ error: "Failed to get water level history", message: error.message });
  }
};

exports.getUsage = async (req, res) => {
  try {
    const { sensor_id, days = 7 } = req.query;
    if (!sensor_id) {
      return res.status(400).json({ error: "Missing sensor_id" });
    }

    const sensor = await Sensor.findOne({ sensorId: sensor_id, userId: req.user._id });
    if (!sensor) {
      return res.status(404).json({ error: "Sensor not found" });
    }

    const tankHeightCm = sensor.tankHeightCm || 100;
    const sf = sensor.calibScaleFactor || 1.0;
    const fullRef = sensor.calibFullReading || 0;
    const hasCalib = sf !== 1.0 || fullRef !== 0;

    const numDays = parseInt(days);
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - numDays);

    const readings = await WaterLevel.find({
      sensorId: sensor_id,
      userId: req.user._id,
      timestamp: { $gte: fromDate }
    }).sort({ timestamp: 1 });

    const dailyUsage = {};
    const daysMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const result = [];
    
    // Initialize days in order
    for (let i = numDays - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const is7Days = numDays <= 7;
      const key = is7Days 
        ? daysMap[d.getDay()] 
        : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      if (dailyUsage[key] === undefined) {
        dailyUsage[key] = 0;
        result.push({ name: key, usage: 0 });
      }
    }

    let prevVolume = null;

    for (const r of readings) {
      let sensorDistance = r.value;
      if (hasCalib) {
        sensorDistance = (sensorDistance - fullRef) * sf;
        if (sensorDistance < 0) sensorDistance = 0;
        if (sensorDistance > tankHeightCm) sensorDistance = tankHeightCm;
      }
      
      const waterHeight = Math.max(0, tankHeightCm - sensorDistance);
      const currentVolume = calculateVolumeAtHeight(sensor, waterHeight);

      if (prevVolume !== null) {
        if (currentVolume < prevVolume) {
          const drop = prevVolume - currentVolume;
          // Ignore tiny fluctuations (noise threshold: 1 Liter)
          if (drop >= 1) {
            const is7Days = numDays <= 7;
            const key = is7Days 
              ? daysMap[r.timestamp.getDay()] 
              : r.timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            
            if (dailyUsage[key] !== undefined) {
              dailyUsage[key] += drop;
            }
          }
        }
      }
      prevVolume = currentVolume;
    }

    // Map calculated usage back to result array
    for (const item of result) {
      item.usage = Math.round(dailyUsage[item.name]);
    }

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: "Failed to calculate water usage", message: error.message });
  }
};
