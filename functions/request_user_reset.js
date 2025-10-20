// functions/request_user_reset.js
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// configure your SMTP or provider (SendGrid, Mailgun, etc.)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

exports.handler = async (event) => {
  try {
    const { username, email } = JSON.parse(event.body || "{}");
    if (!username || !email) {
      return { statusCode: 400, body: JSON.stringify({ success: false, error: "Missing username or email" }) };
    }

    // Lookup user by username
    const { data: user, error } = await supabase
      .from("users")
      .select("id, username")
      .eq("username", username)
      .single();

    if (error || !user) {
      return { statusCode: 404, body: JSON.stringify({ success: false, error: "User not found" }) };
    }

    // Generate reset token
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 1000 * 60 * 60).toISOString(); // 1 hr

    // Save to Supabase
    await supabase
      .from("users")
      .update({ reset_token: token, reset_expires: expires })
      .eq("id", user.id);

    // Email reset link
    const resetLink = `${process.env.APP_BASE_URL}/reset?token=${token}`;
    await transporter.sendMail({
      from: `"VitaLink Support" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Password Reset Request",
      text: `Hello ${username},\n\nClick the link below to reset your password:\n${resetLink}\n\nThis link will expire in 1 hour.`,
    });

    return { statusCode: 200, body: JSON.stringify({ success: true, message: "Reset link sent to email" }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ success: false, error: err.message }) };
  }
};
