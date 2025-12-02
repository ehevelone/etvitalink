// functions/generate_promo_batch.js
const crypto = require("crypto");
const db = require("./services/db");

function generateCode(prefix = "PROMO", length = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // avoid 0/O, 1/I
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${code}`;
}

exports.handler = async (event) => {
  try {
    const { prefix, agentId, maxUses } = JSON.parse(event.body || "{}");

    if (!agentId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: "agentId required" }),
      };
    }

    const safePrefix = prefix || "PROMO";
    const uses = maxUses !== undefined ? maxUses : null;

    // ✅ Always generate ONE code
    const code = generateCode(safePrefix, 6);

    await db.query(
      `INSERT INTO promo_codes (code, max_uses, used_count, created_at, agent_id)
       VALUES ($1, $2, 0, NOW(), $3)`,
      [code, uses, agentId]
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        code,     // ✅ return a single code
        agentId,
        maxUses: uses,
      }),
    };
  } catch (err) {
    console.error("❌ generatePromoBatch error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: err.message }),
    };
  }
};
