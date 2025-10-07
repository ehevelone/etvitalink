// functions/check_agent.js
const db = require("../services/db");
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

    if (!email || !password) {
      return fail("Missing email or password.");
    }

    const result = await db.query("SELECT * FROM agents WHERE email=$1", [email]);

    if (!result.rows.length) {
      return fail("No account found with this email.");
    }

    const agent = result.rows[0];

    // ✅ Compare entered password with bcrypt hash
    const isMatch = await bcrypt.compare(password, agent.password_hash);
    if (!isMatch) {
      return fail("Invalid password ❌");
    }

    if (!agent.active) {
      return fail("This account has been disabled.");
    }

    // ✅ Send back full contact info so app can update profile
    return ok({
      message: "Agent login successful ✅",
      agentId: agent.id,
      email: agent.email,
      name: agent.name || null,
      phone: agent.phone || null,
      role: agent.role,
      active: agent.active,
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
