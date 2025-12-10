// functions/reset_password.js
const db = require("./services/db");
const bcrypt = require("bcryptjs");

function reply(statusCode, obj) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
    },
    body: JSON.stringify(obj),
  };
}

exports.handler = async (event) => {
  try {
    // ✅ Handle CORS preflight
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

    // ✅ Safe body parsing (Flutter + Netlify)
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
      return reply(400, {
        success: false,
        error: "Invalid request body",
      });
    }

    const { emailOrPhone, code, newPassword } = body;

    if (!emailOrPhone || !code || !newPassword) {
      return reply(400, {
        success: false,
        error: "Missing required fields ❌",
      });
    }

    // 🔎 Lookup account (case-insensitive)
    let user, table;

    const agentRes = await db.query(
      `
      SELECT id, email, reset_code, reset_expires
      FROM agents
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1
      `,
      [emailOrPhone.trim()]
    );

    if (agentRes.rows.length) {
      user = agentRes.rows[0];
      table = "agents";
    } else {
      const userRes = await db.query(
        `
        SELECT id, email, reset_code, reset_expires
        FROM users
        WHERE LOWER(email) = LOWER($1)
        LIMIT 1
        `,
        [emailOrPhone.trim()]
      );

      if (userRes.rows.length) {
        user = userRes.rows[0];
        table = "users";
      }
    }

    if (!user) {
      return reply(404, {
        success: false,
        error: "No account found for this email ❌",
      });
    }

    // ✅ Validate reset code
    if (user.reset_code !== code) {
      return reply(400, {
        success: false,
        error: "Invalid reset code ❌",
      });
    }

    // ✅ Validate expiration
    if (!user.reset_expires || new Date(user.reset_expires) < new Date()) {
      return reply(400, {
        success: false,
        error: "Reset code expired ❌",
      });
    }

    // 🔐 Hash new password
    const hashed = await bcrypt.hash(newPassword, 10);

    // ✅ Update password + clear reset fields
    await db.query(
      `
      UPDATE ${table}
      SET password_hash = $1,
          reset_code = NULL,
          reset_expires = NULL
      WHERE id = $2
      `,
      [hashed, user.id]
    );

    console.log(`✅ Password reset for ${user.email} (${table})`);

    return reply(200, {
      success: true,
      message: "Password reset successful ✅",
      role: table,
      email: user.email,
    });

  } catch (err) {
    console.error("❌ reset_password error:", err);
    return reply(500, {
      success: false,
      error: "Server error during password reset ❌",
    });
  }
};
