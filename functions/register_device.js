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

    const { email, role, deviceToken, platform } = JSON.parse(event.body || "{}");

    if (!email || !deviceToken) {
      return reply(false, { error: "Missing required fields" });
    }

    // 🔎 Look up user ID by email
    let userRes;
    if (role === "user") {
      userRes = await db.query(`SELECT id FROM users WHERE email = $1 LIMIT 1`, [email.toLowerCase()]);
    } else if (role === "agent") {
      userRes = await db.query(`SELECT id FROM agents WHERE email = $1 LIMIT 1`, [email.toLowerCase()]);
    }

    if (!userRes || !userRes.rows.length) {
      return reply(false, { error: `No ${role} found with that email` });
    }

    const userId = userRes.rows[0].id;

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
