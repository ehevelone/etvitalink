// functions/verifyPromo.js
const db = require("./services/db");

exports.handler = async (event) => {
  try {
    const { username, promoCode } = JSON.parse(event.body);

    // Find code
    const result = await db.query(
      "SELECT * FROM promo_codes WHERE code=$1",
      [promoCode]
    );

    if (!result.rows.length) {
      return { statusCode: 400, body: JSON.stringify({ error: "Invalid code" }) };
    }

    const row = result.rows[0];

    // Check usage limits
    if (row.max_uses !== null && row.used_count >= row.max_uses) {
      return { statusCode: 400, body: JSON.stringify({ error: "Code usage limit reached" }) };
    }

    // Update code usage count
    await db.query(
      "UPDATE promo_codes SET used_count = used_count + 1 WHERE code=$1",
      [promoCode]
    );

    // Unlock user (ignore if users table missing)
    try {
      await db.query(
        "UPDATE users SET unlocked=true, promo_code=$1 WHERE username=$2",
        [promoCode, username]
      );
    } catch (e) {
      console.warn("Users table not updated:", e.message);
    }

    // Log redemption into redemptions table
    try {
      await db.query(
        "INSERT INTO redemptions (username, promo_code, agent_id, redeemed_at) VALUES ($1, $2, $3, NOW())",
        [username, promoCode, row.agent_id || null]
      );
    } catch (e) {
      console.warn("Redemption not logged:", e.message);
    }

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
