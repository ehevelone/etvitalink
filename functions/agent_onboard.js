// functions/agent-onboard.js
const db = require("./services/db");
const crypto = require("crypto");

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
    // 1. Generate unlock code
    const unlockCode = generateUnlockCode();

    // 2. Create placeholder agent record in DB
    const result = await db.query(
      `INSERT INTO agents (email, password, role, active, npn, unlock_code, created_at)
       VALUES (NULL, NULL, 'agent', FALSE, NULL, $1, NOW())
       RETURNING id`,
      [unlockCode]
    );

    const agentId = result.rows[0].id;

    // 3. Build deep link for app
    const deepLink = `vitalink://agent/onboard?unlockCode=${unlockCode}`;

    // 4. Landing HTML (shows deep link + fallback download buttons)
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>VitaLink Agent Onboarding</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          body { font-family: Arial, sans-serif; text-align: center; margin: 2rem; }
          img { max-width: 180px; margin-bottom: 20px; }
          a.button {
            display: inline-block; margin: 10px; padding: 12px 20px;
            background: #0077cc; color: #fff; text-decoration: none; border-radius: 6px;
          }
        </style>
        <!-- Try to auto-open the app -->
        <script>
          window.onload = function() {
            window.location.href = "${deepLink}";
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
          <a class="button" href="https://play.google.com/store/apps/details?id=com.vitalink">Download for Android</a>
          <a class="button" href="https://apps.apple.com/app/vitalink/id123456789">Download for iOS</a>
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
    console.error("Error in agent-onboard:", err);
    return {
      statusCode: 500,
      body: "Server error",
    };
  }
};
