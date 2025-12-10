// functions/get_agent_promo.js
const db = require("./services/db");

function reply(statusCode, obj) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
    },
    body: JSON.stringify(obj),
  };
}

exports.handler = async (event) => {
  try {
    // ✅ Handle CORS preflight
    if (event.httpMethod === "OPTIONS") {
      return reply(200, {});
    }

    // ✅ Enforce POST
    if (event.httpMethod !== "POST") {
      return reply(405, {
        success: false,
        error: "Method Not Allowed",
      });
    }

    // ✅ Safe body parsing (Flutter + Netlify)
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

    const { email } = body;

    if (!email) {
      return reply(400, {
        success: false,
        error: "Email required",
      });
    }

    // ✅ Lookup agent (case-insensitive)
    const result = await db.query(
      `
      SELECT id, name, email, promo_code, active
      FROM agents
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1
      `,
      [email.trim()]
    );

    if (!result.rows.length) {
      return reply(404, {
        success: false,
        error: "No agent found with that email",
      });
    }

    const agent = result.rows[0];

    if (!agent.promo_code || agent.promo_code.trim() === "") {
      return reply(400, {
        success: false,
        error: "Agent has no promo code assigned",
      });
    }

    // ✅ EXACT response shape Flutter expects
    return reply(200, {
      success: true,
      promoCode: agent.promo_code,
      active: agent.active ?? false,
      agent: {
        id: agent.id,
        name: agent.name,
        email: agent.email,
      },
    });

  } catch (err) {
    console.error("❌ get_agent_promo error:", err);
    return reply(500, {
      success: false,
      error: "Server error while fetching promo code ❌",
    });
  }
};
