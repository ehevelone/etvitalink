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
      return fail("Missing username or promo code");
    }

    // Look up promo code
    const result = await db.query(
      "SELECT * FROM promo_codes WHERE code=$1",
      [promoCode]
    );

    if (!result.rows.length) {
      return fail("Invalid promo code ❌");
    }

    const row = result.rows[0];

    // Check usage limits
    if (row.max_uses !== null && row.used_count >= row.max_uses) {
      return fail("Promo code usage limit reached ❌");
    }

    // Increment usage count
    await db.query(
      "UPDATE promo_codes SET used_count = used_count + 1 WHERE code=$1",
      [promoCode]
    );

    // Log redemption
    await db.query(
      "INSERT INTO redemptions (username, promo_code, redeemed_at, agent_id) VALUES ($1, $2, NOW(), $3)",
      [username, promoCode, row.agent_id]
    );

    return ok({
      message: "Promo code accepted ✅",
      agentId: row.agent_id,
      code: promoCode,
    });
  } catch (err) {
    console.error("❌ verify_promo error:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: false, error: err.message }),
    };
  }
};
