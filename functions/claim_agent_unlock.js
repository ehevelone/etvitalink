// functions/claim_agent_unlock.js
const db = require("../services/db");
const bcrypt = require("bcryptjs");

// ✅ Helpers
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

// ✅ Main handler
exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") return fail("Method not allowed", 405);

    const { unlockCode, email, password, npn, phone, name } = JSON.parse(event.body || "{}");

    if (!unlockCode || !email || !password || !npn) {
      return fail("Unlock code, email, password, and NPN are required.");
    }

    console.log("🔹 Incoming registration for unlockCode:", unlockCode);

    // 1️⃣ Validate unlock code in agents table
    const existing = await db.query(
      `SELECT id, active FROM agents WHERE unlock_code = $1`,
      [unlockCode]
    );

    if (existing.rows.length === 0) {
      console.warn("❌ Invalid unlock code:", unlockCode);
      return fail("Invalid unlock code ❌", 404);
    }

    const agent = existing.rows[0];
    if (agent.active) {
      console.warn("⚠️ Unlock code already used:", unlockCode);
      return fail("Unlock code already used ❌");
    }

    // 2️⃣ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3️⃣ Activate and update agent info
    const result = await db.query(
      `UPDATE agents
         SET email = $1,
             password_hash = $2,
             npn = $3,
             phone = $4,
             name = $5,
             active = TRUE
       WHERE id = $6
       RETURNING id, email, npn, phone, name, role, active`,
      [email, hashedPassword, npn, phone || null, name || null, agent.id]
    );

    if (result.rows.length === 0) {
      throw new Error("Agent update failed — no record found.");
    }

    const row = result.rows[0];
    console.log("✅ Agent updated:", row.id, row.email);

    // 4️⃣ Link unlock code to this agent in promo_codes
    const updateUnlock = await db.query(
      `UPDATE promo_codes
         SET agent_id = $1,
             redeemed = TRUE,
             used_count = used_count + 1
       WHERE code = $2
       RETURNING id`,
      [row.id, unlockCode]
    );

    if (updateUnlock.rowCount === 0) {
      console.warn("⚠️ No promo_codes row matched unlockCode:", unlockCode);
    } else {
      console.log("✅ Unlock code linked to agent:", unlockCode, "→", row.id);
    }

    // 5️⃣ Generate permanent promo code (for client sharing)
    const promoCode = "AG-" + Math.random().toString(36).substring(2, 10).toUpperCase();

    // 6️⃣ Insert permanent promo code into promo_codes table
    await db.query(
      `INSERT INTO promo_codes (code, agent_id, used_count, active, redeemed)
       VALUES ($1, $2, 0, TRUE, FALSE)`,
      [promoCode, row.id]
    );

    console.log("✅ New permanent promo generated:", promoCode, "for agent:", row.id);

    // 7️⃣ Return result to Flutter
    return ok({
      message: "Agent registration completed ✅",
      agentId: row.id,
      name: row.name || "",
      email: row.email,
      phone: row.phone || "",
      npn: row.npn,
      role: row.role || "agent",
      active: row.active,
      promoCode,
    });
  } catch (err) {
    console.error("❌ Error in claim_agent_unlock:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        success: false,
        error: "Server error while claiming agent unlock.",
        details: err.message,
      }),
    };
  }
};
