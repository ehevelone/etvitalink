// functions/check_user.js
// 🚀 Force redeploy trigger 2025-10-16

const db = require("../services/db");
const crypto = require("crypto");

function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function reply(success, obj = {}) {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ success, ...obj }),
  };
}

exports.handler = async (event) => {
  try {
    const { username, password } = JSON.parse(event.body || "{}");

    if (!username || !password) {
      return reply(false, { error: "Username and password required ❌" });
    }

    const result = await db.query("SELECT * FROM users WHERE username=$1", [username]);

    if (!result.rows.length) {
      return reply(false, { error: "No user exists, please register first." });
    }

    const user = result.rows[0];
    const hashed = hashPassword(password);

    if (user.password_hash !== hashed) {
      return reply(false, { error: "Invalid password ❌" });
    }

    return reply(true, {
      message: "User login successful ✅",
      userId: user.id,
      username: user.username,
      role: "user",
    });
  } catch (err) {
    console.error("❌ check_user error:", err);
    return reply(false, { error: "Server error: " + err.message });
  }
};
