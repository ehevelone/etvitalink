// functions/request_reset.js
const db = require("./services/db");
const nodemailer = require("nodemailer");

function reply(statusCode, obj) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
    },
    body: JSON.stringify(obj),
  };
}

exports.handler = async (event) => {
  try {
    // ✅ Handle preflight (important for mobile / WebView)
    if (event.httpMethod === "OPTIONS") {
      return reply(200, {});
    }

    // ✅ Enforce POST
    if (event.httpMethod === "OPTIONS") {
  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
    body: "",
  };
}

if (event.httpMethod !== "POST") {
      return reply(405, {
        success: false,
        error: "Method Not Allowed",
      });
    }

    // ✅ Safe body parsing (Netlify + Flutter)
    let body = {};
    try {
      if (event.isBase64Encoded) {
        body = JSON.parse(
          Buffer.from(event.body, "base64").toString("utf8")
        );
      } else {
        body = JSON.parse(event.body || "{}");
      }
    } catch (e) {
      return reply(400, {
        success: false,
        error: "Invalid request body",
      });
    }

    const { emailOrPhone } = body;
    if (!emailOrPhone) {
      return reply(400, {
        success: false,
        error: "Email is required ❌",
      });
    }

    // 🔢 Generate 6-digit reset code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

    // 🔎 Locate account (case-insensitive)
    let user, table;

    const agentRes = await db.query(
      `SELECT id, email FROM agents WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      [emailOrPhone.trim()]
    );

    if (agentRes.rows.length) {
      user = agentRes.rows[0];
      table = "agents";
    } else {
      const userRes = await db.query(
        `SELECT id, email FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
        [emailOrPhone.trim()]
      );
      if (userRes.rows.length) {
        user = userRes.rows[0];
        table = "users";
      }
    }

    if (!user) {
      return reply(404, {
        success: false,
        error: "No account found for this email ❌",
      });
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

    // 📧 Mail transport
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

    const message = `
Hi,

Your VitaLink password reset code is:

${resetCode}

This code expires in 20 minutes.

If you did not request this, ignore this email.

– VitaLink Support
`.trim();

    await transporter.sendMail({
      from: `"VitaLink Support" <${process.env.SMTP_USER}>`,
      to: user.email,
      subject,
      text: message,
    });

    console.log(`✅ Reset code sent to ${user.email} (${table})`);

    return reply(200, {
      success: true,
      message: "Reset code sent successfully ✅",
      expiresIn: "20 minutes",
      sentTo: user.email,
      role: table,
    });

  } catch (err) {
    console.error("❌ request_reset error:", err);
    return reply(500, {
      success: false,
      error: "Server error while sending reset code ❌",
    });
  }
};
