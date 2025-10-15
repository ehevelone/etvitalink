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
    if (!emailOrPhone || !code || !newPassword) {
      return fail("Missing required fields ❌");
    }

    // Try agents first
    let user, table;
    const agentRes = await db.query(
      `SELECT id, email, reset_code, reset_expires FROM agents WHERE email = $1`,
      [emailOrPhone]
    );
    if (agentRes.rows.length > 0) {
      user = agentRes.rows[0];
      table = "agents";
    } else {
      const userRes = await db.query(
        `SELECT id, email, reset_code, reset_expires FROM users WHERE email = $1`,
        [emailOrPhone]
      );
      if (userRes.rows.length > 0) {
        user = userRes.rows[0];
        table = "users";
      }
    }

    if (!user) return fail("No account found for this email ❌", 404);

    // Verify code + expiration
    if (user.reset_code !== code) {
      return fail("Invalid reset code ❌");
    }
    if (!user.reset_expires || new Date(user.reset_expires) < new Date()) {
      return fail("Reset code expired ❌");
    }

    // Hash the new password
    const hashed = await bcrypt.hash(newPassword, 10);

    // Update password + clear reset code
    await db.query(
      `UPDATE ${table} 
         SET password_hash = $1, reset_code = NULL, reset_expires = NULL 
       WHERE id = $2`,
      [hashed, user.id]
    );

    return ok({ message: "Password reset successful ✅" });
  } catch (err) {
    console.error("❌ Error in reset_password:", err);
    return fail("Server error during password reset ❌", 500);
  }
};
