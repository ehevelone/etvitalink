// functions/request_delete.js
const db = require("./services/db");

function ok(msg) {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ success: true, message: msg }),
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

    const { username, email } = JSON.parse(event.body || "{}");
    if (!username && !email) {
      return fail("Username or email is required ❌");
    }

    // 🔎 Try to delete from users by username
    if (username) {
      const res = await db.query(
        `DELETE FROM users WHERE username = $1 RETURNING id`,
        [username]
      );
      if (res.rowCount > 0) {
        return ok("User account deleted successfully ✅");
      }
    }

    // 🔎 Try to delete from agents by email
    if (email) {
      const res = await db.query(
        `DELETE FROM agents WHERE email = $1 RETURNING id`,
        [email]
      );
      if (res.rowCount > 0) {
        return ok("Agent account deleted successfully ✅");
      }
    }

    return fail("No matching account found ❌", 404);
  } catch (err) {
    console.error("❌ Error in request_delete:", err);
    return fail("Server error during account deletion ❌", 500);
  }
};
