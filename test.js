/*
 * Test script for wifi-nodes-backend
 * Simulates the full flow: register user → register sensors → send data → query data → relay commands
 */

const BASE = "http://localhost:8080";

async function request(method, path, body = null, apiKey = null) {
  const headers = { "Content-Type": "application/json" };
  if (apiKey) headers["x-api-key"] = apiKey;

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE}${path}`, opts);
  const data = await res.json();
  const status = res.status;
  const icon = status < 300 ? "✅" : "❌";
  console.log(`${icon} ${method} ${path} → ${status}`);
  if (status >= 400) console.log("   ", JSON.stringify(data));
  return { status, data };
}

async function run() {
  console.log("═══════════════════════════════════════");
  console.log("  wifi-nodes-backend  —  Full Test Run");
  console.log("═══════════════════════════════════════\n");

  // ── 1. Health checks ──
  console.log("── Health Checks ──");
  await request("GET", "/health");
  await request("GET", "/ready");

  // ── 2. Register user ──
  console.log("\n── User Registration ──");
  const regRes = await request("POST", "/api/auth/register", {
    username: "testuser_" + Date.now(),
    email: `test_${Date.now()}@example.com`,
    password: "testpass123",
  });
  const apiKey = regRes.data?.data?.apiKey;
  if (!apiKey) {
    console.log("❌ FATAL: No API key returned. Aborting.");
    process.exit(1);
  }
  console.log(`   API Key: ${apiKey.substring(0, 20)}...`);

  // ── 3. Register sensors ──
  console.log("\n── Register Sensors ──");
  const envSensor = "ESP32_AABBCCDDEEFF";
  const soilSensor = "ESP32_112233445566";
  const relaySensor = "ESP32_FFEEDDCCBBAA";

  await request("POST", "/api/sensors/register", { sensor_id: envSensor, type: "env_waterlevel", name: "Greenhouse Env" }, apiKey);
  await request("POST", "/api/sensors/register", { sensor_id: soilSensor, type: "soil_moisture", name: "Field A Soil" }, apiKey);
  await request("POST", "/api/sensors/register", { sensor_id: relaySensor, type: "dual_relay", name: "Pump Controller" }, apiKey);

  // List sensors
  const listRes = await request("GET", "/api/sensors", null, apiKey);
  console.log(`   Registered sensors: ${listRes.data?.count}`);

  // ── 4. Send sensor readings ──
  console.log("\n── Send Sensor Readings ──");
  await request("POST", "/api/temperature", { sensor_id: envSensor, value: 24.5 }, apiKey);
  await request("POST", "/api/temperature", { sensor_id: envSensor, value: 25.1 }, apiKey);
  await request("POST", "/api/humidity", { sensor_id: envSensor, value: 62.3 }, apiKey);
  await request("POST", "/api/humidity", { sensor_id: envSensor, value: 61.8 }, apiKey);
  await request("POST", "/api/water-level", { sensor_id: envSensor, value: 15.2 }, apiKey);
  await request("POST", "/api/soil-moisture", { sensor_id: soilSensor, value: 45.7 }, apiKey);
  await request("POST", "/api/soil-moisture", { sensor_id: soilSensor, value: 44.2 }, apiKey);

  // ── 5. Query readings ──
  console.log("\n── Query Readings ──");
  await request("GET", `/api/temperature/latest?sensor_id=${envSensor}`, null, apiKey);
  await request("GET", `/api/temperature/history?sensor_id=${envSensor}&limit=5`, null, apiKey);
  await request("GET", `/api/humidity/latest?sensor_id=${envSensor}`, null, apiKey);
  await request("GET", `/api/water-level/latest?sensor_id=${envSensor}`, null, apiKey);
  await request("GET", `/api/soil-moisture/latest?sensor_id=${soilSensor}`, null, apiKey);
  await request("GET", `/api/soil-moisture/history?sensor_id=${soilSensor}&limit=5`, null, apiKey);

  // ── 6. Relay commands ──
  console.log("\n── Relay Commands ──");
  await request("POST", "/api/relay/command", { relay_id: relaySensor, channel: "irrigation", action: "ON" }, apiKey);
  await request("POST", "/api/relay/command", { relay_id: relaySensor, channel: "water_tank", action: "ON" }, apiKey);

  // ESP32 polls for pending commands
  const pendingRes = await request("GET", `/api/relay/pending?relay_id=${relaySensor}`, null, apiKey);
  console.log(`   Pending commands: ${pendingRes.data?.count}`);

  // ESP32 reports status
  await request("POST", "/api/relay/status", { relay_id: relaySensor, irrigation_state: true, water_tank_state: true }, apiKey);

  // Dashboard reads status
  await request("GET", `/api/relay/status?relay_id=${relaySensor}`, null, apiKey);

  // ── 7. Multi-tenancy isolation test ──
  console.log("\n── Multi-Tenancy Isolation ──");
  const reg2 = await request("POST", "/api/auth/register", {
    username: "other_user_" + Date.now(),
    email: `other_${Date.now()}@example.com`,
    password: "otherpass",
  });
  const otherKey = reg2.data?.data?.apiKey;

  // Other user should NOT see first user's data
  const otherTemp = await request("GET", `/api/temperature/latest?sensor_id=${envSensor}`, null, otherKey);
  if (otherTemp.status === 403 || otherTemp.status === 404) {
    console.log("   ✅ Isolation confirmed — other user cannot see first user's data");
  } else {
    console.log("   ⚠️  Isolation check — status: " + otherTemp.status);
  }

  // ── 8. Auth edge cases ──
  console.log("\n── Auth Edge Cases ──");
  await request("POST", "/api/temperature", { sensor_id: envSensor, value: 20 }); // No API key
  await request("POST", "/api/temperature", { sensor_id: envSensor, value: 20 }, "bad_key_12345"); // Wrong key

  console.log("\n═══════════════════════════════════════");
  console.log("  All tests completed!");
  console.log("═══════════════════════════════════════");
}

run().catch((err) => {
  console.error("Test script failed:", err.message);
  process.exit(1);
});
