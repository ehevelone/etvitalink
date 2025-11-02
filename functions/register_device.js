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
      return reply(false, { error: "Method Not Allowed" });
    }

    const { email, role, deviceToken, platform } = JSON.parse(event.body || "{}");

    if (!email || !deviceToken || !role) {
      return reply(false, { error: "Missing required fields (email, deviceToken, role)" });
    }

    console.log("📲 Incoming registration:", { email, role, platform });

    // 🔍 1. Find matching ID in correct table
    let lookupQuery;
    if (role === "user") {
      lookupQuery = `SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`;
    } else if (role === "agent") {
      lookupQuery = `SELECT id FROM agents WHERE LOWER(email) = LOWER($1) LIMIT 1`;
    } else {
      return reply(false, { error: `Invalid role: ${role}` });
    }

    const res = await db.query(lookupQuery, [email]);
    if (!res || res.rows.length === 0) {
      return reply(false, { error: `No ${role} found with that email` });
    }

    const entityId = res.rows[0].id;
    const idField = role === "agent" ? "agent_id" : "user_id";
    console.log("🧩 Linking device to:", { idField, entityId });

    // 🔧 2. Insert or update device row
    const upsertQuery = `
      INSERT INTO user_devices (${idField}, device_token, platform, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      ON CONFLICT (device_token)
      DO UPDATE
        SET updated_at = NOW(),
            platform = EXCLUDED.platform,
            ${idField} = EXCLUDED.${idField}
      RETURNING id, ${idField}, device_token, platform, updated_at;
    `;

    const result = await db.query(upsertQuery, [entityId, deviceToken, platform || null]);

    console.log("✅ Device registered or updated:", result.rows[0]);

    return reply(true, {
      message: `Device registered for ${role} ✅`,
      device: result.rows[0],
    });
  } catch (err) {
    console.error("❌ register_device error:", err);
    return reply(false, { error: "Server error: " + err.message });
  }
};
