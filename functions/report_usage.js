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
    // 🔑 Accept key from either header OR query string
    const key =
      event.headers["x-admin-key"] ||
      (event.queryStringParameters && event.queryStringParameters.key);

    if (!key || key !== process.env.ADMIN_KEY) {
      return fail("Unauthorized ❌");
    }

    // 📊 Lifetime usage
    const lifetimeResult = await db.query(`
      SELECT a.id, a.email, COUNT(r.id) AS total_uses
      FROM agents a
      LEFT JOIN redemptions r ON a.id = r.agent_id
      GROUP BY a.id, a.email
      ORDER BY total_uses DESC
    `);

    // 📊 Monthly usage (current calendar month)
    const monthlyResult = await db.query(`
      SELECT a.id, a.email, COUNT(r.id) AS monthly_uses
      FROM agents a
      LEFT JOIN redemptions r 
        ON a.id = r.agent_id 
       AND date_trunc('month', r.used_at) = date_trunc('month', CURRENT_DATE)
      GROUP BY a.id, a.email
      ORDER BY monthly_uses DESC
    `);

    return ok({
      message: "Usage report generated ✅",
      lifetime: lifetimeResult.rows,
      monthly: monthlyResult.rows,
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
