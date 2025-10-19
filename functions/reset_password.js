// netlify/functions/request_reset.js
const db = require("../services/db");        // uses your existing PG helper
const nodemailer = require("nodemailer");    // make sure nodemailer is installed

function ok(obj) {
  return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ success: true, ...obj }) };
}
function fail(msg, code = 400) {
  return { statusCode: code, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ success: false, error: msg }) };
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") return fail("Method not allowed", 405);

    const { emailOrPhone } = JSON.parse(event.body || "{}");
    if (!emailOrPhone) return fail("Email is required ❌");

    // 1) Look up the account (agents first, then users)
    let account = null, table = null;
    const a = await db.query(`SELECT id, email FROM agents WHERE email = $1`, [emailOrPhone]);
    if (a.rows.length) { account = a.rows[0]; table = "agents"; }
    else {
      const u = await db.query(`SELECT id, email FROM users WHERE email = $1`, [emailOrPhone]);
      if (u.rows.length) { account = u.rows[0]; table = "users"; }
    }
    if (!account) return fail("No account found for this email ❌", 404);

    // 2) Make a 6-digit code that expires in 15 minutes
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expire = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await db.query(
      `UPDATE ${table} SET reset_code = $1, reset_expires = $2 WHERE id = $3`,
      [code, expire, account.id]
    );

    // 3) Send the email
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.FROM_EMAIL || "no-reply@vitalink.app";

    if (!host || !user || !pass) {
      console.error("Missing SMTP env vars");
      return fail("Email service not configured ❌", 500);
    }

    const transporter = nodemailer.createTransport({
      host, port, secure: port === 465, auth: { user, pass },
    });

    await transporter.sendMail({
      from,
      to: account.email,
      subject: "Your VitaLink reset code",
      text: `Your password reset code is ${code}. It expires in 15 minutes.`,
      html: `<p>Your password reset code is <b>${code</b>}. It expires in 15 minutes.</p>`,
    });

    return ok({ message: "Reset code sent via email ✅" });
  } catch (err) {
    console.error("❌ request_reset error:", err);
    return fail("Server error sending reset code ❌", 500);
  }
};
