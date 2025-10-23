// functions/check_user.js
const db = require("../services/db");
const bcrypt = require("bcryptjs");

function reply(success, obj = {}) {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ success, ...obj }),
  };
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
    }

    const { username, password } = JSON.parse(event.body || "{}");

    if (!username || !password) {
      return reply(false, { error: "Username and password required ❌" });
    }

    // ✅ Look up user
    const result = await db.query("SELECT * FROM users WHERE username=$1", [username]);

    if (!result.rows.length) {
      return reply(false, { error: "No user exists, please register first." });
    }

    const user = result.rows[0];

    // ✅ Compare with bcrypt
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
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
