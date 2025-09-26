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
    const { email, password, unlockCode, npn } = JSON.parse(event.body || "{}");

    if (!email || !password || !unlockCode || !npn) {
      return fail("Email, password, unlock code, and NPN are required.");
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
    const dupCheck = await db.query("SELECT id FROM agents WHERE email=$1", [email]);

    if (dupCheck.rows.length > 0) {
      return fail("This email is already registered. Please log in instead.");
    }

    // Hash password before storing
    const passwordHash = hashPassword(password);

    // Insert agent into DB
    const result = await db.query(
      `INSERT INTO agents (email, password_hash, npn, role, active)
       VALUES ($1, $2, $3, 'agent', true)
       RETURNING id, email, npn, role, active`,
      [email, passwordHash, npn]
    );

    const row = result.rows[0];

    // Mark unlock code as redeemed
    await db.query("UPDATE promo_codes SET redeemed=true, agent_id=$1 WHERE id=$2", [
      row.id,
      codeRow.id,
    ]);

    // Generate permanent promo code for this agent
    const agentCode = `AGT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    await db.query(
      `INSERT INTO promo_codes (code, agent_id, max_uses)
       VALUES ($1, $2, NULL)`,
      [agentCode, row.id]
    );

    return ok({
      message: "Agent registered successfully ✅",
      agentId: row.id,
      email: row.email,
      role: row.role,
      active: row.active,
      code: agentCode,
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
