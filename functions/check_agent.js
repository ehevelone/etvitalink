// functions/check_agent.js
// ✅ Netlify + Mobile SAFE version (base64-aware)

const db = require("./services/db");
const bcrypt = require("bcryptjs");

function reply(success, obj = {}, code = 200) {
  return {
    statusCode: code,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ success, ...obj }),
  };
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return reply(false, { error: "Method Not Allowed" }, 405);
    }

    // ✅ SAFE BODY PARSING (REQUIRED FOR FLUTTER)
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

    const { email, password } = body;
    console.log("🔍 Incoming agent login:", { email });

    if (!email || !password) {
      return reply(false, {
        error: "Missing email or password.",
        received: body, // 🔍 TEMP DEBUG (remove later)
      });
    }

    // ✅ Case-insensitive lookup
    const result = await db.query(
      `
      SELECT id, email, name, phone, npn, role, active, password_hash
      FROM public.agents
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1
      `,
      [email.trim()]
    );

    if (!result.rows.length) {
      return reply(false, { error: "No account found with this email." });
    }

    const agent = result.rows[0];

    if (!agent.password_hash) {
      console.error("❌ Missing password hash for agent:", agent.id);
      return reply(false, {
        error: "Agent account not set up correctly. Contact support.",
      });
    }

    // ✅ Verify password
    const isMatch = await bcrypt.compare(password, agent.password_hash);
    if (!isMatch) {
      return reply(false, { error: "Invalid password ❌" });
    }

    if (!agent.active) {
      return reply(false, { error: "This account has been disabled." });
    }

    // ✅ SUCCESS
    return reply(true, {
      message: "Agent login successful ✅",
      agent: {
        id: agent.id,
        email: agent.email,
        name: agent.name || null,
        phone: agent.phone || null,
        npn: agent.npn || null,
        role: agent.role || "agent",
        active: agent.active,
      },
    });

  } catch (err) {
    console.error("❌ check_agent fatal error:", err);
    return reply(false, { error: "Server error" }, 500);
  }
};
