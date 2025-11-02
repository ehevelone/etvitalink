// functions/register_device.js
const db = require("../services/db");

// ✅ Consistent JSON replies
function reply(success, obj = {}) {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ success, ...obj }),
  };
}

exports.handler = async (event) => {
  try {
    // --- Safety check ---
    if (event.httpMethod !== "POST") {
      return reply(false, { error: "Method Not Allowed" });
    }

    // --- Parse and validate incoming body ---
    const { email, role, deviceToken, platform } = JSON.parse(event.body || "{}");
    if (!email || !deviceToken || !role) {
      return reply(false, {
        error: "Missing required fields (email, deviceToken, role)",
      });
    }

    console.log("📲 Incoming registration:", { email, role, platform });

    // --- 1️⃣ Look up account ID ---
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
    console.log("🧩 Linking device:", { idField, entityId });

    // --- 2️⃣ Upsert into user_devices ---
    const upsertQuery = `
      INSERT INTO user_devices (${idField}, device_token, platform, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      ON CONFLICT (device_token)
      DO UPDATE
        SET updated_at = NOW(),
            platform = EXCLUDED.platform,
            ${idField} = EXCLUDED.${idField}
      RETURNING device_token, ${idField}, platform, updated_at;
    `;
    const upsertRes = await db.query(upsertQuery, [
      entityId,
      deviceToken,
      platform || null,
    ]);

    console.log("✅ Device row updated:", upsertRes.rows[0]);

    // --- 3️⃣ Sync latest token to main table ---
    if (role === "user") {
      await db.query(
        `UPDATE users SET device_token = $1, updated_at = NOW() WHERE id = $2`,
        [deviceToken, entityId]
      );
    } else if (role === "agent") {
      await db.query(
        `UPDATE agents SET device_token = $1, updated_at = NOW() WHERE id = $2`,
        [deviceToken, entityId]
      );
    }

    console.log("🔄 Token synced to main table:", { role, entityId });

    // --- 4️⃣ Return success ---
    return reply(true, {
      message: `Device registered and synced for ${role} ✅`,
      device: upsertRes.rows[0],
    });
  } catch (err) {
    console.error("❌ register_device error:", err);
    return reply(false, { error: "Server error: " + err.message });
  }
};
