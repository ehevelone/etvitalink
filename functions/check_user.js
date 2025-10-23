// netlify/functions/check_user.js
// 🚀 Fixed: use bcrypt (matches agent side + register_user.js)

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

// ✅ Supabase service client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function reply(success, obj = {}) {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ success, ...obj }),
  };
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
    }

    const { username, password } = JSON.parse(event.body || "{}");

    if (!username || !password) {
      return reply(false, { error: "Username and password required ❌" });
    }

    // ✅ Fetch user from Supabase
    const { data: user, error } = await supabase
      .from("users")
      .select("id, username, password_hash, phone, promo_code")
      .eq("username", username)
      .single();

    if (error || !user) {
      return reply(false, { error: "No user exists, please register first." });
    }

    // ✅ Compare bcrypt hash
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return reply(false, { error: "Invalid password ❌" });
    }

    return reply(true, {
      message: "User login successful ✅",
      userId: user.id,
      username: user.username,
      phone: user.phone,
      promoCode: user.promo_code,
      role: "user",
    });
  } catch (err) {
    console.error("❌ check_user error:", err);
    return reply(false, { error: "Server error: " + err.message });
  }
};
