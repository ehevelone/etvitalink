// functions/claim_agent_unlock.js
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
    if (event.httpMethod !== "POST") {
      return fail("Method not allowed", 405);
    }

    const { unlockCode, email, password, npn, phone, name } = JSON.parse(event.body || "{}");

    if (!unlockCode || !email || !password || !npn) {
      return fail("Unlock code, email, password, and NPN are required.");
    }

    // 1. Look up placeholder agent row
    const existing = await db.query(
      `SELECT id, active FROM agents WHERE unlock_code = $1`,
      [unlockCode]
    );

    if (existing.rows.length === 0) {
      return fail("Invalid unlock code ❌", 404);
    }

    const agent = existing.rows[0];
    if (agent.active) {
      return fail("Unlock code already used ❌");
    }

    // 2. Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Activate the agent and update details (✅ include name now)
    const result = await db.query(
      `UPDATE agents
       SET name = $1,
           email = $2,
           password_hash = $3,
           npn = $4,
           phone = $5,
           active = TRUE
       WHERE id = $6
       RETURNING id, name, email, npn, phone, role, active`,
      [name || null, email, hashedPassword, npn, phone || null, agent.id]
    );

    const row = result.rows[0];

    // 4. Mark unlock code as redeemed in promo_codes
    await db.query(
      `UPDATE promo_codes
       SET redeemed = TRUE, agent_id = $1, used_count = used_count + 1
       WHERE code = $2`,
      [row.id, unlockCode]
    );

    return ok({
      agentId: row.id,
      name: row.name,
      email: row.email,
      npn: row.npn,
      phone: row.phone,
      role: row.role,
      active: row.active,
    });
  } catch (err) {
    console.error("❌ Error claiming agent unlock:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: false, error: "Server error: " + err.message }),
    };
  }
};
