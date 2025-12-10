// functions/update_agent_profile.js
const db = require("./services/db"); // ✅ your existing DB connection helper

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
      email,
      name,
      phone,
      npn,
      agencyName,
      agencyAddress,
      password, // ✅ allow password change if provided
    } = body;

    if (!email) {
      return fail("Email is required");
    }

    // ✅ Build dynamic query for only provided fields
    const updates = [];
    const values = [];
    let idx = 1;

    if (name) {
      updates.push(`name = $${idx++}`);
      values.push(name);
    }
    if (phone) {
      updates.push(`phone = $${idx++}`);
      values.push(phone);
    }
    if (npn) {
      updates.push(`npn = $${idx++}`);
      values.push(npn);
    }
    if (agencyName) {
      updates.push(`agency_name = $${idx++}`);
      values.push(agencyName);
    }
    if (agencyAddress) {
      updates.push(`agency_address = $${idx++}`);
      values.push(agencyAddress);
    }
    if (password) {
      updates.push(`password = crypt($${idx++}, gen_salt('bf'))`);
      values.push(password);
    }

    if (updates.length === 0) {
      return fail("No fields provided to update");
    }

    values.push(email);

    const query = `
      UPDATE agents
      SET ${updates.join(", ")}
      WHERE email = $${idx}
      RETURNING id, email, name, phone, npn, agency_name, agency_address;
    `;

    const result = await db.query(query, values);

    if (!result.rows.length) {
      return fail("Agent not found", 404);
    }

    return ok({ agent: result.rows[0] });
  } catch (e) {
    console.error("❌ update_agent_profile error:", e);
    return fail("Server error: " + e.message, 500);
  }
};
