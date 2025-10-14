// make_qr.js
const QRCode = require("qrcode");
const fs = require("fs");

async function run() {
  try {
    // ✅ The link your QR should point to
    const url = "https://vitalink-app.netlify.app/.netlify/functions/onboard_agent";

    // ✅ Save QR as PNG
    await QRCode.toFile("agent-onboard-qr.png", url, {
      width: 500,
      margin: 2,
    });

    console.log("✅ QR saved as agent-onboard-qr.png");
  } catch (err) {
    console.error("❌ Error creating QR:", err);
  }
}

run();
