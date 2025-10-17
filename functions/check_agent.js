// functions/check_agent.js
console.log("SUPABASE_URL from env:", process.env.SUPABASE_URL);

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
    console.log("🔍 Incoming login attempt:", { email, password });

    if (!email || !password) {
      return fail("Missing email or password.");
    }

    // query database
    const result = await db.query("SELECT * FROM agents WHERE email=$1", [email]);
    console.log("🔍 DB Result:", result.rows);

    if (!result.rows.length) {
      return fail("No account found with this email.");
    }

    const agent = result.rows[0];
    console.log("🔍 Stored hash:", agent.password_hash);

    // compare password
    const isMatch = await bcrypt.compare(password, agent.password_hash);
    console.log("🔑 Compare result:", isMatch);

    if (!isMatch) {
      return fail("Invalid password ❌");
    }

    if (!agent.active) {
      return fail("This account has been disabled.");
    }

    return ok({
      message: "Agent login successful ✅",
      agent: {
        id: agent.id,
        email: agent.email,
        name: agent.name || null,
        phone: agent.phone || null,
        npn: agent.npn || null,
        role: agent.role,
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
