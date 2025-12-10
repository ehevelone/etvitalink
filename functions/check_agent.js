// functions/check_agent.js
// 🚀 Updated 2025-10-16 with case-insensitive email match + safer handling

const db = require("./services/db");
const bcrypt = require("bcryptjs");

function ok(obj) {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ success: true, ...obj }),
  };
}

function fail(msg, code = 400) {
  return {
    statusCode: code,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ success: false, error: msg }),
  };
}

exports.handler = async (event) => {
  try {
    const { email, password } = JSON.parse(event.body || "{}");
    console.log("🔍 Incoming agent login attempt:", { email });

    if (!email || !password) {
      return fail("Missing email or password.");
    }

    // ✅ Case-insensitive email lookup
    const result = await db.query(
      "SELECT * FROM agents WHERE LOWER(email) = LOWER($1)",
      [email.trim()]
    );
    console.log("🔍 DB result count:", result.rows.length);

    if (!result.rows.length) {
      return fail("No account found with this email.");
    }

    const agent = result.rows[0];
    console.log("🔍 Agent ID:", agent.id, "Active:", agent.active);

    // ✅ Handle missing password_hash gracefully
    if (!agent.password_hash) {
      console.error("❌ No password hash found for agent:", agent.id);
      return fail("Agent account not set up correctly. Contact support.");
    }

    // ✅ Compare password
    const isMatch = await bcrypt.compare(password, agent.password_hash);
    console.log("🔑 Compare result:", isMatch);

    if (!isMatch) {
      return fail("Invalid password ❌");
    }

    if (!agent.active) {
      return fail("This account has been disabled.");
    }

    // ✅ Return clean agent object (no password hash ever sent back)
    return ok({
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
    console.error("❌ check_agent error:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        success: false,
        error: "Server error: " + err.message,
      }),
    };
  }
};
