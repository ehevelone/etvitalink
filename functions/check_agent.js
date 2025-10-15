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

    // 🔎 Debugging output
    console.log("DEBUG login attempt for:", email);
    console.log("DEBUG entered password:", password);
    console.log("DEBUG hash in DB:", agent.password_hash);
    
    // Compare entered password with bcrypt hash
    const isMatch = await bcrypt.compare(password, agent.password_hash);
    console.log("DEBUG bcrypt compare result:", isMatch);

    if (!isMatch) {
      return fail("Invalid password ❌");
    }

    if (!agent.active) {
      return fail("This account has been disabled.");
    }

    // ✅ Wrap inside agent object (Flutter expects this format)
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
      }
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
