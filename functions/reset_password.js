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
    if (event.httpMethod !== "POST") return fail("Method not allowed", 405);

    const { emailOrPhone, code, newPassword } = JSON.parse(event.body || "{}");
    if (!emailOrPhone || !code || !newPassword)
      return fail("Missing required fields ❌");

    // 1️⃣ Lookup reset code (match by code)
    const codeRes = await db.query(
      `SELECT user_id, expires_at
       FROM reset_codes
       WHERE code = $1
       ORDER BY expires_at DESC
       LIMIT 1`,
      [code]
    );

    if (codeRes.rows.length === 0) {
      return fail("Invalid or expired reset code ❌");
    }

    const reset = codeRes.rows[0];
    if (new Date(reset.expires_at) < new Date()) {
      return fail("Reset code expired ❌");
    }

    // 2️⃣ Try to find which table this user belongs to
    let targetTable = null;
    const agentRes = await db.query(
      `SELECT id FROM agents WHERE id = $1 AND email = $2`,
      [reset.user_id, emailOrPhone]
    );

    if (agentRes.rows.length > 0) {
      targetTable = "agents";
    } else {
      const userRes = await db.query(
        `SELECT id FROM users WHERE id = $1 AND email = $2`,
        [reset.user_id, emailOrPhone]
      );
      if (userRes.rows.length > 0) targetTable = "users";
    }

    if (!targetTable) return fail("Account not found ❌");

    // 3️⃣ Hash new password
    const hashed = await bcrypt.hash(newPassword, 10);

    // 4️⃣ Update password in the correct table
    await db.query(
      `UPDATE ${targetTable} SET password_hash = $1 WHERE id = $2`,
      [hashed, reset.user_id]
    );

    // 5️⃣ Invalidate the reset code
    await db.query(`DELETE FROM reset_codes WHERE code = $1`, [code]);

    return ok({ message: "Password reset successful ✅" });
  } catch (err) {
    console.error("❌ Error in reset_password:", err);
    return fail("Server error during password reset ❌", 500);
  }
};
