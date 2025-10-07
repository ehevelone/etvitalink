// functions/request_reset.js
const db = require("../services/db");
const nodemailer = require("nodemailer");

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
    if (event.httpMethod !== "POST") return fail("Method not allowed", 405);

    const { emailOrPhone } = JSON.parse(event.body || "{}");
    if (!emailOrPhone) return fail("Email is required ❌");

    // 🔢 Generate a 6-digit reset code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

    // 🔎 Find the account in 'agents' or 'users' table
    let user;
    const agentRes = await db.query(
      `SELECT id, email, role FROM agents WHERE email = $1`,
      [emailOrPhone]
    );

    if (agentRes.rows.length > 0) {
      user = agentRes.rows[0];
    } else {
      const userRes = await db.query(
        `SELECT id, email, role FROM users WHERE email = $1`,
        [emailOrPhone]
      );
      if (userRes.rows.length > 0) {
        user = userRes.rows[0];
      }
    }

    if (!user) return fail("No account found for this email ❌", 404);

    // 🕒 Store code with 20-minute expiration
    await db.query(
      `INSERT INTO reset_codes (user_id, code, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '20 MINUTES')`,
      [user.id, resetCode]
    );

    // 📧 Send email with reset code
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailBody = `
      Hi there,

      Your VitaLink password reset code is: ${resetCode}

      This code will expire in 20 minutes.
      If you didn’t request this, please ignore this email.

      – VitaLink Support
    `;

    await transporter.sendMail({
      from: `"VitaLink Support" <${process.env.SMTP_USER}>`,
      to: user.email,
      subject: "Your VitaLink Password Reset Code",
      text: mailBody,
    });

    console.log(`✅ Sent reset code ${resetCode} to ${user.email}`);

    return ok({
      message: "Reset code sent successfully ✅",
      expiresIn: "20 minutes",
      sentTo: user.email,
    });
  } catch (err) {
    console.error("❌ Error in request_reset:", err);
    return fail("Server error while sending reset code ❌");
  }
};
