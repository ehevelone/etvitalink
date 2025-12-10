// functions/register_user.js
const db = require("./services/db");
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
    const { firstName, lastName, email, phone, password, promoCode, platform } = body;

    if (!firstName || !lastName || !email || !password || !promoCode) {
      return reply(false, { error: "Missing required fields" });
    }

    // ✅ Hash password
    const password_hash = await bcrypt.hash(password, 10);

    let agentId = null;
    let purchaseCode = null;

    // 🔎 Agent unlock code
    const agentResult = await db.query(
      `SELECT id, active FROM agents WHERE unlock_code = $1 LIMIT 1`,
      [promoCode]
    );

    if (agentResult.rows.length) {
      const agent = agentResult.rows[0];
      if (!agent.active) {
        return reply(false, { error: "Agent subscription inactive ❌" });
      }
      agentId = agent.id;
    } else {
      // 🔎 Purchase Code
      const purchaseResult = await db.query(
        `SELECT code, redeemed FROM purchase_codes WHERE code = $1 LIMIT 1`,
        [promoCode]
      );

      if (purchaseResult.rows.length) {
        const pc = purchaseResult.rows[0];
        if (pc.redeemed) {
          return reply(false, { error: "Purchase code already used ❌" });
        }

        purchaseCode = pc.code;

        await db.query(
          `UPDATE purchase_codes SET redeemed = true, redeemed_at = now() WHERE code = $1`,
          [promoCode]
        );
      } else {
        return reply(false, { error: "Invalid agent or purchase promo code ❌" });
      }
    }

    // ✅ Insert user
    const result = await db.query(
      `INSERT INTO users (first_name, last_name, email, phone, password_hash, agent_id, purchase_code)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, email, first_name, last_name, agent_id, purchase_code`,
      [
        firstName,
        lastName,
        email.toLowerCase(),
        phone || null,
        password_hash,
        agentId,
        purchaseCode,
      ]
    );

    const user = result.rows[0];

    // ✅ Correct device upsert (1 device per user)
    await db.query(
      `INSERT INTO user_devices (user_id, platform, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())
       ON CONFLICT ON CONSTRAINT user_devices_user_id_unique
       DO UPDATE SET platform = EXCLUDED.platform, updated_at = NOW()`,
      [user.id, platform || "unknown"]
    );

    return reply(true, {
      message: "User registered successfully ✅",
      user,
    });
  } catch (err) {
    console.error("❌ register_user error:", err);
    return reply(false, { error: "Server error: " + err.message });
  }
};
