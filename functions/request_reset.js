// ✅ functions/request_reset.js
const db = require("../services/db");
const nodemailer = require("nodemailer");
const twilio = require("twilio"); // for SMS

function ok(obj) {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ success: true, ...obj }),
  };
}

function fail(msg, code = 400) {
  return {
    statusCode: code,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ success: false, error: msg }),
  };
}

exports.handler = async (event) => {
  try {
    const { emailOrPhone } = JSON.parse(event.body || "{}");
    if (!emailOrPhone) return fail("Missing email or phone number.");

    // 1️⃣ Lookup agent by email OR phone
    const result = await db.query(
      `SELECT id, email, phone FROM agents WHERE email = $1 OR phone = $1 LIMIT 1`,
      [emailOrPhone]
    );

    if (!result.rows.length) return fail("Account not found ❌");
    const agent = result.rows[0];

    // 2️⃣ Generate 6-digit reset code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

    await db.query(
      `UPDATE agents SET reset_code = $1, reset_expires = $2 WHERE id = $3`,
      [code, expires, agent.id]
    );

    // 3️⃣ Send via Email
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587", 10),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    if (agent.email) {
      await transporter.sendMail({
        from: `"VitaLink" <${process.env.SMTP_USER}>`,
        to: agent.email,
        subject: "Your VitaLink Password Reset Code",
        text: `Hello,

Your password reset code is: ${code}

This code will expire in 15 minutes.

If you didn’t request this, please ignore this message.

— VitaLink Support`,
      });
    }

    // 4️⃣ Send via SMS (optional)
    if (agent.phone && process.env.TWILIO_SID && process.env.TWILIO_TOKEN) {
      const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
      await client.messages.create({
        body: `VitaLink reset code: ${code} (expires in 15 min)`,
        from: process.env.TWILIO_PHONE,
        to: agent.phone,
      });
    }

    return ok({
      message: "Reset code sent ✅",
      delivery: {
        email: !!agent.email,
        sms: !!agent.phone,
      },
    });
  } catch (err) {
    console.error("❌ request_reset error:", err);
    return fail("Server error: " + err.message, 500);
  }
};
