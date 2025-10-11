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
    if (event.httpMethod !== "POST") return fail("Method not allowed", 405);

    const { unlockCode, email, password, npn, phone, name } =
      JSON.parse(event.body || "{}");

    if (!unlockCode || !email || !password || !npn)
      return fail("Unlock code, email, password, and NPN are required.");

    // 1️⃣ Validate the unlock code
    const existing = await db.query(
      `SELECT id, active FROM agents WHERE unlock_code = $1`,
      [unlockCode]
    );

    if (existing.rows.length === 0) return fail("Invalid unlock code ❌", 404);

    const agent = existing.rows[0];
    if (agent.active) return fail("Unlock code already used ❌");

    // 2️⃣ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3️⃣ Activate agent + update info
    const result = await db.query(
      `UPDATE agents
          SET email = $1,
              password_hash = $2,
              npn = $3,
              phone = $4,
              name = $5,
              active = TRUE
        WHERE id = $6
        RETURNING id, email, npn, phone, name, role, active`,
      [email, hashedPassword, npn, phone || null, name || null, agent.id]
    );

    const row = result.rows[0];

    // 4️⃣ Mark the unlock code redeemed in promo_codes
    await db.query(
      `UPDATE promo_codes
          SET redeemed = TRUE,
              agent_id = $1,
              used_count = used_count + 1
        WHERE code = $2`,
      [row.id, unlockCode]
    );

    // 5️⃣ Ensure this agent has a permanent promo record
    const promoCheck = await db.query(
      `SELECT code FROM promo_codes WHERE agent_id = $1 AND code LIKE 'AG-%' LIMIT 1`,
      [row.id]
    );

    let promoCode;

    if (promoCheck.rows.length > 0) {
      promoCode = promoCheck.rows[0].code;
    } else {
      // 6️⃣ Create new permanent promo for this agent
      promoCode =
        "AG-" + Math.random().toString(36).substring(2, 10).toUpperCase();

      await db.query(
        `INSERT INTO promo_codes (code, agent_id, used_count, redeemed, active)
         VALUES ($1, $2, 0, FALSE, TRUE)`,
        [promoCode, row.id]
      );

      console.log("✅ Created new permanent promo for agent:", promoCode);
    }

    // ✅ Return full response
    return ok({
      message: "Agent registration complete ✅",
      agentId: row.id,
      name: row.name || "",
      email: row.email,
      phone: row.phone || "",
      npn: row.npn,
      role: row.role || "agent",
      active: row.active,
      promoCode,
    });
  } catch (err) {
    console.error("❌ claim_agent_unlock error:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        success: false,
        error: "Server error while claiming agent unlock.",
      }),
    };
  }
};
