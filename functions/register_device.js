// functions/register_device.js
const db = require("../services/db");

function reply(success, obj = {}) {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ success, ...obj }),
  };
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Method Not Allowed" }),
      };
    }

    const { userId, deviceToken, platform } = JSON.parse(event.body || "{}");

    if (!userId || !deviceToken) {
      return reply(false, { error: "Missing required fields" });
    }

    // ✅ Upsert device by token
    const result = await db.query(
      `INSERT INTO user_devices (user_id, device_token, platform, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       ON CONFLICT (device_token) DO UPDATE 
         SET updated_at = NOW(),
             platform = EXCLUDED.platform,
             user_id = EXCLUDED.user_id
       RETURNING id, user_id, device_token, platform`,
      [userId, deviceToken, platform || null]
    );

    return reply(true, {
      message: "Device registered ✅",
      device: result.rows[0],
    });
  } catch (err) {
    console.error("❌ register_device error:", err);
    return reply(false, { error: "Server error: " + err.message });
  }
};
