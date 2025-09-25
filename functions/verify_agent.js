// functions/verifyPromo.js
const db = require("./services/db"); // optional, if you really wire a DB

function ok(obj) {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj),
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

    // 🚨 Master seed code (bootstraps first registrations)
    if (promoCode === "Traci-2021") {
      return ok({
        success: true,
        message: "Master promo code accepted ✅",
        user: { username },
      });
    }

    // --- If DB available, check there ---
    try {
      const result = await db.query(
        "SELECT * FROM promo_codes WHERE code=$1",
        [promoCode]
      );

      if (!result.rows.length) {
        return fail("Invalid promo code ❌");
      }

      const row = result.rows[0];

      // Usage limits
      if (row.max_uses !== null && row.used_count >= row.max_uses) {
        return fail("Code usage limit reached ❌");
      }

      // Increment use
      await db.query(
        "UPDATE promo_codes SET used_count = used_count + 1 WHERE code=$1",
        [promoCode]
      );

      // Log redemption
      await db.query(
        "INSERT INTO redemptions (username, promo_code, agent_id, redeemed_at) VALUES ($1, $2, $3, NOW())",
        [username, promoCode, row.agent_id || null]
      );

      return ok({ success: true, message: "Promo code accepted ✅" });
    } catch (dbErr) {
      console.warn("DB not available, fallback only:", dbErr.message);
      return fail("Invalid promo code (no DB check) ❌");
    }
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: false, error: err.message }),
    };
  }
};
