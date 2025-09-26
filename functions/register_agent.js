// functions/register_agent.js
const db = require("./services/db");
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
      return fail("Missing email or password");
    }

    // Hash password before storing
    const passwordHash = hashPassword(password);

    // Insert agent into DB
    const result = await db.query(
      `INSERT INTO agents (email, password_hash, role, active)
       VALUES ($1, $2, 'agent', true)
       RETURNING id, email, role, active`,
      [email, passwordHash]
    );

    const row = result.rows[0];

    return ok({
      message: "Agent registered successfully ✅",
      agentId: row.id,
      email: row.email,
      role: row.role,
      active: row.active,
    });
  } catch (err) {
    console.error("❌ register_agent error:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: false, error: err.message }),
    };
  }
};
