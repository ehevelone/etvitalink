// functions/generatePromoBatch.js
const crypto = require("crypto");
const db = require("./services/db"); // ✅ path to db.js

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
    const { prefix, count, maxUses, agentId } = JSON.parse(event.body);

    // Defaults
    const safePrefix = prefix || "PROMO";
    const total = count && count > 0 ? count : 10; // default 10 codes
    const uses = maxUses !== undefined ? maxUses : 1; // default single-use
    const agent = agentId || null; // optional

    const codes = [];

    for (let i = 0; i < total; i++) {
      const code = generateCode(safePrefix, 6);

      await db.query(
        `INSERT INTO promo_codes (code, max_uses, used_count, created_at, agent_id)
         VALUES ($1, $2, 0, NOW(), $3)`,
        [code, uses === null ? null : uses, agent]
      );

      codes.push(code);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        created: codes,
        maxUses: uses,
        agentId: agent,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
