// functions/check_agent.js
// ✅ Mobile-safe + CORS-safe + base64-safe

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
    // ✅ HANDLE PREFLIGHT
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

    const { email, password } = body;
    console.log("🔍 Agent login attempt:", email);

    if (!email || !password) {
      return reply(false, { error: "Missing email or password." });
    }

    // ✅ Lookup agent (case-insensitive)
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
      return reply(false, {
        error: "Agent account not set up correctly.",
      });
    }

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
        name: agent.name,
        phone: agent.phone,
        npn: agent.npn,
        role: agent.role || "agent",
        active: agent.active,
      },
    });

  } catch (err) {
    console.error("❌ check_agent error:", err);
    return reply(false, { error: "Server error" }, 500);
  }
};
