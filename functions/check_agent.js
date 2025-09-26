// functions/check_agent.js
const db = require("./services/db");

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
    const { username, password } = JSON.parse(event.body || "{}");

    if (!username || !password) {
      return fail("Missing username or password");
    }

    // Look up agent in DB
    const result = await db.query(
      "SELECT id, username, role, active, password FROM agents WHERE username=$1 AND password=$2",
      [username, password]
    );

    if (!result.rows.length) {
      return fail("Invalid credentials ❌");
    }

    const row = result.rows[0];

    if (!row.active) {
      return fail("Agent account disabled ❌");
    }

    return ok({
      message: "Agent login successful ✅",
      agentId: row.id,
      username: row.username,
      role: row.role || "agent", // default to "agent" if null
      active: row.active,
    });
  } catch (err) {
    console.error("❌ check_agent error:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: false, error: err.message }),
    };
  }
};
