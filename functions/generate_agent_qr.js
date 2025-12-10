// functions/generateAgentQR.js
const db = require("./services/db");
const QRCode = require("qrcode");
const crypto = require("crypto");

function generateCode(prefix = "PROMO", length = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${code}`;
}

exports.handler = async (event) => {
  try {
    const { agentId } = JSON.parse(event.body || "{}");

    if (!agentId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "agentId required" }),
      };
    }

    // 1. Generate promo code
    const code = generateCode("AGENT", 6);

    await db.query(
      "INSERT INTO promo_codes (code, max_uses, used_count, created_at, agent_id) VALUES ($1, $2, 0, NOW(), $3)",
      [code, null, agentId] // null max_uses = unlimited
    );

    // 2. Build deep link
    const deepLink = `vitalink://register?agent=${agentId}&promo=${code}`;

    // 3. Generate QR code (base64 PNG)
    const qrDataUrl = await QRCode.toDataURL(deepLink);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        code,
        deepLink,
        qr: qrDataUrl, // base64 image string
      }),
    };
  } catch (err) {
    console.error("❌ generateAgentQR error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
