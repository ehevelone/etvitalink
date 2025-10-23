// functions/register_user.js
const db = require("../services/db");
const bcrypt = require("bcryptjs");

function reply(success, obj = {}) {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ success, ...obj }),
  };
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
    }

    const { username, password, promoCode, phone } = JSON.parse(event.body || "{}");

    if (!username || !password) {
      return reply(false, { error: "Missing required fields" });
    }

    // ✅ Hash password with bcrypt (same as agent)
    const password_hash = await bcrypt.hash(password, 10);

    // ✅ Insert into Postgres via db.js
    const result = await db.query(
      `INSERT INTO users (username, password_hash, promo_code, phone)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, promo_code`,
      [username, password_hash, promoCode || null, phone || null]
    );

    const user = result.rows[0];

    return reply(true, {
      message: "User registered successfully",
      user: { id: user.id, username: user.username, promo_code: user.promo_code },
    });
  } catch (err) {
    console.error("❌ register_user error:", err);
    return reply(false, { error: "Server error: " + err.message });
  }
};
