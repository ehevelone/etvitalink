// functions/verify_promo.js
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
    const { username, promoCode } = JSON.parse(event.body || "{}");

    if (!username || !promoCode) {
      return fail("Username and promo code are required.");
    }

    // 🔎 Look up promo code & agent
    const result = await db.query(
      `SELECT pc.id as promo_id, pc.code, pc.agent_id,
              a.id as agent_id, a.email as agent_email, a.npn,
              a.role, a.active
       FROM promo_codes pc
       LEFT JOIN agents a ON pc.agent_id = a.id
       WHERE pc.code = $1`,
      [promoCode]
    );

    if (!result.rows.length) {
      return fail("Invalid promo code ❌");
    }

    const row = result.rows[0];

    // ✅ Optional: enforce active status
    if (!row.active) {
      return fail("This agent is not active ❌");
    }

    // ✅ Track usage
    await db.query(
      "UPDATE promo_codes SET used_count = used_count + 1 WHERE id=$1",
      [row.promo_id]
    );

    return ok({
      message: "Promo code accepted ✅",
      code: row.code,
      agent: {
        id: row.agent_id,
        email: row.agent_email,
        npn: row.npn,
        role: row.role,
        active: row.active,
      },
    });
  } catch (err) {
    console.error("❌ verify_promo error:", err);
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
