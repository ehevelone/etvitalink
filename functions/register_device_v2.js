// functions/register_device_v2.js
const db = require("../services/db");

function reply(success, obj = {}) {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ success, ...obj }),
  };
}

exports.handler = async (event) => {
  console.log("🚀 register_device_v2.js active build v3.2");

  try {
    if (event.httpMethod !== "POST") {
      return reply(false, { error: "Method Not Allowed" });
    }

    const { email, role, deviceToken, platform } = JSON.parse(event.body || "{}");

    if (!email || !deviceToken || !role) {
      return reply(false, { error: "Missing required fields (email, deviceToken, role)" });
    }

    console.log("📲 register_device incoming:", { email, role, platform });

    // 🔍 Lookup account
    const lookupQuery =
      role === "agent"
        ? `SELECT id FROM agents WHERE LOWER(email) = LOWER($1) LIMIT 1`
        : `SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`;

    const res = await db.query(lookupQuery, [email]);
    if (!res.rows.length) return reply(false, { error: `No ${role} found with that email` });

    const entityId = res.rows[0].id;
    const idField = role === "agent" ? "agent_id" : "user_id";

    // 🧠 Manual merge (no conflict constraint issues)
    const existing = await db.query(
      `SELECT id FROM user_devices WHERE device_token = $1 LIMIT 1`,
      [deviceToken]
    );

    if (existing.rows.length) {
      // Update
      const updated = await db.query(
        `
        UPDATE user_devices
        SET ${idField} = $1,
            platform = $2,
            updated_at = NOW()
        WHERE device_token = $3
        RETURNING id, ${idField}, device_token, platform;
        `,
        [entityId, platform || null, deviceToken]
      );

      console.log("♻️ Updated existing device:", updated.rows[0]);
      return reply(true, {
        message: `Device updated for ${role} ♻️`,
        device: updated.rows[0],
      });
    } else {
      // Insert
      const inserted = await db.query(
        `
        INSERT INTO user_devices (${idField}, device_token, platform, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
        RETURNING id, ${idField}, device_token, platform;
        `,
        [entityId, deviceToken, platform || null]
      );

      console.log("✅ New device added:", inserted.rows[0]);
      return reply(true, {
        message: `Device registered for ${role} ✅`,
        device: inserted.rows[0],
      });
    }
  } catch (err) {
    console.error("❌ register_device_v2 error:", err);
    return reply(false, { error: "Server error: " + err.message });
  }
};
