// functions/request_reset.js
const db = require("../services/db");   // ✅ fixed path
const nodemailer = require("nodemailer");
const crypto = require("crypto");

exports.handler = async (event) => {
  try {
    const { email } = JSON.parse(event.body || "{}");

    if (!email) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: "Missing email" }),
      };
    }

    // Check if agent exists
    const result = await db.query("SELECT * FROM agents WHERE email=$1", [email]);
    if (!result.rows.length) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: "No account found with this email" }),
      };
    }

    // Generate reset code
    const resetCode = crypto.randomBytes(3).toString("hex").toUpperCase();
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    await db.query(
      `UPDATE agents SET reset_code=$1, reset_expires=$2 WHERE email=$3`,
      [resetCode, expires, email]
    );

    // Send email
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: `"VitaLink Support" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "VitaLink Password Reset",
      text: `Here is your password reset code: ${resetCode}\n\nThis code will expire in 15 minutes.`,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: "Reset code sent" }),
    };
  } catch (err) {
    console.error("❌ request_reset error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: err.message }),
    };
  }
};
