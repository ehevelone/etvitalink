const db = require("./services/db"); // fixed path

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
      return fail("Username and promo code are required.");
    }

    // 🔹 Look up promo code + linked agent
    const result = await db.query(
      `SELECT pc.id as promo_id, pc.code, pc.agent_id,
              a.id as agent_id, a.name as agent_name,
              a.email as agent_email, a.role, a.active
       FROM promo_codes pc
       LEFT JOIN agents a ON pc.agent_id = a.id
       WHERE pc.code = $1`,
      [promoCode]
    );

    if (!result.rows.length) return fail("Invalid promo code ❌");

    const row = result.rows[0];
    if (!row.active) return fail("This agent is not active ❌");

    // 🔹 Increment usage counter
    await db.query(
      "UPDATE promo_codes SET used_count = used_count + 1 WHERE id=$1",
      [row.promo_id]
    );

    // 🔹 Log who used the code
    await db.query(
      "INSERT INTO promo_code_uses (promo_code_id, username) VALUES ($1, $2)",
      [row.promo_id, username]
    );

    // ✅ Return agent info to display in the app
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
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        success: false,
        error: "Server error: " + err.message,
      }),
    };
  }
};
