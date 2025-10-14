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

    // 1️⃣ Find agent by unlock
    const existing = await db.query(
      `SELECT id, active FROM agents WHERE unlock_code = $1`,
      [unlockCode]
    );
    if (existing.rows.length === 0) return fail("Invalid unlock code ❌", 404);
    const agent = existing.rows[0];
    if (agent.active) return fail("Unlock code already used ❌");

    // 2️⃣ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3️⃣ Generate permanent promo for this agent
    const promoCode =
      "AG-" + Math.random().toString(36).substring(2, 10).toUpperCase();

    // 4️⃣ Activate agent + store promo
    const result = await db.query(
      `UPDATE agents
         SET email = $1,
             password_hash = $2,
             npn = $3,
             phone = $4,
             name = $5,
             active = TRUE,
             promo_code = $6
       WHERE id = $7
       RETURNING id, name, email, phone, npn, promo_code, active, role`,
      [email, hashedPassword, npn, phone, name, promoCode, agent.id]
    );

    const row = result.rows[0];

    return ok({
      message: "Agent registration complete ✅",
      agentId: row.id,
      promoCode: row.promo_code,
      name: row.name,
      email: row.email,
      phone: row.phone,
      npn: row.npn,
      active: row.active,
      role: row.role,
    });
  } catch (err) {
    console.error("❌ claim_agent_unlock error:", err);
    return fail("Server error: " + err.message, 500);
  }
};
