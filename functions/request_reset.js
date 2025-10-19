// functions/request_reset.js
const db = require("../services/db");
const nodemailer = require("nodemailer");

// ✅ Only load dotenv locally, Netlify already injects env vars
try {
  if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
    console.log("✅ dotenv loaded locally");
  }
} catch (e) {
  console.log("ℹ️ dotenv not needed in production");
}

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

    // 🔎 Try to find account in agents first
    let user, table;
    const agentRes = await db.query(
      `SELECT id, email FROM agents WHERE email = $1`,
      [emailOrPhone]
    );
    if (agentRes.rows.length > 0) {
      user = agentRes.rows[0];
      table = "agents";
    } else {
      const userRes = await db.query(
        `SELECT id, email FROM users WHERE email = $1`,
        [emailOrPhone]
      );
      if (userRes.rows.length > 0) {
        user = userRes.rows[0];
        table = "users";
      }
    }

    if (!user) return fail("No account found for this email ❌", 404);

    // 🕒 Update the reset_code + reset_expires
    await db.query(
      `UPDATE ${table}
         SET reset_code = $2,
             reset_expires = NOW() + INTERVAL '20 minutes'
       WHERE id = $1`,
      [user.id, resetCode]
    );

    // 📧 Send the reset code email
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false, // STARTTLS for Gmail
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailBody = `
      Hi,

      Your VitaLink password reset code is: ${resetCode}

      This code will expire in 20 minutes.
      If you didn’t request this, you can ignore this email.

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
    return fail("Server error while sending reset code ❌", 500);
  }
};
