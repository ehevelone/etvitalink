// functions/agent_onboard.js
const db = require("./services/db");
const crypto = require("crypto");

// Utility to generate unlock codes like AG-XXXXXXX
function generateUnlockCode(prefix = "AG", length = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no O/0/I/1
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${code}`;
}

exports.handler = async () => {
  try {
    // 1. Generate unlock code
    const unlockCode = generateUnlockCode();

    // 2. Create placeholder agent record in DB
    const result = await db.query(
      `INSERT INTO agents (role, active, unlock_code, created_at)
       VALUES ('agent', FALSE, $1, NOW())
       RETURNING id`,
      [unlockCode]
    );

    const agentId = result.rows[0].id;

    // 3. Build deep link for the VitaLink app
    const deepLink = `vitalink://agent/onboard?unlockCode=${unlockCode}`;

    // 4. Build the HTML response
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>VitaLink Agent Onboarding</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          body { font-family: Arial, sans-serif; text-align: center; margin: 2rem; background-color: #f5f9ff; }
          img { max-width: 180px; margin-bottom: 20px; }
          h2 { color: #0077cc; }
          a.button {
            display: inline-block; margin: 10px; padding: 12px 20px;
            background: #0077cc; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold;
          }
          a.button.secondary { background: #555; }
        </style>
        <script>
          window.onload = function() {
            // Try to open the app with the unlock code
            window.location.href = "${deepLink}";
            // Fallback after 2s to show download buttons
            setTimeout(function() {
              document.getElementById("fallback").style.display = "block";
            }, 2000);
          }
        </script>
      </head>
      <body>
        <img src="/vitalink-logo-1.png" alt="VitaLink Logo" />
        <h2>Welcome to VitaLink Agent Setup</h2>
        <p>Your unlock code is:</p>
        <h3>${unlockCode}</h3>
        <p>We’re opening the VitaLink app. If nothing happens, use the links below:</p>
        <div id="fallback" style="display:none;">
          <a class="button" href="https://play.google.com/store/apps/details?id=com.vitalink" target="_blank">📱 Google Play</a>
          <a class="button secondary" href="https://apps.apple.com/app/vitalink/id123456789" target="_blank">🍎 App Store</a>
        </div>
      </body>
      </html>
    `;

    return {
      statusCode: 200,
      headers: { "Content-Type": "text/html" },
      body: html,
    };
  } catch (err) {
    console.error("Error in agent_onboard:", err);
    return {
      statusCode: 500,
      body: `Server error: ${err.message}`,
    };
  }
};
