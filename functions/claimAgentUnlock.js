// functions/claimAgentUnlock.js
const db = require("./services/db");
const bcrypt = require("bcryptjs");

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({ success: false, error: "Method not allowed" }),
      };
    }

    const { unlockCode, email, password, npn, phone, name } = JSON.parse(event.body || "{}");

    if (!unlockCode || !email || !password || !npn) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: "Missing required fields" }),
      };
    }

    // ✅ Check unlock code exists
    const existing = await db.query(
      `SELECT id, active 
       FROM agents 
       WHERE unlock_code = $1`,
      [unlockCode]
    );

    if (existing.rows.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ success: false, error: "Invalid unlock code ❌" }),
      };
    }

    const agent = existing.rows[0];
    if (agent.active) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: "Unlock code already used ❌" }),
      };
    }

    // ✅ Hash password before storing
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ Update agent row with real data
    const result = await db.query(
      `UPDATE agents
       SET email = $1,
           password = $2,
           npn = $3,
           phone = $4,
           name = $5,
           active = TRUE,
           updated_at = NOW()
       WHERE id = $6
       RETURNING id, email, npn, phone, name, active`,
      [email, hashedPassword, npn, phone || null, name || null, agent.id]
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        agent: result.rows[0],
      }),
    };
  } catch (err) {
    console.error("Error claiming agent unlock:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: "Server error" }),
    };
  }
};
