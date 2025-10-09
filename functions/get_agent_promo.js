const db = require("../services/db");

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
    if (event.httpMethod !== "POST") return fail("Method not allowed", 405);

    const { email } = JSON.parse(event.body || "{}");
    if (!email) return fail("Email required");

    const result = await db.query(
      `SELECT p.code,
              a.active,
              a.name,
              a.id
         FROM promo_codes p
         JOIN agents a ON p.agent_id = a.id
        WHERE LOWER(a.email) = LOWER($1)
        ORDER BY p.created_at DESC
        LIMIT 1`,
      [email]
    );

    if (result.rows.length === 0)
      return fail("No promo code found for this agent");

    const row = result.rows[0];
    return ok({
      code: row.code,
      active: row.active,
      agent: { id: row.id, name: row.name },
    });
  } catch (err) {
    console.error("❌ get_agent_promo error:", err);
    return fail("Server error: " + err.message, 500);
  }
};
