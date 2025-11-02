// functions/register_device.js
console.log("⚙️ register_device build v2.3.1");

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

    // 🔍 Lookup for correct ID
    const lookupQuery =
      role === "agent"
        ? `SELECT id FROM agents WHERE LOWER(email) = LOWER($1) LIMIT 1`
        : `SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`;

    const found = await db.query(lookupQuery, [email]);
    if (!found.rows.length) {
      return reply(false, { error: `No ${role} found with that email` });
    }

    const entityId = found.rows[0].id;
    const idField = role === "agent" ? "agent_id" : "user_id";

    console.log(`🧩 Linking device → ${role} (${idField}=${entityId})`);

    // ✅ Use column-based conflict target — guaranteed valid
    const upsert = await db.query(
      `
      INSERT INTO user_devices (${idField}, device_token, platform, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      ON CONFLICT (device_token)
      DO UPDATE
        SET updated_at = NOW(),
            platform = EXCLUDED.platform,
            ${idField} = EXCLUDED.${idField}
      RETURNING id, ${idField}, device_token, platform;
      `,
      [entityId, deviceToken, platform || null]
    );

    console.log("✅ Device registered:", upsert.rows[0]);
    return reply(true, {
      message: `Device registered for ${role} ✅`,
      device: upsert.rows[0],
    });
  } catch (err) {
    console.error("❌ register_device error:", err);
    return reply(false, { error: "Server error: " + err.message });
  }
};
