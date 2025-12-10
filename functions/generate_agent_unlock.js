// functions/generate_agent_unlock.js
const db = require("./services/db");
const crypto = require("crypto");

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

function generateUnlockCode(prefix = "AG", length = 8) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${code}`;
}

exports.handler = async (event) => {
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

    // ✅ Safe body parsing
    let body = {};
    try {
      body = event.isBase64Encoded
        ? JSON.parse(Buffer.from(event.body, "base64").toString("utf8"))
        : JSON.parse(event.body || "{}");
    } catch {
      return reply(400, {
        success: false,
        error: "Invalid request body",
      });
    }

    const { masterKey } = body;

    // ✅ Verify master key
    if (!masterKey || masterKey !== process.env.MASTER_AGENT_KEY) {
      return reply(403, {
        success: false,
        error: "Unauthorized request",
      });
    }

    // ✅ Generate unlock code
    const unlockCode = generateUnlockCode();

    // ✅ Insert placeholder agent
    const result = await db.query(
      `
      INSERT INTO agents (
        email,
        password_hash,
        role,
        active,
        npn,
        unlock_code,
        created_at
      )
      VALUES (
        NULL,
        NULL,
        'agent',
        FALSE,
        NULL,
        $1,
        NOW()
      )
      RETURNING id, unlock_code;
      `,
      [unlockCode]
    );

    return reply(200, {
      success: true,
      agentId: result.rows[0].id,
      unlockCode: result.rows[0].unlock_code,
    });

  } catch (err) {
    console.error("❌ generate_agent_unlock error:", err);
    return reply(500, {
      success: false,
      error: "Server error generating agent unlock ❌",
    });
  }
};
