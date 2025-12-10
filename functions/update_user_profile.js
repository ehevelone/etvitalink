// functions/update_user_profile.js
const db = require("./services/db");
const bcrypt = require("bcryptjs");

function reply(statusCode, obj) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
    body: JSON.stringify(obj),
  };
}

exports.handler = async (event) => {
  try {
    // ✅ CORS preflight
    if (event.httpMethod === "OPTIONS") {
      return reply(200, {});
    }

    // ✅ Enforce POST
    if (event.httpMethod === "OPTIONS") {
  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
    body: "",
  };
}

if (event.httpMethod !== "POST") {
      return reply(405, {
        success: false,
        error: "Method Not Allowed",
      });
    }

    // ✅ Safe body parsing
    let body = {};
    try {
      if (event.isBase64Encoded) {
        body = JSON.parse(
          Buffer.from(event.body, "base64").toString("utf8")
        );
      } else {
        body = JSON.parse(event.body || "{}");
      }
    } catch (e) {
      return reply(400, {
        success: false,
        error: "Invalid request body",
      });
    }

    const {
      currentEmail, // ✅ existing email
      email,        // ✅ optional new email
      name,
      phone,
      password,
    } = body;

    if (!currentEmail) {
      return reply(400, {
        success: false,
        error: "currentEmail is required",
      });
    }

    // ✅ Build dynamic update
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
      const hashed = await bcrypt.hash(password, 10);
      updates.push(`password_hash = $${idx++}`);
      values.push(hashed);
    }

    if (!updates.length) {
      return reply(400, {
        success: false,
        error: "No fields provided to update",
      });
    }

    values.push(currentEmail.trim());

    const query = `
      UPDATE users
      SET ${updates.join(", ")}
      WHERE LOWER(email) = LOWER($${idx})
      RETURNING id, email, name, phone;
    `;

    const result = await db.query(query, values);

    if (!result.rows.length) {
      return reply(404, {
        success: false,
        error: "User not found",
      });
    }

    return reply(200, {
      success: true,
      message: "User profile updated ✅",
      user: result.rows[0],
    });

  } catch (err) {
    console.error("❌ update_user_profile error:", err);
    return reply(500, {
      success: false,
      error: "Server error while updating user ❌",
    });
  }
};
