// functions/verifyPromo.js
const db = require("./services/db"); // ✅ added import

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

    // Update code usage
    await db.query(
      "UPDATE promo_codes SET used_count = used_count + 1 WHERE code=$1",
      [promoCode]
    );

    // Unlock user
    await db.query(
      "UPDATE users SET unlocked=true, promo_code=$1 WHERE username=$2",
      [promoCode, username]
    );

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
