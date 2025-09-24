// functions/generatePromoBatch.js
const crypto = require("crypto");
// ⬆️ Replace this with your actual DB connection logic
const db = require("../services/db");

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
    const { prefix, count, maxUses } = JSON.parse(event.body);

    // Defaults
    const safePrefix = prefix || "PROMO";
    const total = count && count > 0 ? count : 10; // default 10 codes
    const uses = maxUses !== undefined ? maxUses : 1; // default single-use

    const codes = [];

    for (let i = 0; i < total; i++) {
      const code = generateCode(safePrefix, 6);

      await db.query(
        "INSERT INTO promo_codes (code, max_uses, used_count, created_at) VALUES ($1, $2, 0, NOW())",
        [code, uses === null ? null : uses] // null = unlimited
      );

      codes.push(code);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        created: codes,
        maxUses: uses,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
