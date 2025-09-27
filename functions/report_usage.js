// functions/report_usage.js
const db = require("./services/db");

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
    // 🔐 Require admin key
    const key = event.headers["x-admin-key"];
    if (key !== process.env.ADMIN_KEY) {
      return fail("Unauthorized ❌");
    }

    // 📊 Lifetime usage per agent
    const lifetime = await db.query(
      `SELECT a.id, a.email, COUNT(r.id) AS total_uses
       FROM agents a
       LEFT JOIN promo_codes pc ON pc.agent_id = a.id
       LEFT JOIN redemptions r ON r.code_id = pc.id
       GROUP BY a.id, a.email
       ORDER BY total_uses DESC`
    );

    // 📊 Monthly usage per agent (this calendar month)
    const monthly = await db.query(
      `SELECT a.id, a.email, COUNT(r.id) AS month_uses
       FROM agents a
       LEFT JOIN promo_codes pc ON pc.agent_id = a.id
       LEFT JOIN redemptions r 
         ON r.code_id = pc.id 
        AND date_trunc('month', r.created_at) = date_trunc('month', CURRENT_DATE)
       GROUP BY a.id, a.email
       ORDER BY month_uses DESC`
    );

    return ok({
      message: "Usage report generated ✅",
      lifetime: lifetime.rows,
      monthly: monthly.rows,
    });
  } catch (err) {
    console.error("❌ report_usage error:", err);
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
