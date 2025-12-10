// functions/check_user.js
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
      return reply(false, { error: "Method Not Allowed" });
    }

    const { email, password, platform } = JSON.parse(event.body || "{}");
    if (!email || !password) {
      return reply(false, { error: "Email and password required" });
    }

    // ✅ Lookup user (explicit schema)
    const result = await db.query(
      `
      SELECT id, first_name, last_name, email, password_hash, agent_id, purchase_code
      FROM public.users
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1
      `,
      [email]
    );

    if (!result.rows.length) {
      return reply(false, { error: "User not found" });
    }

    const user = result.rows[0];

    // ✅ Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return reply(false, { error: "Invalid password ❌" });
    }

    // ✅ Verify user access based on agent subscription
    if (user.agent_id) {
      const agentCheck = await db.query(
        `SELECT subscription_valid FROM public.agents WHERE id = $1 LIMIT 1`,
        [user.agent_id]
      );

      if (!agentCheck.rows.length || !agentCheck.rows[0].subscription_valid) {
        return reply(false, { error: "Account inactive — contact agent" });
      }
    }

    // ✅ Register ONE device per user
    await db.query(
      `
      INSERT INTO public.user_devices (user_id, platform, created_at, updated_at)
      VALUES ($1, $2, NOW(), NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET platform = EXCLUDED.platform, updated_at = NOW()
      `,
      [user.id, platform || "unknown"]
    );

    return reply(true, {
      message: "Login successful ✅",
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        agent_id: user.agent_id,
        purchase_code: user.purchase_code
      },
    });

  } catch (err) {
    console.error("❌ check_user error:", err);
    return reply(false, { error: "Server error: " + err.message });
  }
};
