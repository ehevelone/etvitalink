// functions/update_user_profile.js
const db = require("../services/db"); // your existing DB helper

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
      return fail("Only POST allowed", 405);
    }

    const body = JSON.parse(event.body || "{}");
    const {
      currentEmail, // ✅ who we are updating (old email)
      email,        // ✅ possibly new email
      name,
      phone,
      password,     // optional: change password if provided
    } = body;

    if (!currentEmail) {
      return fail("currentEmail is required");
    }

    const updates = [];
    const values = [];
    let idx = 1;

    if (email) {
      updates.push(`email = $${idx++}`);
      values.push(email);
    }
    if (name) {
      updates.push(`name = $${idx++}`);
      values.push(name);
    }
    if (phone) {
      updates.push(`phone = $${idx++}`);
      values.push(phone);
    }
    if (password) {
      // bcrypt via pgcrypto (same idea as you used for agents)
      updates.push(`password = crypt($${idx++}, gen_salt('bf'))`);
      values.push(password);
    }

    if (updates.length === 0) {
      return fail("No fields provided to update");
    }

    // WHERE uses currentEmail, so email can be changed safely
    values.push(currentEmail);

    const query = `
      UPDATE users
      SET ${updates.join(", ")}
      WHERE LOWER(email) = LOWER($${idx})
      RETURNING id, email, name, phone;
    `;

    const result = await db.query(query, values);

    if (!result.rows.length) {
      return fail("User not found", 404);
    }

    return ok({ user: result.rows[0] });
  } catch (e) {
    console.error("❌ update_user_profile error:", e);
    return fail("Server error: " + e.message, 500);
  }
};
