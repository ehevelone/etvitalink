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

    console.log("📲 register_device incoming:", { email, role, platform });

    // 🔍 Look up user or agent ID
    const lookupQuery =
      role === "agent"
        ? `SELECT id FROM agents WHERE LOWER(email) = LOWER($1) LIMIT 1`
        : `SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`;

    const result = await db.query(lookupQuery, [email]);
    if (!result.rows.length) {
      return reply(false, { error: `No ${role} found with that email` });
    }

    const entityId = result.rows[0].id;
    const idField = role === "agent" ? "agent_id" : "user_id";

    console.log(`🧩 Linking device → ${role} (${idField}=${entityId})`);

    // ✅ Proper upsert using the actual constraint name in Postgres
    const insertResult = await db.query(
      `
      INSERT INTO user_devices (${idField}, device_token, platform, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      ON CONFLICT ON CONSTRAINT user_devices_device_token_key
      DO UPDATE
        SET updated_at = NOW(),
            platform = EXCLUDED.platform,
            ${idField} = EXCLUDED.${idField}
      RETURNING id, ${idField}, device_token, platform;
      `,
      [entityId, deviceToken, platform || null]
    );

    return reply(true, {
      message: `Device registered for ${role} ✅`,
      device: insertResult.rows[0],
    });
  } catch (err) {
    console.error("❌ register_device error:", err);
    return reply(false, { error: "Server error: " + err.message });
  }
};
