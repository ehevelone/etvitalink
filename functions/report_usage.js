// functions/report_usage.js
const db = require("./services/db");

const ADMIN_KEY = process.env.ADMIN_KEY || "supersecret";

function ok(body, contentType = "application/json") {
  return {
    statusCode: 200,
    headers: { "Content-Type": contentType },
    body,
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
    const { key, format } = event.queryStringParameters || {};

    if (key !== ADMIN_KEY) {
      return fail("Forbidden", 403);
    }

    // 🔎 Query lifetime and monthly usage
    const result = await db.query(`
      SELECT a.id as agent_id, a.email, a.npn,
             COUNT(r.id) as lifetime_uses,
             COUNT(r.id) FILTER (
               WHERE DATE_TRUNC('month', r.used_at) = DATE_TRUNC('month', CURRENT_DATE)
             ) as monthly_uses
      FROM agents a
      LEFT JOIN redemptions r ON a.id = r.agent_id
      GROUP BY a.id, a.email, a.npn
      ORDER BY a.email;
    `);

    const rows = result.rows;

    if (format === "csv") {
      // 📄 CSV export
      const header = "Agent ID,Email,NPN,Lifetime Uses,Monthly Uses";
      const csvRows = rows.map(
        (r) =>
          `${r.agent_id},${r.email},${r.npn || ""},${r.lifetime_uses},${r.monthly_uses}`
      );
      const csv = [header, ...csvRows].join("\n");
      return ok(csv, "text/csv");
    } else {
      // 🌐 HTML export
      let html = `
        <html>
          <head>
            <title>Usage Report</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h1 { margin-bottom: 20px; }
              table { border-collapse: collapse; width: 100%; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
            </style>
          </head>
          <body>
            <h1>Agent Usage Report</h1>
            <table>
              <tr>
                <th>Agent ID</th>
                <th>Email</th>
                <th>NPN</th>
                <th>Lifetime Uses</th>
                <th>Monthly Uses</th>
              </tr>
      `;

      for (const r of rows) {
        html += `
          <tr>
            <td>${r.agent_id}</td>
            <td>${r.email}</td>
            <td>${r.npn || ""}</td>
            <td>${r.lifetime_uses}</td>
            <td>${r.monthly_uses}</td>
          </tr>
        `;
      }

      html += `
            </table>
          </body>
        </html>
      `;

      return ok(html, "text/html");
    }
  } catch (err) {
    console.error("❌ report_usage error:", err);
    return fail("Server error: " + err.message, 500);
  }
};
