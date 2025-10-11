// functions/agent_onboard.js
const db = require("../services/db");

// 🔹 Utility to generate a random unlock code (prefix AG-XXXXXXX)
function generateUnlockCode(prefix = "AG", length = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${code}`;
}

exports.handler = async () => {
  try {
    // 1️⃣ Generate a unique unlock code
    const unlockCode = generateUnlockCode();

    // 2️⃣ Insert a new inactive agent record
    const result = await db.query(
      `INSERT INTO agents (role, active, unlock_code, created_at)
       VALUES ('agent', FALSE, $1, NOW())
       RETURNING id`,
      [unlockCode]
    );

    const agentId = result.rows[0].id;

    // 3️⃣ Generate deep link with ?code= so Flutter picks it up automatically
    const deepLink = `vitalink://agent/onboard?code=${unlockCode}`;

    // 4️⃣ Generate HTML response page
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>VitaLink Agent Onboarding</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          body {
            font-family: Arial, sans-serif;
            text-align: center;
            margin: 2rem;
            background-color: #f5f9ff;
          }
          img {
            max-width: 180px;
            margin-bottom: 20px;
          }
          h2 {
            color: #0077cc;
          }
          a.button {
            display: inline-block;
            margin: 10px;
            padding: 12px 20px;
            background: #0077cc;
            color: #fff;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
          }
          a.button.secondary {
            background: #555;
          }
        </style>
        <script>
          window.onload = function() {
            // Try to open VitaLink app
            window.location.href = "${deepLink}";

            // Fallback if app not installed
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
        <h3 style="color:#0077cc;">${unlockCode}</h3>
        <p>We’re opening the VitaLink app. If nothing happens, use the links below:</p>
        <div id="fallback" style="display:none; margin-top:20px;">
          <a class="button" href="https://play.google.com/store/apps/details?id=com.vitalink" target="_blank">📱 Google Play</a>
          <a class="button secondary" href="https://apps.apple.com/app/vitalink/id123456789" target="_blank">🍎 App Store</a>
        </div>
      </body>
      </html>
    `;

    // ✅ Return the HTML response
    return {
      statusCode: 200,
      headers: { "Content-Type": "text/html" },
      body: html,
    };
  } catch (err) {
    console.error("❌ Error in agent_onboard:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: false, error: "Server error: " + err.message }),
    };
  }
};
