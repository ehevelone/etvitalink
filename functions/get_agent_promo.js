// functions/get_agent_promo.js
const db = require("./services/db");

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
    // ✅ Only allow POST requests
    if (event.httpMethod !== "POST") return fail("Method not allowed", 405);

    const { email } = JSON.parse(event.body || "{}");
    if (!email) return fail("Email required");

    // ✅ Query the agents table for this email
    const result = await db.query(
      `SELECT id, name, promo_code, active
         FROM agents
        WHERE LOWER(email) = LOWER($1)
        LIMIT 1`,
      [email]
    );

    if (result.rows.length === 0) {
      return fail("No agent found with that email");
    }

    const row = result.rows[0];

    // ✅ If agent has no promo_code, return cleanly
    if (!row.promo_code || row.promo_code.trim() === "") {
      return fail("Agent has no promo code assigned");
    }

    // ✅ Return using the same key Flutter expects: 'promoCode'
    return ok({
      promoCode: row.promo_code,
      active: row.active ?? false,
      agent: {
        id: row.id,
        name: row.name,
        email: email,
      },
    });
  } catch (err) {
    console.error("❌ get_agent_promo error:", err);
    return fail("Server error: " + err.message, 500);
  }
};
