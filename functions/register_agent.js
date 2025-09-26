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
    const { email, password, unlockCode } = JSON.parse(event.body || "{}");

    if (!email || !password || !unlockCode) {
      return fail("Email, password, and unlock code are required.");
    }

    // 🔎 Validate unlock code
    const codeResult = await db.query(
      "SELECT * FROM promo_codes WHERE code=$1 AND redeemed=false",
      [unlockCode]
    );

    if (!codeResult.rows.length) {
      return fail("Invalid or already used unlock code ❌");
    }

    const codeRow = codeResult.rows[0];

    // 🔎 Check for duplicate email
    const dupCheck = await db.query(
      "SELECT id FROM agents WHERE email=$1",
      [email]
    );

    if (dupCheck.rows.length > 0) {
      return fail("This email is already registered. Please log in instead.");
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

    // Mark promo code as redeemed
    await db.query(
      "UPDATE promo_codes SET redeemed=true, agent_id=$1 WHERE id=$2",
      [row.id, codeRow.id]
    );

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
      body: JSON.stringify({
        success: false,
        error: "Server error: " + err.message,
      }),
    };
  }
};
