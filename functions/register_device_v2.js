// functions/register_device_v2.js
const db = require("./services/db");

function reply(statusCode, obj) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
    body: JSON.stringify(obj),
  };
}

exports.handler = async (event) => {
  console.log("🚀 register_device_v2 active");

  try {
    // ✅ CORS preflight
    if (event.httpMethod === "OPTIONS") {
      return reply(200, {});
    }

    // ✅ Enforce POST
    if (event.httpMethod === "OPTIONS") {
  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
    body: "",
  };
}

if (event.httpMethod !== "POST") {
      return reply(405, {
        success: false,
        error: "Method Not Allowed",
      });
    }

    // ✅ SAFE body parsing (Flutter + Netlify)
    let body = {};
    try {
      if (event.isBase64Encoded) {
        body = JSON.parse(
          Buffer.from(event.body, "base64").toString("utf8")
        );
      } else {
        body = JSON.parse(event.body || "{}");
      }
    } catch (e) {
      console.error("❌ Body parse error:", e);
      return reply(400, {
        success: false,
        error: "Invalid request body",
      });
    }

    const { email, role, deviceToken, platform } = body;

    if (!email || !deviceToken || !role) {
      return reply(400, {
        success: false,
        error: "Missing required fields (email, deviceToken, role)",
      });
    }

    console.log("📲 Device registration:", {
      email,
      role,
      platform,
      token: deviceToken.slice(0, 10) + "...",
    });

    // ✅ Lookup agent or user
    const lookupQuery =
      role === "agent"
        ? `SELECT id FROM agents WHERE LOWER(email) = LOWER($1) LIMIT 1`
        : `SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`;

    const lookup = await db.query(lookupQuery, [email.trim()]);

    if (!lookup.rows.length) {
      return reply(404, {
        success: false,
        error: `No ${role} found with that email`,
      });
    }

    const entityId = lookup.rows[0].id;
    const idField = role === "agent" ? "agent_id" : "user_id";

    // ✅ Check for existing device token
    const existing = await db.query(
      `SELECT id FROM user_devices WHERE device_token = $1 LIMIT 1`,
      [deviceToken]
    );

    if (existing.rows.length) {
      // 🔄 Update existing device
      const updated = await db.query(
        `
        UPDATE user_devices
        SET ${idField} = $1,
            platform = $2,
            updated_at = NOW()
        WHERE device_token = $3
        RETURNING id, ${idField}, device_token, platform;
        `,
        [entityId, platform || "android", deviceToken]
      );

      console.log("♻️ Device updated:", updated.rows[0]);

      return reply(200, {
        success: true,
        message: `Device updated for ${role} ♻️`,
        device: updated.rows[0],
      });
    }

    // ✅ Insert new device
    const inserted = await db.query(
      `
      INSERT INTO user_devices (${idField}, device_token, platform, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      RETURNING id, ${idField}, device_token, platform;
      `,
      [entityId, deviceToken, platform || "android"]
    );

    console.log("✅ New device registered:", inserted.rows[0]);

    return reply(200, {
      success: true,
      message: `Device registered for ${role} ✅`,
      device: inserted.rows[0],
    });

  } catch (err) {
    console.error("❌ register_device_v2 error:", err);
    return reply(500, {
      success: false,
      error: "Server error while registering device ❌",
    });
  }
};
