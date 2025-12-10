// functions/request_reset.js
const db = require("./services/db");
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
    if (event.httpMethod !== "POST") {
      return fail("Method not allowed", 405);
    }

    const { emailOrPhone } = JSON.parse(event.body || "{}");
    if (!emailOrPhone) {
      return fail("Email is required ❌");
    }

    // 🔢 Generate 6-digit reset code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

    // 🔎 Find account
    let user, table;

    const agentRes = await db.query(
      "SELECT id, email FROM agents WHERE email = $1",
      [emailOrPhone]
    );

    if (agentRes.rows.length > 0) {
      user = agentRes.rows[0];
      table = "agents";
    } else {
      const userRes = await db.query(
        "SELECT id, email FROM users WHERE email = $1",
        [emailOrPhone]
      );
      if (userRes.rows.length > 0) {
        user = userRes.rows[0];
        table = "users";
      }
    }

    if (!user) {
      return fail("No account found for this email ❌", 404);
    }

    // 🕒 Store reset code
    await db.query(
      `
      UPDATE ${table}
      SET reset_code = $2,
          reset_expires = NOW() + INTERVAL '20 minutes'
      WHERE id = $1
      `,
      [user.id, resetCode]
    );

    // 📧 Email setup
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const subject =
      table === "agents"
        ? "VitaLink Agent Password Reset Code"
        : "VitaLink User Password Reset Code";

    const mailBody = `
Hi,

Your VitaLink password reset code is:

${resetCode}

This code will expire in 20 minutes.

If you did not request this, you may ignore this email.

– VitaLink Support
    `.trim();

    await transporter.sendMail({
      from: `"VitaLink Support" <${process.env.SMTP_USER}>`,
      to: user.email,
      subject,
      text: mailBody,
    });

    console.log(`✅ Reset code sent to ${user.email} (${table})`);

    return ok({
      message: "Reset code sent successfully ✅",
      expiresIn: "20 minutes",
      sentTo: user.email,
      role: table,
    });
  } catch (err) {
    console.error("❌ request_reset error:", err);
    return fail("Server error while sending reset code ❌", 500);
  }
};
