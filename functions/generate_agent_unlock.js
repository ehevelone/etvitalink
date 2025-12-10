// functions/generateAgentUnlock.js
const db = require("./services/db");  // ✅ corrected path
const crypto = require("crypto");

function generateUnlockCode(prefix = "AG", length = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // avoid 0/O, 1/I
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${code}`;
}

exports.handler = async (event) => {
  try {
    // ✅ Verify master key
    const { masterKey } = JSON.parse(event.body || "{}");
    if (masterKey !== process.env.MASTER_AGENT_KEY) {
      return {
        statusCode: 403,
        body: JSON.stringify({ success: false, error: "Unauthorized request" }),
      };
    }

    // ✅ Generate secure unlock code
    const unlockCode = generateUnlockCode();

    // ✅ Insert placeholder agent row
    const result = await db.query(
      `INSERT INTO agents (email, password, role, active, npn, unlock_code, created_at)
       VALUES (NULL, NULL, 'agent', FALSE, NULL, $1, NOW())
       RETURNING id, unlock_code`,
      [unlockCode]
    );

    const agentId = result.rows[0].id;

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        agentId,
        unlockCode,
      }),
    };
  } catch (err) {
    console.error("❌ Error generating agent unlock:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: "Server error" }),
    };
  }
};
