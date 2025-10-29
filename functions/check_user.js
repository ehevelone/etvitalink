// functions/check_user.js
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
    const { email, password, platform } = body;

    if (!email || !password) {
      return reply(false, { error: "Email and password required" });
    }

    // 🔎 Look up user
    const result = await db.query(
      `SELECT id, first_name, last_name, email, password_hash, agent_id, purchase_code
       FROM users WHERE email = $1 LIMIT 1`,
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return reply(false, { error: "User not found" });
    }

    const user = result.rows[0];

    // 🔑 Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return reply(false, { error: "Invalid password ❌" });
    }

    // ✅ Check access validity
    let accessValid = false;

    if (user.agent_id) {
      // Agent-linked user: check if agent subscription is still valid
      const agentCheck = await db.query(
        `SELECT subscription_valid FROM agents WHERE id = $1 LIMIT 1`,
        [user.agent_id]
      );
      if (agentCheck.rows.length && agentCheck.rows[0].subscription_valid) {
        accessValid = true;
      }
    } else if (user.purchase_code) {
      // Direct purchaser: if they have a redeemed purchase_code, always valid
      const purchaseCheck = await db.query(
        `SELECT redeemed FROM purchase_codes WHERE code = $1 LIMIT 1`,
        [user.purchase_code]
      );
      if (purchaseCheck.rows.length && purchaseCheck.rows[0].redeemed) {
        accessValid = true;
      }
    }

    if (!accessValid) {
      return reply(false, {
        error: "Account not active — please renew or verify purchase",
      });
    }

    // ✅ Upsert into user_devices (1 device per user)
    await db.query(
      `INSERT INTO user_devices (user_id, platform, created_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET platform = EXCLUDED.platform, created_at = NOW()`,
      [user.id, platform || "unknown"]
    );

    // ✅ Success
    return reply(true, {
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        agent_id: user.agent_id,
        purchase_code: user.purchase_code,
        platform: platform || "unknown",
      },
    });
  } catch (err) {
    console.error("❌ check_user error:", err);
    return reply(false, { error: "Server error: " + err.message });
  }
};
