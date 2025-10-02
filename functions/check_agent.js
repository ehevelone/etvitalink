// functions/check_agent.js
const db = require("../services/db");
const crypto = require("crypto");

function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function ok(obj) {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ success: true, ...obj }),
  };
}

function fail(msg) {
  return {
    statusCode: 400,
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

    // 🔎 Look up agent by email
    const result = await db.query("SELECT * FROM agents WHERE email=$1", [email]);

    if (!result.rows.length) {
      return fail("No account found with this email.");
    }

    const agent = result.rows[0];
    const hashed = hashPassword(password);

    if (agent.password_hash !== hashed) {
      return fail("Invalid password ❌");
    }

    if (!agent.active) {
      return fail("This account has been disabled.");
    }

    return ok({
      message: "Agent login successful ✅",
      agentId: agent.id,
      email: agent.email,
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
