// functions/get_agent_profile.js
const db = require("../services/db"); // your pg client wrapper

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

    const { email, id } = JSON.parse(event.body || "{}");
    if (!email && !id) {
      return fail("Missing email or id");
    }

    // 🔹 Prefer email, fallback to id
    let query = "SELECT id, name, email, npn, phone, agency_name, agency_address, unlock_code, promo_code, active FROM agents WHERE ";
    let values = [];

    if (email) {
      query += "email = $1";
      values = [email.toLowerCase()];
    } else {
      query += "id = $1";
      values = [id];
    }

    const result = await db.query(query, values);
    if (!result.rows.length) {
      return fail("Agent not found", 404);
    }

    return ok({ agent: result.rows[0] });
  } catch (e) {
    console.error("❌ get_agent_profile error:", e);
    return fail("Server error: " + e.message, 500);
  }
};
