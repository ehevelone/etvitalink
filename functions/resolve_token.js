// functions/resolve_token.js
const db = require("./services/db");

/**
 * This endpoint resolves a secure onboarding token (from the URL)
 * to the real unlock_code in your Supabase `agents` table.
 * Example call:
 *   /.netlify/functions/resolve_token?token=abcd1234
 */
exports.handler = async (event) => {
  try {
    const token = event.queryStringParameters?.token;
    if (!token) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: false, error: "Missing token" }),
      };
    }

    // 1️⃣ Lookup agent by token
    const result = await db.query(
      `SELECT unlock_code, active
       FROM agents
       WHERE onboard_token = $1
       LIMIT 1`,
      [token]
    );

    // 2️⃣ Validate result
    if (result.rows.length === 0) {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: false, error: "Invalid token" }),
      };
    }

    const agent = result.rows[0];

    // 3️⃣ Return unlock code
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        success: true,
        unlock_code: agent.unlock_code,
        active: agent.active,
      }),
    };
  } catch (err) {
    console.error("❌ Error in resolve_token:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        success: false,
        error: "Server error: " + err.message,
      }),
    };
  }
};
