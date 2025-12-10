// functions/check_user.js
// ✅ Netlify + Android + iOS safe

const db = require("./services/db");
const bcrypt = require("bcryptjs");

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function reply(success, obj = {}, code = 200) {
  return {
    statusCode: code,
    headers,
    body: JSON.stringify({ success, ...obj }),
  };
}

exports.handler = async (event) => {
  try {
    // ✅ HANDLE PREFLIGHT (THIS WAS MISSING)
    if (event.httpMethod === "OPTIONS") {
      return {
        statusCode: 200,
        headers,
        body: "",
      };
    }

    if (event.httpMethod !== "POST") {
      return reply(false, { error: "Method Not Allowed" }, 405);
    }

    // ✅ SAFE BODY PARSING
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
      return reply(false, { error: "Invalid request body" }, 400);
    }

    const { email, password, platform } = body;

    if (!email || !password) {
      return reply(false, {
        error: "Email and password required",
        received: body, // ✅ TEMP DEBUG
      });
    }

    const result = await db.query(
      `
      SELECT id, first_name, last_name, email, password_hash, agent_id, purchase_code
      FROM public.users
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1
      `,
      [email.trim()]
    );

    if (!result.rows.length) {
      return reply(false, { error: "User not found" });
    }

    const user = result.rows[0];

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return reply(false, { error: "Invalid password ❌" });
    }

    // ✅ Verify agent subscription
    if (user.agent_id) {
      const agentCheck = await db.query(
        `SELECT subscription_valid FROM public.agents WHERE id = $1 LIMIT 1`,
        [user.agent_id]
      );

      if (!agentCheck.rows.length || !agentCheck.rows[0].subscription_valid) {
        return reply(false, {
          error: "Account inactive — contact agent",
        });
      }
    }

    // ✅ Register device
    await db.query(
      `
      INSERT INTO public.user_devices (user_id, platform, created_at, updated_at)
      VALUES ($1, $2, NOW(), NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET platform = EXCLUDED.platform, updated_at = NOW()
      `,
      [user.id, platform || "unknown"]
    );

    return reply(true, {
      message: "Login successful ✅",
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        agent_id: user.agent_id,
        purchase_code: user.purchase_code,
      },
    });

  } catch (err) {
    console.error("❌ check_user error:", err);
    return reply(false, { error: "Server error" }, 500);
  }
};
