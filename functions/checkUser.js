// functions/checkUser.js
const db = require("./services/db"); // ✅ fixed path
const crypto = require("crypto");

function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

exports.handler = async (event) => {
  try {
    const { username, password } = JSON.parse(event.body);

    if (!username || !password) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Username and password required" }),
      };
    }

    // Look up user
    const result = await db.query(
      "SELECT * FROM users WHERE username=$1",
      [username]
    );

    if (!result.rows.length) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "User not found" }),
      };
    }

    const user = result.rows[0];
    const hashed = hashPassword(password);

    if (user.password_hash !== hashed) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Invalid password" }),
      };
    }

    // ✅ Success
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        username: user.username,
        unlocked: user.unlocked,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
