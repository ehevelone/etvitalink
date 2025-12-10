const db = require("./services/db");

function ok(obj) {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ success: true, ...obj }),
  };
}

function fail(msg, code = 400) {
  return {
    statusCode: code,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ success: false, error: msg }),
  };
}

exports.handler = async (event) => {
  try {
    // ✅ METHOD GUARD (THIS WAS MISSING)
    if (event.httpMethod !== "POST") {
      return fail("Method Not Allowed", 405);
    }

    const { username, promoCode } = JSON.parse(event.body || "{}");

    if (!username || !promoCode) {
      return fail("Username and promo code are required.");
    }

    // 🔹 Look up promo code + linked agent
    const result = await db.query(
      `
      SELECT pc.id AS promo_id,
             pc.code,
             pc.agent_id,
             a.name AS agent_name,
             a.email AS agent_email,
             a.role,
             a.active
      FROM promo_codes pc
      LEFT JOIN agents a ON pc.agent_id = a.id
      WHERE pc.code = $1
      `,
      [promoCode]
    );

    if (!result.rows.length) {
      return fail("Invalid promo code ❌");
    }

    const row = result.rows[0];

    if (!row.active) {
      return fail("This agent is not active ❌");
    }

    // 🔹 Increment usage counter
    await db.query(
      `UPDATE promo_codes SET used_count = used_count + 1 WHERE id = $1`,
      [row.promo_id]
    );

    // 🔹 Log usage
    await db.query(
      `INSERT INTO promo_code_uses (promo_code_id, username)
       VALUES ($1, $2)`,
      [row.promo_id, username]
    );

    return ok({
      message: "Promo code accepted ✅",
      agent: {
        id: row.agent_id,
        name: row.agent_name,
        email: row.agent_email,
        role: row.role,
        active: row.active,
      },
    });
  } catch (err) {
    console.error("❌ verify_promo error:", err);
    return fail("Server error: " + err.message, 500);
  }
};
