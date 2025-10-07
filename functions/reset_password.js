// functions/reset_password.js
const db = require("../services/db");
const bcrypt = require("bcryptjs");

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

    const { emailOrPhone, code, newPassword } = JSON.parse(event.body || "{}");

    if (!emailOrPhone || !code || !newPassword) {
      return fail("Missing required fields.");
    }

    // 1️⃣ Validate reset code
    const check = await db.query(
      `SELECT user_id, expires_at FROM reset_codes
       WHERE code = $1 AND (email = $2 OR phone = $2)`,
      [code, emailOrPhone]
    );

    if (check.rows.length === 0) {
      return fail("Invalid or expired reset code ❌");
    }

    const row = check.rows[0];
    const now = new Date();
    if (new Date(row.expires_at) < now) {
      return fail("Reset code expired ❌");
    }

    // 2️⃣ Hash the new password
    const hashed = await bcrypt.hash(newPassword, 10);

    // 3️⃣ Update user password in database
    await db.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [
      hashed,
      row.user_id,
    ]);

    // 4️⃣ Invalidate the reset code
    await db.query(`DELETE FROM reset_codes WHERE code = $1`, [code]);

    return ok({ message: "Password reset successful ✅" });
  } catch (err) {
    console.error("❌ Error in reset_password:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        success: false,
        error: "Server error during password reset.",
      }),
    };
  }
};
