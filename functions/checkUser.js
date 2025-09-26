// functions/check_user.js
const db = require("./services/db");
const crypto = require("crypto");

function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function ok(obj) {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ success: true, ...obj }),
  };
}

function fail(msg) {
  return {
    statusCode: 400,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ success: false, error: msg }),
  };
}

exports.handler = async (event) => {
  try {
    const { username, password } = JSON.parse(event.body || "{}");

    if (!username || !password) {
      return fail("Username and password required ❌");
    }

    // Look up user in DB
    const result = await db.query(
      "SELECT * FROM users WHERE username=$1",
      [username]
    );

    if (!result.rows.length) {
      return fail("User not found ❌");
    }

    const user = result.rows[0];
    const hashed = hashPassword(password);

    if (user.password_hash !== hashed) {
      return fail("Invalid password ❌");
    }

    // ✅ Success
    return ok({
      message: "User login successful ✅",
      userId: user.id,
      username: user.username,
      role: "user",
    });
  } catch (err) {
    console.error("❌ check_user error:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: false, error: err.message }),
    };
  }
};
