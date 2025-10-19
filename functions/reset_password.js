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

    const { email } = JSON.parse(event.body || "{}");
    if (!email) return fail("Missing email ❌");

    // Check both agents and users tables
    let user, table;
    const agentRes = await db.query(`SELECT id, email FROM agents WHERE email=$1`, [email]);
    if (agentRes.rows.length > 0) {
      user = agentRes.rows[0];
      table = "agents";
    } else {
      const userRes = await db.query(`SELECT id, email FROM users WHERE email=$1`, [email]);
      if (userRes.rows.length > 0) {
        user = userRes.rows[0];
        table = "users";
      }
    }

    if (!user) return fail("No account found for this email ❌", 404);

    // Generate code + expiry
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit
    const expires = new Date(Date.now() + 1000 * 60 * 15); // 15 mins

    // Save in DB
    await db.query(
      `UPDATE ${table} SET reset_code=$1, reset_expires=$2 WHERE id=$3`,
      [resetCode, expires, user.id]
    );

    // Setup email transport
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: false, // use true if 465
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Send email
    await transporter.sendMail({
      from: `"VitaLink Support" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Your VitaLink Reset Code",
      text: `Your password reset code is ${resetCode}. It expires in 15 minutes.`,
    });

    return ok({ message: "Reset code sent via email ✅" });
  } catch (err) {
    console.error("❌ Error in request_reset:", err);
    return fail("Server error during reset request ❌", 500);
  }
};
