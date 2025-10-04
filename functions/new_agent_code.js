// functions/new_agent_code.js
const db = require("../services/db");

// ✅ Simple random alphanumeric generator (8 chars, A-Z0-9)
function generateUnlockCode() {
  return Array.from({ length: 8 }, () =>
    Math.floor(Math.random() * 36).toString(36).toUpperCase()
  ).join("");
}

exports.handler = async (event) => {
  try {
    // Generate a random unlock code
    const unlockCode = generateUnlockCode();

    // Create stub agent row
    const agentResult = await db.query(
      `INSERT INTO agents (unlock_code, active, role)
       VALUES ($1, FALSE, 'agent')
       RETURNING id`,
      [unlockCode]
    );

    const agentId = agentResult.rows[0].id;

    // Log promo code
    await db.query(
      `INSERT INTO promo_codes (code, redeemed, used_count)
       VALUES ($1, FALSE, 0)`,
      [unlockCode]
    );

    // If request has Accept: application/json → return JSON (for app)
    if (event.headers.accept && event.headers.accept.includes("application/json")) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          success: true,
          agentId,
          unlockCode,
        }),
      };
    }

    // Otherwise → return an HTML landing page (for browsers / QR scan)
    const playStoreLink = "https://play.google.com/store/apps/details?id=com.vitalink.app";
    const regPageLink = `https://vitalink-app.netlify.app/agent-registration?code=${unlockCode}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <title>VitaLink Agent Unlock</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; margin: 40px; }
          .code { font-size: 24px; font-weight: bold; color: #0077cc; margin: 20px 0; }
          a.button {
            display: inline-block; padding: 12px 20px; margin: 10px;
            background: #0077cc; color: white; text-decoration: none; border-radius: 6px;
          }
        </style>
      </head>
      <body>
        <h2>Welcome to VitaLink</h2>
        <p>Your unique agent unlock code:</p>
        <div class="code">${unlockCode}</div>
        <p>If you already downloaded the VitaLink app, open it and paste this code to register.</p>
        <p>
          <a href="${playStoreLink}" class="button">📥 Download VitaLink</a>
          <a href="${regPageLink}" class="button">➡️ Register Now</a>
        </p>
      </body>
      </html>
    `;

    return {
      statusCode: 200,
      headers: { "Content-Type": "text/html" },
      body: html,
    };
  } catch (err) {
    console.error("❌ Error generating new agent code:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: false, error: err.message }),
    };
  }
};
