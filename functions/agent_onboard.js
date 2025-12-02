// functions/agent_onboard.js
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

function generateToken() {
  return crypto.randomBytes(16).toString("hex");
}

exports.handler = async () => {
  try {
    const unlockCode = generateUnlockCode();
    const onboardToken = generateToken();

    const result = await db.query(
      `INSERT INTO agents (role, active, unlock_code, onboard_token, created_at)
       VALUES ('agent', FALSE, $1, $2, NOW())
       RETURNING id`,
      [unlockCode, onboardToken]
    );

    const agentId = result.rows[0].id;
    const redirectUrl = `https://vitalink-app.netlify.app/agent-onboard.html?token=${encodeURIComponent(onboardToken)}`;

    console.log(`✅ Agent ${agentId} created`);
    console.log(`🔐 Unlock code: ${unlockCode}`);
    console.log(`🔑 Token: ${onboardToken}`);
    console.log(`🔗 Redirecting to: ${redirectUrl}`);

    return {
      statusCode: 302,
      headers: { Location: redirectUrl },
    };
  } catch (err) {
    console.error("❌ Error in agent_onboard:", err);
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
