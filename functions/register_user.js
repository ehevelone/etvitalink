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
      return {
        statusCode: 405,
        body: JSON.stringify({ error: "Method Not Allowed" }),
      };
    }

    const body = JSON.parse(event.body || "{}");
    const { firstName, lastName, email, phone, password, promoCode } = body;

    // ✅ Validation
    if (!firstName || !lastName || !email || !password || !promoCode) {
      return reply(false, { error: "Missing required fields" });
    }

    const cleanPhone = phone ? phone.replace(/\D/g, "") : null;

    // ✅ Hash password
    const password_hash = await bcrypt.hash(password, 10);

    let agentId = null;
    let purchaseCode = null;

    if (promoCode.startsWith("AG-")) {
      // 🔹 Agent code
      const agentResult = await db.query(
        `SELECT id, subscription_valid FROM agents WHERE promo_code = $1 LIMIT 1`,
        [promoCode]
      );

      if (!agentResult.rows.length) {
        return reply(false, { error: "Invalid agent promo code" });
      }
      if (!agentResult.rows[0].subscription_valid) {
        return reply(false, { error: "Agent subscription inactive ❌" });
      }

      agentId = agentResult.rows[0].id;
    } else if (promoCode.startsWith("PU-")) {
      // 🔹 Purchase code
      const purchaseResult = await db.query(
        `SELECT id, redeemed FROM purchase_codes WHERE code = $1 LIMIT 1`,
        [promoCode]
      );

      if (!purchaseResult.rows.length) {
        return reply(false, { error: "Invalid purchase code" });
      }
      if (purchaseResult.rows[0].redeemed) {
        return reply(false, { error: "This purchase code has already been used" });
      }

      purchaseCode = promoCode;

      // Mark redeemed
      await db.query(
        `UPDATE purchase_codes SET redeemed = true, redeemed_at = now() WHERE id = $1`,
        [purchaseResult.rows[0].id]
      );
    } else {
      return reply(false, { error: "Invalid code format" });
    }

    // ✅ Insert into users
    const result = await db.query(
      `INSERT INTO users (first_name, last_name, email, password_hash, phone, promo_code, agent_id, purchase_code)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id, first_name, last_name, email, promo_code, agent_id, purchase_code`,
      [
        firstName,
        lastName,
        email.toLowerCase(),
        password_hash,
        cleanPhone,
        promoCode,
        agentId,
        purchaseCode,
      ]
    );

    const user = result.rows[0];

    return reply(true, {
      message: "User registered successfully ✅",
      user,
    });
  } catch (err) {
    console.error("❌ register_user error:", err);
    return reply(false, { error: "Server error: " + err.message });
  }
};
