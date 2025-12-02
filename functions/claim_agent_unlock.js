// functions/claim_agent_unlock.js
const db = require("./services/db");
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

    const {
      unlockCode,
      email,
      password,
      npn,
      phone,
      name,
      agencyStreet,
      agencyCity,
      agencyState,
      agencyZip,
    } = JSON.parse(event.body || "{}");

    if (!unlockCode || !email || !password || !npn)
      return fail("Unlock code, email, password, and NPN are required.");

    const existing = await db.query(
      `SELECT id, active FROM agents WHERE unlock_code = $1`,
      [unlockCode]
    );
    if (existing.rows.length === 0) return fail("Invalid unlock code ❌", 404);

    const agent = existing.rows[0];
    if (agent.active) return fail("Unlock code already used ❌");

    const hashedPassword = await bcrypt.hash(password, 10);
    const promoCode =
      "AG-" + Math.random().toString(36).substring(2, 10).toUpperCase();

    const result = await db.query(
      `UPDATE agents
         SET email = $1,
             password_hash = $2,
             npn = $3,
             phone = $4,
             name = $5,
             agency_street = $6,
             agency_city = $7,
             agency_state = $8,
             agency_zip = $9,
             active = TRUE,
             promo_code = $10
       WHERE id = $11
       RETURNING id, name, email, phone, npn, agency_street, agency_city, agency_state, agency_zip, promo_code, active, role`,
      [
        email,
        hashedPassword,
        npn,
        phone,
        name,
        agencyStreet,
        agencyCity,
        agencyState,
        agencyZip,
        promoCode,
        agent.id,
      ]
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
      agencyStreet: row.agency_street,
      agencyCity: row.agency_city,
      agencyState: row.agency_state,
      agencyZip: row.agency_zip,
      active: row.active,
      role: row.role,
    });
  } catch (err) {
    console.error("❌ claim_agent_unlock error:", err);
    return fail("Server error: " + err.message, 500);
  }
};
